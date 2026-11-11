'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase';
import { mensagemErro, type DadosEstoque } from '@/lib/estoque/calc';
import type { TipoSaidaEstoque, TipoProdutoEstoque } from '@/types/database';

export type ModalEstoque =
  | { tipo: 'entrada'; produtoId?: string }
  | { tipo: 'saida'; produtoId?: string; loteId?: string; tipoSaida?: TipoSaidaEstoque }
  | { tipo: 'produto'; id?: string; tipoProduto?: TipoProdutoEstoque; nome?: string; listaId?: string }
  | { tipo: 'lote'; id: string }
  | { tipo: 'local'; id?: string }
  | { tipo: 'itemLista' }
  | null;

type Confirmacao = {
  titulo: string;
  mensagem: React.ReactNode;
  ok: string;
  perigo?: boolean;
  resolver: (v: boolean) => void;
};

type Aviso = { id: number; texto: string; erro?: boolean };

type ContextoEstoque = {
  dados: DadosEstoque;
  online: boolean;
  modal: ModalEstoque;
  abrir: (m: ModalEstoque) => void;
  fechar: () => void;
  /** Chama uma função do banco (estoque_*). Lança Error com mensagem amigável. Recarrega os dados ao final. */
  rpc: <T = unknown>(nome: string, args?: Record<string, unknown>) => Promise<T>;
  /** Insere/atualiza/exclui em uma tabela do estoque. Lança Error com mensagem amigável. */
  gravar: (
    tabela: 'estoque_config' | 'estoque_locais' | 'estoque_produtos' | 'estoque_lotes' | 'estoque_lista' | 'estoque_movs',
    op: 'insert' | 'update' | 'delete',
    valores?: Record<string, unknown> | Record<string, unknown>[],
    id?: { coluna: string; valor: string }
  ) => Promise<void>;
  recarregar: () => void;
  confirmar: (opts: { titulo?: string; mensagem: React.ReactNode; ok?: string; perigo?: boolean }) => Promise<boolean>;
  avisar: (texto: string, erro?: boolean) => void;
};

const Ctx = createContext<ContextoEstoque | null>(null);

export function useEstoque(): ContextoEstoque {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEstoque precisa estar dentro de <EstoqueProvider>');
  return c;
}

export function EstoqueProvider({ dados, children }: { dados: DadosEstoque; children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [modal, setModal] = useState<ModalEstoque>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    atualizar();
    window.addEventListener('online', atualizar);
    window.addEventListener('offline', atualizar);
    return () => {
      window.removeEventListener('online', atualizar);
      window.removeEventListener('offline', atualizar);
    };
  }, []);

  const avisar = useCallback((texto: string, erro?: boolean) => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, texto, erro }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), erro ? 6000 : 3500);
  }, []);

  const recarregar = useCallback(() => router.refresh(), [router]);

  const rpc = useCallback(
    async <T,>(nome: string, args?: Record<string, unknown>): Promise<T> => {
      // cast pontual: as funções estoque_* estão tipadas em types/database.ts,
      // mas o nome é dinâmico aqui
      const { data, error } = await (supabase as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<{ data: T; error: { message: string } | null }>;
      }).rpc(nome, args);
      if (error) throw new Error(mensagemErro(error));
      router.refresh();
      return data;
    },
    [supabase, router]
  );

  const gravar = useCallback<ContextoEstoque['gravar']>(
    async (tabela, op, valores, id) => {
      const t = (supabase as unknown as { from: (t: string) => any }).from(tabela);
      let q;
      if (op === 'insert') q = t.insert(valores);
      else if (op === 'update') q = t.update(valores).eq(id!.coluna, id!.valor);
      else q = t.delete().eq(id!.coluna, id!.valor);
      const { error } = await q;
      if (error) throw new Error(mensagemErro(error));
      router.refresh();
    },
    [supabase, router]
  );

  const confirmar = useCallback<ContextoEstoque['confirmar']>(
    ({ titulo = 'Confirmar', mensagem, ok = 'Confirmar', perigo }) =>
      new Promise<boolean>((resolver) => setConfirmacao({ titulo, mensagem, ok, perigo, resolver })),
    []
  );

  const valor = useMemo<ContextoEstoque>(
    () => ({ dados, online, modal, abrir: setModal, fechar: () => setModal(null), rpc, gravar, recarregar, confirmar, avisar }),
    [dados, online, modal, rpc, gravar, recarregar, confirmar, avisar]
  );

  function responder(v: boolean) {
    confirmacao?.resolver(v);
    setConfirmacao(null);
  }

  return (
    <Ctx.Provider value={valor}>
      {!online && (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Você está sem internet. Os dados do estoque ficam na nuvem — as alterações só podem ser salvas quando a conexão voltar.
        </div>
      )}
      {children}

      {confirmacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated" role="alertdialog" aria-modal="true">
            <h3 className="mb-3 text-base font-semibold text-gray-900">{confirmacao.titulo}</h3>
            <div className="text-sm text-gray-600">{confirmacao.mensagem}</div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => responder(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={confirmacao.perigo ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-negative px-4 py-2 text-sm font-medium text-white hover:bg-red-700' : 'btn-primary'}
                onClick={() => responder(true)}
                autoFocus
              >
                {confirmacao.ok}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        {avisos.map((a) => (
          <div key={a.id} className={`rounded-xl px-4 py-2.5 text-sm text-white shadow-elevated ${a.erro ? 'bg-negative' : 'bg-gray-900'}`}>
            {a.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
