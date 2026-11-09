'use client';

import { useRef, useState } from 'react';
import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { Aviso, Campo, Secao, TD, TDN, TH, THN, Tabela, Vazio } from '@/components/estoque/ui';
import { IconBaixar, IconEnviar, IconImprimir, IconPlanilha } from '@/components/icons';
import { RELATORIOS, gerarRelatorio, hojeISO, paraInput, parseNumero, r2, soma, type TipoRelatorio } from '@/lib/estoque/calc';
import { baixarArquivo, formatarCelula, imprimirHtml, nomeArquivo, relatorioCsv, relatorioXlsx, tabelaHtml } from '@/lib/estoque/exportar';

/* ---------- RELATÓRIOS ---------- */
export function RelatoriosEstoque() {
  const { dados } = useEstoque();
  const [tipo, setTipo] = useState<TipoRelatorio>('inventario');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const r = gerarRelatorio(dados, tipo, { de, ate, mes });
  const titulo = RELATORIOS[tipo];
  const comPeriodo = tipo === 'compras' || tipo === 'consumo' || tipo === 'investimento';
  const totais = r.totais ?? [];

  return (
    <div>
      <CabecalhoEstoque titulo="Relatórios" descricao="Exportação para Excel, CSV e PDF" />
      <Secao className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <Campo rotulo="Relatório" className="min-w-[260px]">
            <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRelatorio)}>
              {(Object.keys(RELATORIOS) as TipoRelatorio[]).map((k) => (
                <option key={k} value={k}>
                  {RELATORIOS[k]}
                </option>
              ))}
            </select>
          </Campo>
          {comPeriodo && (
            <>
              <Campo rotulo="De">
                <input type="date" className="input-field" value={de} onChange={(e) => setDe(e.target.value)} />
              </Campo>
              <Campo rotulo="Até">
                <input type="date" className="input-field" value={ate} onChange={(e) => setAte(e.target.value)} />
              </Campo>
            </>
          )}
          {tipo === 'mensal' && (
            <Campo rotulo="Mês">
              <input type="month" className="input-field" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
            </Campo>
          )}
          <div className="flex-1" />
          <button type="button" className="btn-secondary" onClick={() => baixarArquivo(`${nomeArquivo(titulo)}.xlsx`, relatorioXlsx(titulo, r))}>
            <IconPlanilha className="h-4 w-4" /> Excel (.xlsx)
          </button>
          <button type="button" className="btn-secondary" onClick={() => baixarArquivo(`${nomeArquivo(titulo)}.csv`, relatorioCsv(r))}>
            CSV
          </button>
          <button type="button" className="btn-primary" onClick={() => imprimirHtml(titulo, r.sub ?? '', tabelaHtml(r))}>
            <IconImprimir className="h-4 w-4" /> PDF / Imprimir
          </button>
        </div>
      </Secao>
      <Secao titulo={titulo} extra={<span className="text-xs text-gray-400">{`${r.linhas.length} registro(s)${r.sub ?? ''}`}</span>} semPadding>
        {r.linhas.length ? (
          <Tabela minW={Math.max(600, r.colunas.length * 105)}>
            <thead>
              <tr>
                {r.colunas.map((c) => (
                  <th key={c.chave} className={c.tipo ? THN : TH}>
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.linhas.map((l, i) => (
                <tr key={i}>
                  {r.colunas.map((c) => (
                    <td key={c.chave} className={c.tipo ? TDN : TD}>
                      {formatarCelula(l[c.chave], c.tipo)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totais.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  {r.colunas.map((c, i) => (
                    <td key={c.chave} className={c.tipo ? TDN : TD}>
                      {i === 0 ? `Total (${r.linhas.length})` : totais.includes(c.chave) ? formatarCelula(r2(soma(r.linhas, (z) => Number(z[c.chave]) || 0)), c.tipo) : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </Tabela>
        ) : (
          <Vazio>Nenhum registro para este relatório.</Vazio>
        )}
      </Secao>
      <p className="mt-3 text-xs text-gray-400">Para PDF, escolha “Salvar como PDF” como impressora na janela de impressão.</p>
    </div>
  );
}

/* ---------- CONFIGURAÇÕES ---------- */
export function ConfigEstoque() {
  const { dados, gravar, rpc, confirmar, avisar } = useEstoque();
  const c = dados.config;
  const [orcMin, setOrcMin] = useState(paraInput(c.orc_min));
  const [orcMax, setOrcMax] = useState(paraInput(c.orc_max));
  const [composicao, setComposicao] = useState(c.composicao ?? '');
  const [salvando, setSalvando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const mn = parseNumero(orcMin);
    const mx = parseNumero(orcMax);
    if (Number.isNaN(mn) || mn < 0) return avisar('Orçamento mínimo inválido.', true);
    if (Number.isNaN(mx) || mx <= 0) return avisar('Orçamento máximo inválido.', true);
    if (mn > mx) return avisar('O mínimo não pode ser maior que o máximo.', true);
    setSalvando(true);
    try {
      await gravar('estoque_config', 'update', { orc_min: r2(mn), orc_max: r2(mx), composicao: composicao.trim() || null, atualizado_em: new Date().toISOString() }, { coluna: 'familia_id', valor: c.familia_id });
      avisar('Configurações salvas.');
    } catch (err) {
      avisar((err as Error).message, true);
    } finally {
      setSalvando(false);
    }
  }

  function exportar() {
    const conteudo = { app: 'GEF180', versao: 2, origem: 'orcafamilia', exportado: new Date().toISOString(), dados };
    baixarArquivo(`backup-estoque-familiar-${hojeISO()}.json`, new Blob([JSON.stringify(conteudo, null, 1)], { type: 'application/json' }));
  }

  async function importar(f: File) {
    try {
      const json = JSON.parse(await f.text());
      const d = json.dados ?? json;
      if (json.origem === 'orcafamilia') throw new Error('Este arquivo é uma exportação deste próprio app; a importação aceita o backup da versão offline (arquivo HTML).');
      if (!(d && Array.isArray(d.produtos) && Array.isArray(d.lotes) && Array.isArray(d.movs))) throw new Error('Arquivo não reconhecido como backup do estoque.');
      const ok = await confirmar({
        titulo: 'Importar backup da versão offline',
        perigo: true,
        ok: 'Importar e substituir',
        mensagem: (
          <>
            Backup de <b>{json.exportado ? new Date(json.exportado).toLocaleString('pt-BR') : 'data desconhecida'}</b> com {d.produtos.length} produtos, {d.lotes.length} lotes e{' '}
            {d.movs.length} movimentações.
            <p className="mt-2 font-semibold text-negative">Os dados de estoque atuais da família serão substituídos.</p>
          </>
        ),
      });
      if (!ok) return;
      const res = await rpc<{ produtos: number; lotes: number; movs: number }>('estoque_importar_backup', { p_dados: json });
      avisar(`Importados: ${res.produtos} produtos, ${res.lotes} lotes e ${res.movs} movimentações.`);
    } catch (err) {
      avisar(`Não foi possível importar: ${(err as Error).message}`, true);
    }
  }

  return (
    <div>
      <CabecalhoEstoque titulo="Configurações do estoque" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Orçamento e família">
          <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2" noValidate>
            <Campo rotulo="Orçamento mínimo mensal (R$)">
              <input className="input-field" inputMode="decimal" value={orcMin} onChange={(e) => setOrcMin(e.target.value)} />
            </Campo>
            <Campo rotulo="Orçamento máximo mensal (R$)">
              <input className="input-field" inputMode="decimal" value={orcMax} onChange={(e) => setOrcMax(e.target.value)} />
            </Campo>
            <Campo rotulo="Composição da família" className="sm:col-span-2">
              <input className="input-field" value={composicao} onChange={(e) => setComposicao(e.target.value)} />
            </Campo>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </Secao>
        <Secao titulo="Dados na nuvem">
          <p className="text-sm text-gray-600">
            O estoque fica salvo no banco do Life e é <b>compartilhado com todos os membros da família</b>, no computador e no celular. Cada movimentação registra quem a fez.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Produtos: <b>{dados.produtos.length}</b> · Lotes: <b>{dados.lotes.length}</b> · Movimentações: <b>{dados.movs.length}</b> · Locais: <b>{dados.locais.length}</b>
          </p>
          <button type="button" className="btn-secondary mt-3" onClick={exportar}>
            <IconBaixar className="h-4 w-4" /> Exportar cópia (.json)
          </button>
        </Secao>
        <Secao titulo="Importar da versão offline (arquivo HTML)" className="lg:col-span-2">
          <Aviso tom="amarelo">
            Se você já usava o sistema <b>Reserva 180 Dias</b> em arquivo HTML, abra-o, vá em <b>Configurações → Baixar backup (.json)</b> e importe o arquivo aqui. Os produtos, lotes,
            movimentações, locais e o orçamento serão trazidos para a nuvem, <b>substituindo</b> o estoque atual da família.
          </Aviso>
          <input
            ref={arquivo}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) importar(f);
            }}
          />
          <button type="button" className="btn-primary" onClick={() => arquivo.current?.click()}>
            <IconEnviar className="h-4 w-4" /> Escolher backup (.json)
          </button>
        </Secao>
      </div>
    </div>
  );
}
