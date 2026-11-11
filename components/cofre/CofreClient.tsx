'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { CofreForm } from '@/components/cofre/CofreForm';
import { CofreCard } from '@/components/cofre/CofreCard';
import { CofreDetalheModal } from '@/components/cofre/CofreDetalheModal';
import { MovimentacaoCofreForm } from '@/components/cofre/MovimentacaoCofreForm';
import { IconPlus, IconSearch } from '@/components/icons';
import { Abertura, botaoAbertura } from '@/components/ui/Abertura';
import { formatCurrency } from '@/lib/utils';
import { criarCofre, atualizarCofre, registrarMovimentacaoCofre } from '@/app/(dashboard)/cofre/actions';
import type { CofreSeguro } from '@/components/cofre/types';
import type { CofreMovimentacao, TipoMovimentacaoCofre } from '@/types/database';

export function CofreClient({
  cofres,
  movimentacoes,
}: {
  cofres: CofreSeguro[];
  movimentacoes: CofreMovimentacao[];
}) {
  const [modalForm, setModalForm] = useState(false);
  const [modalMovimentacao, setModalMovimentacao] = useState(false);
  const [modalDetalhe, setModalDetalhe] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<TipoMovimentacaoCofre>('deposito');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [desbloqueados, setDesbloqueados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');

  // Deriva sempre do array mais recente de `cofres` (em vez de guardar uma cópia),
  // para não mostrar saldo/nome desatualizados depois de um depósito, retirada ou edição.
  const selecionado = selecionadoId ? cofres.find((c) => c.id === selecionadoId) : undefined;

  const movimentacoesPorCofre = useMemo(() => {
    const mapa = new Map<string, CofreMovimentacao[]>();
    for (const m of movimentacoes) {
      const lista = mapa.get(m.cofre_id) ?? [];
      lista.push(m);
      mapa.set(m.cofre_id, lista);
    }
    return mapa;
  }, [movimentacoes]);

  const cofresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cofres;
    return cofres.filter(
      (c) => c.nome.toLowerCase().includes(termo) || (c.descricao ?? '').toLowerCase().includes(termo)
    );
  }, [cofres, busca]);

  function abrirNovo() {
    setSelecionadoId(null);
    setModalForm(true);
  }

  function abrirEdicao(c: CofreSeguro) {
    setSelecionadoId(c.id);
    setModalDetalhe(false);
    setModalForm(true);
  }

  function abrirMovimentacao(c: CofreSeguro, tipo: TipoMovimentacaoCofre) {
    setSelecionadoId(c.id);
    setTipoMovimentacao(tipo);
    setModalMovimentacao(true);
  }

  function abrirDetalhe(c: CofreSeguro) {
    setSelecionadoId(c.id);
    setModalDetalhe(true);
  }

  function marcarDesbloqueado(id: string) {
    setDesbloqueados((atual) => new Set(atual).add(id));
  }

  const resumo = useMemo(() => {
    const visiveis = cofres.filter((c) => !c.protegido || desbloqueados.has(c.id));
    const ids = new Set(visiveis.map((c) => c.id));
    const mes = new Date().toISOString().slice(0, 7);
    const doMes = movimentacoes.filter((m) => ids.has(m.cofre_id) && m.data.startsWith(mes));
    return {
      total: visiveis.reduce((a, c) => a + Number(c.saldo), 0),
      protegidos: cofres.length - visiveis.length,
      depositos: doMes.filter((m) => m.tipo === 'deposito').reduce((a, m) => a + Number(m.valor), 0),
      retiradas: doMes.filter((m) => m.tipo !== 'deposito').reduce((a, m) => a + Number(m.valor), 0),
    };
  }, [cofres, movimentacoes, desbloqueados]);

  return (
    <div className="space-y-5">
      <Abertura
        cor="verde"
        sobretitulo="Cofre"
        titulo={formatCurrency(resumo.total)}
        subtitulo={`guardados em ${cofres.length - resumo.protegidos} cofre(s)${resumo.protegidos ? ` · ${resumo.protegidos} protegido(s) por senha não somado(s)` : ''}`}
        cartoes={[
          { rotulo: '🔐 Cofres', valor: cofres.length, sub: resumo.protegidos ? `${resumo.protegidos} com senha` : 'todos abertos' },
          { rotulo: '⬆️ Depósitos no mês', valor: formatCurrency(resumo.depositos), sub: 'cofres visíveis' },
          { rotulo: '⬇️ Retiradas no mês', valor: formatCurrency(resumo.retiradas), sub: 'cofres visíveis' },
        ]}
        acoes={
          <button type="button" onClick={abrirNovo} className={botaoAbertura.principal}>
            <IconPlus className="h-4 w-4" /> Novo cofre
          </button>
        }
        rodape="Guarde dinheiro para projetos e reservas específicas"
      />

      {cofres.length > 0 && (
        <div className="relative sm:max-w-sm">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar cofres..." className="input-field pl-9" />
        </div>
      )}

      {cofresFiltrados.length === 0 ? (
        <EmptyState mensagem={cofres.length === 0 ? 'Nenhum cofre criado ainda.' : 'Nenhum cofre encontrado.'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cofresFiltrados.map((c) => (
            <CofreCard
              key={c.id}
              cofre={c}
              desbloqueado={!c.protegido || desbloqueados.has(c.id)}
              onDesbloquear={() => marcarDesbloqueado(c.id)}
              onAbrir={() => abrirDetalhe(c)}
              onMovimentar={(tipo) => abrirMovimentacao(c, tipo)}
            />
          ))}
        </div>
      )}

      <CofreDetalheModal
        open={modalDetalhe}
        cofre={selecionado}
        historico={selecionado ? movimentacoesPorCofre.get(selecionado.id) ?? [] : []}
        onClose={() => setModalDetalhe(false)}
        onEditar={abrirEdicao}
        onMovimentar={abrirMovimentacao}
        onExcluido={() => {
          setModalDetalhe(false);
          setSelecionadoId(null);
        }}
      />

      <Modal open={modalForm} onClose={() => setModalForm(false)} title={selecionado ? 'Editar cofre' : 'Novo cofre'}>
        <CofreForm
          action={selecionado ? atualizarCofre.bind(null, selecionado.id) : criarCofre}
          cofre={selecionado}
          onSucesso={() => setModalForm(false)}
        />
      </Modal>

      <Modal
        open={modalMovimentacao}
        onClose={() => setModalMovimentacao(false)}
        title={selecionado ? `${tipoMovimentacao === 'deposito' ? 'Depositar em' : 'Retirar de'} ${selecionado.nome}` : ''}
      >
        {selecionado && (
          <MovimentacaoCofreForm
            action={registrarMovimentacaoCofre.bind(null, selecionado.id)}
            saldoAtual={Number(selecionado.saldo)}
            tipoInicial={tipoMovimentacao}
            onSucesso={() => setModalMovimentacao(false)}
            onCancelar={() => setModalMovimentacao(false)}
          />
        )}
      </Modal>
    </div>
  );
}
