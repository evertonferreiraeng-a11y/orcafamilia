'use client';

import { useEstoque } from '@/components/estoque/EstoqueContext';
import { CabecalhoEstoque } from '@/components/estoque/Cabecalho';
import { TabelaLotes } from '@/components/estoque/LotesEstoque';
import { TabelaProdutos } from '@/components/estoque/ProdutosEstoque';
import { Aviso, Badge, Barra, Secao, Vazio, type Tom } from '@/components/estoque/ui';
import { IconCheck, IconEdit, IconPlus, IconTrash } from '@/components/icons';
import { CONDICOES, estoqueAtual, estoqueDisponivel, fmtData, fmtPct, fmtQtd, hojeISO, ordemFEFO, ordenarPorNome, soma, textoPrazo } from '@/lib/estoque/calc';
import type { EstoqueLocal } from '@/types/database';

/* ---------- ÁGUA ---------- */
export function AguaEstoque() {
  const { dados, abrir } = useEstoque();
  const aguas = dados.produtos.filter((p) => p.tipo === 'agua');
  if (!aguas.length) {
    return (
      <div>
        <CabecalhoEstoque titulo="Água potável" />
        <Secao>
          <Vazio>
            Nenhum produto do tipo “Água potável”.{' '}
            <button type="button" className="btn-primary ml-2" onClick={() => abrir({ tipo: 'produto', tipoProduto: 'agua' })}>
              Cadastrar
            </button>
          </Vazio>
        </Secao>
      </div>
    );
  }
  const ids = aguas.map((p) => p.id);
  const lotes = dados.lotes.filter((l) => ids.includes(l.produto_id) && l.qtd_atual !== 0).sort(ordemFEFO);
  const litros = soma(aguas, (p) => estoqueAtual(dados, p));
  const meta = soma(aguas, (p) => p.meta);
  const disp = soma(aguas, (p) => estoqueDisponivel(dados, p));
  const capMeta = aguas[0].cap || 5;
  const garrafas: Record<string, number> = {};
  for (const l of lotes) {
    if (l.qtd_atual <= 0) continue;
    const c = l.cap || capMeta;
    garrafas[c] = (garrafas[c] || 0) + l.qtd_atual / c;
  }
  const totalGarrafas = soma(Object.values(garrafas), (v) => v);
  const prox = lotes.filter((l) => l.qtd_atual > 0 && l.validade).sort(ordemFEFO)[0];
  const pct = meta ? Math.min(100, (litros / meta) * 100) : 0;

  return (
    <div>
      <CabecalhoEstoque titulo="Água potável" descricao="Garrafas de 500 ml, 1 L, 1,5 L, 5 L e outras – total calculado em litros">
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'produto', id: aguas[0].id })}>
          <IconEdit className="h-4 w-4" /> Alterar meta
        </button>
      </CabecalhoEstoque>
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Secao>
          <p className="text-xs font-medium text-gray-500">Água armazenada</p>
          <p className="text-3xl font-bold tabular-nums text-brand-600">{fmtQtd(litros)} L</p>
          <div className="my-2">
            <Barra pct={pct} tom="azul" grossa />
          </div>
          <p className="text-xs text-gray-500">
            {fmtPct(pct)} da meta de {fmtQtd(meta)} L · faltam {fmtQtd(Math.max(meta - litros, 0))} L
          </p>
        </Secao>
        <Secao>
          <p className="text-xs font-medium text-gray-500">Garrafas / embalagens</p>
          <p className="text-3xl font-bold tabular-nums text-gray-900">{fmtQtd(Math.round(totalGarrafas * 10) / 10)}</p>
          <p className="text-xs text-gray-500">
            meta: {fmtQtd(meta / capMeta)} garrafas de {fmtQtd(capMeta)} L
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(garrafas)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([c, n]) => (
                <Badge key={c} tom="azul" ponto={false}>
                  {fmtQtd(Math.round(n * 10) / 10)} × {fmtQtd(Number(c))} L
                </Badge>
              ))}
          </div>
        </Secao>
        <Secao>
          <p className="text-xs font-medium text-gray-500">Dentro da validade</p>
          <p className="text-3xl font-bold tabular-nums text-gray-900">{fmtQtd(disp)} L</p>
          <p className="text-xs text-gray-500">{prox ? `próximo vencimento: ${fmtData(prox.validade)} (${textoPrazo(prox)})` : 'sem validades registradas'}</p>
        </Secao>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => abrir({ tipo: 'entrada', produtoId: aguas[0].id })}>
          <IconPlus className="h-4 w-4" /> Entrada de água
        </button>
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'saida', produtoId: aguas[0].id })}>
          Saída de água
        </button>
      </div>
      <Secao titulo="Lotes de água" extra={<span className="text-xs text-gray-400">ordem FEFO</span>} semPadding>
        <TabelaLotes lotes={lotes} agua />
      </Secao>
      <p className="mt-3 text-xs text-gray-400">Guarde a água em local fresco, longe do sol e de produtos de limpeza ou combustíveis. Faça o rodízio respeitando a validade da embalagem.</p>
    </div>
  );
}

/* ---------- BEBÊ ---------- */
export function BebeEstoque() {
  const { dados, abrir } = useEstoque();
  const ps = dados.produtos.filter((p) => p.tipo === 'bebe').sort(ordenarPorNome);
  const ids = ps.map((p) => p.id);
  const lotes = dados.lotes.filter((l) => ids.includes(l.produto_id) && l.qtd_atual !== 0).sort(ordemFEFO);
  return (
    <div>
      <CabecalhoEstoque titulo="Alimentação do bebê" descricao="Controle separado da reserva familiar">
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'produto', tipoProduto: 'bebe' })}>
          <IconPlus className="h-4 w-4" /> Novo item do bebê
        </button>
      </CabecalhoEstoque>
      <Aviso tom="azul">
        <b>Controle separado.</b> Os itens do bebê não entram no percentual da reserva alimentar. Metas, marca e tipo de fórmula devem seguir a orientação do pediatra — revise conforme o
        bebê cresce.
      </Aviso>
      <Secao titulo="Itens" semPadding className="mb-5">
        <TabelaProdutos produtos={ps} />
      </Secao>
      <Secao titulo="Lotes e validades" semPadding>
        <TabelaLotes lotes={lotes} />
      </Secao>
    </div>
  );
}

/* ---------- LOCAIS ---------- */
const ROTULO_COND: Record<keyof typeof CONDICOES, string> = { umidade: 'Umidade', temperatura: 'Temperatura', sol: 'Sol', embalagem: 'Embalagens' };
function tomCondicao(k: keyof typeof CONDICOES, v: string): Tom {
  const i = (CONDICOES[k] as readonly string[]).indexOf(v);
  if (i < 0) return 'cinza';
  if (i === 0) return 'verde';
  if (i === 1) return k === 'temperatura' ? 'azul' : 'amarelo';
  return 'vermelho';
}
const localComAtencao = (l: EstoqueLocal) =>
  (['umidade', 'sol', 'embalagem'] as const).some((k) => (CONDICOES[k] as readonly string[]).indexOf(l[k]) > 0) || l.temperatura === 'Quente';

export function LocaisEstoque() {
  const { dados, abrir, gravar, confirmar, avisar } = useEstoque();

  async function excluir(l: EstoqueLocal) {
    const n = dados.lotes.filter((x) => x.local_id === l.id).length + dados.produtos.filter((p) => p.local_id === l.id).length;
    const ok = await confirmar({
      titulo: 'Excluir local',
      perigo: true,
      ok: 'Excluir',
      mensagem: (
        <>
          Excluir o local <b>{l.nome}</b>?{n > 0 && <p className="mt-2">{n} lote(s)/produto(s) associados ficarão sem local.</p>}
        </>
      ),
    });
    if (!ok) return;
    try {
      await gravar('estoque_locais', 'delete', undefined, { coluna: 'id', valor: l.id });
      avisar('Local excluído.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }
  async function inspecionar(l: EstoqueLocal) {
    try {
      await gravar('estoque_locais', 'update', { inspecao: hojeISO() }, { coluna: 'id', valor: l.id });
      avisar('Inspeção registrada.');
    } catch (e) {
      avisar((e as Error).message, true);
    }
  }

  return (
    <div>
      <CabecalhoEstoque titulo="Locais de armazenamento" descricao="Associe cada lote a um local e acompanhe as condições">
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'local' })}>
          <IconPlus className="h-4 w-4" /> Novo local
        </button>
      </CabecalhoEstoque>
      {dados.locais.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dados.locais.map((l) => {
            const lotes = dados.lotes.filter((x) => x.local_id === l.id && x.qtd_atual > 0);
            const nomes = [...new Set(lotes.map((x) => dados.produtos.find((p) => p.id === x.produto_id)?.nome).filter(Boolean))] as string[];
            return (
              <Secao key={l.id}>
                <div className="flex items-start gap-2">
                  <h4 className="flex-1 text-base font-semibold text-gray-900">{l.nome}</h4>
                  {localComAtencao(l) ? <Badge tom="amarelo">Atenção</Badge> : <Badge tom="verde">OK</Badge>}
                </div>
                <div className="my-2 flex flex-wrap gap-1.5">
                  {(Object.keys(CONDICOES) as (keyof typeof CONDICOES)[]).map((k) => (
                    <Badge key={k} tom={tomCondicao(k, l[k])} ponto={false}>
                      {ROTULO_COND[k]}: {l[k]}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  <b>{lotes.length}</b> lote(s) ativos{nomes.length ? `: ${nomes.slice(0, 6).join(', ')}${nomes.length > 6 ? '…' : ''}` : ''}
                </p>
                <p className="mt-1 text-xs text-gray-500">Última inspeção: {fmtData(l.inspecao)}</p>
                {l.obs && <p className="mt-2 text-sm text-gray-600">{l.obs}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => abrir({ tipo: 'local', id: l.id })}>
                    <IconEdit className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => inspecionar(l)}>
                    <IconCheck className="h-3.5 w-3.5" /> Inspecionado hoje
                  </button>
                  <button type="button" className="btn-danger !px-3 !py-1 text-xs" onClick={() => excluir(l)}>
                    <IconTrash className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </Secao>
            );
          })}
        </div>
      ) : (
        <Secao>
          <Vazio>Nenhum local cadastrado.</Vazio>
        </Secao>
      )}
    </div>
  );
}
