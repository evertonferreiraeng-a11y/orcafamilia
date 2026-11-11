'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCasa } from '@/components/casa/CasaContext';
import { Campo } from '@/components/estoque/ui';
import { fmtData, fmtMoeda, hojeISO, paraInput, parseNumero, r2 } from '@/lib/estoque/calc';
import { UNIDADES_FREQ, categoriasUsadas, comodosUsados, nomeTarefa, somarPeriodo, textoFrequencia } from '@/lib/casa/calc';
import type { UnidadeFrequencia } from '@/types/database';

function Erro({ texto }: { texto: string }) {
  return texto ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-negative">{texto}</p> : null;
}
function Rodape({ onCancelar, salvando, rotulo = 'Salvar' }: { onCancelar: () => void; salvando: boolean; rotulo?: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
      <button type="button" className="btn-secondary" onClick={onCancelar}>
        Cancelar
      </button>
      <button type="submit" className="btn-primary" disabled={salvando}>
        {salvando ? 'Salvando…' : rotulo}
      </button>
    </div>
  );
}
function lerValor(texto: string, rotulo: string, opts: { obrigatorio?: boolean; inteiro?: boolean; maiorQueZero?: boolean } = {}): number | null {
  if (!texto.trim()) {
    if (opts.obrigatorio) throw new Error(`Informe ${rotulo}.`);
    return null;
  }
  const v = parseNumero(texto);
  if (Number.isNaN(v) || v < 0) throw new Error(`${rotulo.charAt(0).toUpperCase() + rotulo.slice(1)}: valor inválido.`);
  if (opts.maiorQueZero && v <= 0) throw new Error(`${rotulo.charAt(0).toUpperCase() + rotulo.slice(1)} deve ser maior que zero.`);
  if (opts.inteiro && !Number.isInteger(v)) throw new Error(`${rotulo.charAt(0).toUpperCase() + rotulo.slice(1)} deve ser um número inteiro.`);
  return v;
}

/* ---------- MANUTENÇÃO (tarefa recorrente) ---------- */
function TarefaModal({ id, itemIdInicial }: { id?: string; itemIdInicial?: string }) {
  const { dados, fechar, gravar, avisar } = useCasa();
  const t = id ? dados.tarefas.find((x) => x.id === id) : undefined;
  const [titulo, setTitulo] = useState(t?.titulo ?? '');
  const [itemId, setItemId] = useState(t?.item_id ?? itemIdInicial ?? '');
  const [categoria, setCategoria] = useState(t?.categoria ?? (itemIdInicial ? dados.itens.find((i) => i.id === itemIdInicial)?.categoria : '') ?? '');
  const [freqValor, setFreqValor] = useState(String(t?.freq_valor ?? 6));
  const [freqUnidade, setFreqUnidade] = useState<UnidadeFrequencia>(t?.freq_unidade ?? 'meses');
  const [ultima, setUltima] = useState(t?.ultima_execucao ?? '');
  const [proxima, setProxima] = useState(t?.proxima_data ?? '');
  const [proximaManual, setProximaManual] = useState(!!t?.proxima_data && !!t?.ultima_execucao && t.proxima_data !== somarPeriodo(t.ultima_execucao, t.freq_valor, t.freq_unidade));
  const [aviso, setAviso] = useState(String(t?.aviso_dias ?? dados.config.aviso_padrao ?? 15));
  const [custo, setCusto] = useState(t ? paraInput(t.custo_estimado) : '');
  const [prestadorId, setPrestadorId] = useState(t?.prestador_id ?? '');
  const [instrucoes, setInstrucoes] = useState(t?.instrucoes ?? '');
  const [ativa, setAtiva] = useState(t?.ativa ?? true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const fv = parseNumero(freqValor);
  const proximaCalculada = ultima && fv > 0 && Number.isInteger(fv) ? somarPeriodo(ultima, fv, freqUnidade) : '';
  const proximaFinal = proximaManual ? proxima : proximaCalculada || proxima;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      const nome = titulo.trim();
      if (!nome) throw new Error('Informe o nome da manutenção.');
      const valor = lerValor(freqValor, 'a frequência', { obrigatorio: true, inteiro: true, maiorQueZero: true })!;
      const avisoDias = lerValor(aviso, 'o aviso antecipado', { obrigatorio: true, inteiro: true })!;
      const custoEst = lerValor(custo, 'o custo estimado') ?? 0;
      if (ultima && ultima > hojeISO()) throw new Error('A última vez feita não pode ser uma data futura.');
      if (ultima && proximaFinal && proximaFinal <= ultima) throw new Error('A próxima data deve ser depois da última vez feita.');
      const cat = itemId ? dados.itens.find((i) => i.id === itemId)?.categoria || categoria : categoria;
      const valores = {
        titulo: nome,
        item_id: itemId || null,
        categoria: (cat || 'Outros').trim(),
        freq_valor: valor,
        freq_unidade: freqUnidade,
        ultima_execucao: ultima || null,
        proxima_data: proximaFinal || null,
        aviso_dias: avisoDias,
        custo_estimado: r2(custoEst),
        prestador_id: prestadorId || null,
        instrucoes: instrucoes.trim() || null,
        ativa,
      };
      setSalvando(true);
      if (id) await gravar('casa_tarefas', 'update', valores, id);
      else await gravar('casa_tarefas', 'insert', valores);
      avisar(id ? 'Manutenção atualizada.' : 'Manutenção cadastrada.');
      fechar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={fechar} title={id ? 'Editar manutenção' : 'Nova manutenção'} wide>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="O que precisa ser feito" obrigatorio className="sm:col-span-2">
            <input className="input-field" value={titulo} maxLength={100} onChange={(e) => setTitulo(e.target.value)} placeholder="ex.: Trocar o refil do filtro de água" />
          </Campo>
          <Campo rotulo="Item / equipamento" dica="Opcional. Ex.: o ar-condicionado do quarto">
            <select className="input-field" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">— Geral da casa —</option>
              {dados.itens.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                  {i.comodo ? ` (${i.comodo})` : ''}
                </option>
              ))}
            </select>
          </Campo>
          {!itemId && (
            <Campo rotulo="Categoria">
              <input className="input-field" list="casa-categorias" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
              <datalist id="casa-categorias">
                {categoriasUsadas(dados).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Campo>
          )}
          <Campo rotulo="Frequência" obrigatorio dica={fv > 0 && Number.isInteger(fv) ? textoFrequencia(fv, freqUnidade) : undefined}>
            <div className="flex gap-2">
              <span className="self-center text-sm text-gray-500">a cada</span>
              <input className="input-field !w-20" inputMode="numeric" value={freqValor} onChange={(e) => setFreqValor(e.target.value)} />
              <select className="input-field" value={freqUnidade} onChange={(e) => setFreqUnidade(e.target.value as UnidadeFrequencia)}>
                {(Object.keys(UNIDADES_FREQ) as UnidadeFrequencia[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIDADES_FREQ[u].plural}
                  </option>
                ))}
              </select>
            </div>
          </Campo>
          <Campo rotulo="Avisar com antecedência (dias)" dica="A manutenção fica “vence em breve” a partir daí">
            <input className="input-field" inputMode="numeric" value={aviso} onChange={(e) => setAviso(e.target.value)} />
          </Campo>
          <Campo rotulo="Última vez feita" dica="Se não souber, deixe em branco e informe só a próxima data">
            <input type="date" className="input-field" value={ultima} max={hojeISO()} onChange={(e) => setUltima(e.target.value)} />
          </Campo>
          <Campo rotulo="Próxima data" dica={!proximaManual && proximaCalculada ? 'Calculada pela frequência' : undefined}>
            <input
              type="date"
              className="input-field"
              value={proximaFinal}
              onChange={(e) => {
                setProxima(e.target.value);
                setProximaManual(true);
              }}
            />
            {proximaManual && proximaCalculada && (
              <button type="button" className="mt-1 text-[11px] font-semibold text-brand-600" onClick={() => setProximaManual(false)}>
                Usar a data calculada ({fmtData(proximaCalculada)})
              </button>
            )}
          </Campo>
          <Campo rotulo="Custo estimado (R$)">
            <input className="input-field" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} />
          </Campo>
          <Campo rotulo="Prestador habitual">
            <select className="input-field" value={prestadorId} onChange={(e) => setPrestadorId(e.target.value)}>
              <option value="">— Nenhum / faço eu mesmo —</option>
              {dados.prestadores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                  {p.servico ? ` · ${p.servico}` : ''}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Instruções / observações" className="sm:col-span-2">
            <textarea className="input-field min-h-[60px]" value={instrucoes} maxLength={500} onChange={(e) => setInstrucoes(e.target.value)} placeholder="ex.: refil modelo XYZ, comprar na loja tal" />
          </Campo>
          <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-500" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
            Manutenção ativa (desmarque para pausar os alertas)
          </label>
        </div>
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} />
      </form>
    </Modal>
  );
}

/* ---------- REGISTRAR QUE FOI FEITO ---------- */
function FeitoModal({ tarefaId }: { tarefaId: string }) {
  const { dados, fechar, rpc, avisar } = useCasa();
  const t = dados.tarefas.find((x) => x.id === tarefaId);
  const [data, setData] = useState(hojeISO());
  const [custo, setCusto] = useState(t && t.custo_estimado > 0 ? paraInput(t.custo_estimado) : '');
  const [prestadorId, setPrestadorId] = useState(t?.prestador_id ?? '');
  const [obs, setObs] = useState('');
  const [proximaManual, setProximaManual] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  if (!t) return null;
  const calculada = data ? somarPeriodo(data, t.freq_valor, t.freq_unidade) : '';
  const retroativo = !!(t.ultima_execucao && data && data < t.ultima_execucao);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      if (!data) throw new Error('Informe a data em que foi feito.');
      if (data > hojeISO()) throw new Error('A data não pode ser futura.');
      const c = lerValor(custo, 'o custo') ?? 0;
      if (proximaManual && proximaManual <= data) throw new Error('A próxima data deve ser depois da data em que foi feito.');
      setSalvando(true);
      await rpc('casa_registrar_execucao', {
        p_tarefa: t!.id,
        p_data: data,
        p_custo: r2(c),
        p_prestador: prestadorId || null,
        p_obs: obs.trim() || null,
        p_proxima: proximaManual || null,
      });
      avisar(retroativo ? 'Registro adicionado ao histórico.' : `Registrado! Próxima: ${fmtData(proximaManual || calculada)}.`);
      fechar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={fechar} title="Registrar manutenção feita">
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
          <p className="font-semibold text-gray-900">{nomeTarefa(dados, t)}</p>
          <p className="text-gray-500">
            {textoFrequencia(t.freq_valor, t.freq_unidade)} · última: {fmtData(t.ultima_execucao)} · prevista: {fmtData(t.proxima_data)}
          </p>
          {t.instrucoes && <p className="mt-1 text-xs text-gray-500">{t.instrucoes}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Feito em" obrigatorio>
            <input type="date" className="input-field" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo rotulo="Custo (R$)">
            <input className="input-field" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" />
          </Campo>
          <Campo rotulo="Quem fez">
            <select className="input-field" value={prestadorId} onChange={(e) => setPrestadorId(e.target.value)}>
              <option value="">Nós mesmos</option>
              {dados.prestadores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Próxima data" dica={proximaManual ? 'Data escolhida manualmente' : `Calculada: ${fmtData(calculada)}`}>
            <input type="date" className="input-field" value={proximaManual || calculada} onChange={(e) => setProximaManual(e.target.value === calculada ? '' : e.target.value)} />
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2">
            <textarea className="input-field min-h-[60px]" value={obs} maxLength={300} onChange={(e) => setObs(e.target.value)} placeholder="ex.: troquei o refil e a vedação" />
          </Campo>
        </div>
        {retroativo && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Essa data é anterior à última vez registrada ({fmtData(t.ultima_execucao)}): entra só no histórico e não muda a próxima data.
          </p>
        )}
        {custo && !Number.isNaN(parseNumero(custo)) && parseNumero(custo) > 0 && <p className="text-xs text-gray-400">Custo registrado: {fmtMoeda(parseNumero(custo))}</p>}
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} rotulo="Registrar" />
      </form>
    </Modal>
  );
}

/* ---------- ITEM / EQUIPAMENTO ---------- */
function ItemModal({ id }: { id?: string }) {
  const { dados, fechar, gravar, avisar } = useCasa();
  const i = id ? dados.itens.find((x) => x.id === id) : undefined;
  const [nome, setNome] = useState(i?.nome ?? '');
  const [categoria, setCategoria] = useState(i?.categoria ?? '');
  const [comodo, setComodo] = useState(i?.comodo ?? '');
  const [marca, setMarca] = useState(i?.marca ?? '');
  const [modelo, setModelo] = useState(i?.modelo ?? '');
  const [instalacao, setInstalacao] = useState(i?.data_instalacao ?? '');
  const [garantia, setGarantia] = useState(i?.garantia_ate ?? '');
  const [valor, setValor] = useState(i ? paraInput(i.valor) : '');
  const [obs, setObs] = useState(i?.obs ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      if (!nome.trim()) throw new Error('Informe o nome do item.');
      if (instalacao && garantia && garantia < instalacao) throw new Error('A garantia não pode terminar antes da instalação/compra.');
      const v = lerValor(valor, 'o valor') ?? 0;
      const valores = {
        nome: nome.trim(),
        categoria: categoria.trim() || 'Outros',
        comodo: comodo.trim() || null,
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        data_instalacao: instalacao || null,
        garantia_ate: garantia || null,
        valor: r2(v),
        obs: obs.trim() || null,
      };
      setSalvando(true);
      if (id) await gravar('casa_itens', 'update', valores, id);
      else await gravar('casa_itens', 'insert', valores);
      avisar(id ? 'Equipamento atualizado.' : 'Equipamento cadastrado.');
      fechar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={fechar} title={id ? 'Editar equipamento' : 'Novo equipamento'} wide>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Nome" obrigatorio className="sm:col-span-2">
            <input className="input-field" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Ar-condicionado do quarto do bebê" />
          </Campo>
          <Campo rotulo="Categoria">
            <input className="input-field" list="casa-categorias-item" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
            <datalist id="casa-categorias-item">
              {categoriasUsadas(dados).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Cômodo / local">
            <input className="input-field" list="casa-comodos" value={comodo} onChange={(e) => setComodo(e.target.value)} />
            <datalist id="casa-comodos">
              {comodosUsados(dados).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Marca">
            <input className="input-field" value={marca} maxLength={60} onChange={(e) => setMarca(e.target.value)} />
          </Campo>
          <Campo rotulo="Modelo">
            <input className="input-field" value={modelo} maxLength={60} onChange={(e) => setModelo(e.target.value)} />
          </Campo>
          <Campo rotulo="Instalação / compra">
            <input type="date" className="input-field" value={instalacao} onChange={(e) => setInstalacao(e.target.value)} />
          </Campo>
          <Campo rotulo="Garantia até">
            <input type="date" className="input-field" value={garantia} onChange={(e) => setGarantia(e.target.value)} />
          </Campo>
          <Campo rotulo="Valor pago (R$)">
            <input className="input-field" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2">
            <textarea className="input-field min-h-[60px]" value={obs} maxLength={500} onChange={(e) => setObs(e.target.value)} placeholder="ex.: nota fiscal na pasta azul; BTUs; número de série" />
          </Campo>
        </div>
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} />
      </form>
    </Modal>
  );
}

/* ---------- PRESTADOR ---------- */
function PrestadorModal({ id }: { id?: string }) {
  const { dados, fechar, gravar, avisar } = useCasa();
  const p = id ? dados.prestadores.find((x) => x.id === id) : undefined;
  const [nome, setNome] = useState(p?.nome ?? '');
  const [servico, setServico] = useState(p?.servico ?? '');
  const [telefone, setTelefone] = useState(p?.telefone ?? '');
  const [email, setEmail] = useState(p?.email ?? '');
  const [obs, setObs] = useState(p?.obs ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      const n = nome.trim();
      if (!n) throw new Error('Informe o nome.');
      if (dados.prestadores.some((x) => x.id !== id && x.nome.toLowerCase() === n.toLowerCase())) throw new Error('Já existe um prestador com esse nome.');
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('E-mail inválido.');
      const valores = { nome: n, servico: servico.trim() || null, telefone: telefone.trim() || null, email: email.trim() || null, obs: obs.trim() || null };
      setSalvando(true);
      if (id) await gravar('casa_prestadores', 'update', valores, id);
      else await gravar('casa_prestadores', 'insert', valores);
      avisar(id ? 'Prestador atualizado.' : 'Prestador cadastrado.');
      fechar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={fechar} title={id ? 'Editar prestador' : 'Novo prestador de serviço'}>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Nome" obrigatorio className="sm:col-span-2">
            <input className="input-field" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Serviço" className="sm:col-span-2">
            <input className="input-field" value={servico} maxLength={80} onChange={(e) => setServico(e.target.value)} placeholder="ex.: Ar-condicionado, encanador, dedetização" />
          </Campo>
          <Campo rotulo="Telefone / WhatsApp">
            <input className="input-field" inputMode="tel" value={telefone} maxLength={30} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-0000" />
          </Campo>
          <Campo rotulo="E-mail">
            <input className="input-field" inputMode="email" value={email} maxLength={100} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo rotulo="Observações" className="sm:col-span-2">
            <textarea className="input-field min-h-[60px]" value={obs} maxLength={500} onChange={(e) => setObs(e.target.value)} />
          </Campo>
        </div>
        <Erro texto={erro} />
        <Rodape onCancelar={fechar} salvando={salvando} />
      </form>
    </Modal>
  );
}

export function ModaisCasa() {
  const { modal } = useCasa();
  if (!modal) return null;
  switch (modal.tipo) {
    case 'tarefa':
      return <TarefaModal key={`t-${modal.id}-${modal.itemId}`} id={modal.id} itemIdInicial={modal.itemId} />;
    case 'feito':
      return <FeitoModal key={`f-${modal.tarefaId}`} tarefaId={modal.tarefaId} />;
    case 'item':
      return <ItemModal key={`i-${modal.id}`} id={modal.id} />;
    case 'prestador':
      return <PrestadorModal key={`p-${modal.id}`} id={modal.id} />;
  }
}
