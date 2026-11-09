'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase';
import { mensagemErroCasa, type DadosCasa } from '@/lib/casa/calc';

export type ModalCasa =
  | { tipo: 'tarefa'; id?: string; itemId?: string }
  | { tipo: 'feito'; tarefaId: string }
  | { tipo: 'item'; id?: string }
  | { tipo: 'prestador'; id?: string }
  | null;

type TabelaCasa = 'casa_config' | 'casa_prestadores' | 'casa_itens' | 'casa_tarefas';

type Contexto = {
  dados: DadosCasa;
  modal: ModalCasa;
  abrir: (m: ModalCasa) => void;
  fechar: () => void;
  rpc: <T = unknown>(nome: string, args?: Record<string, unknown>) => Promise<T>;
  gravar: (tabela: TabelaCasa, op: 'insert' | 'update' | 'delete', valores?: Record<string, unknown>, id?: string) => Promise<void>;
  confirmar: (o: { titulo?: string; mensagem: React.ReactNode; ok?: string; perigo?: boolean }) => Promise<boolean>;
  avisar: (texto: string, erro?: boolean) => void;
};

const Ctx = createContext<Contexto | null>(null);

export function useCasa(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCasa precisa estar dentro de <CasaProvider>');
  return c;
}

type Confirmacao = { titulo: string; mensagem: React.ReactNode; ok: string; perigo?: boolean; resolver: (v: boolean) => void };

export function CasaProvider({ dados, children }: { dados: DadosCasa; children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [modal, setModal] = useState<ModalCasa>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [avisos, setAvisos] = useState<{ id: number; texto: string; erro?: boolean }[]>([]);

  const avisar = useCallback((texto: string, erro?: boolean) => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, texto, erro }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), erro ? 6000 : 3500);
  }, []);

  const rpc = useCallback(
    async <T,>(nome: string, args?: Record<string, unknown>): Promise<T> => {
      const { data, error } = await (supabase as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<{ data: T; error: { message: string } | null }>;
      }).rpc(nome, args);
      if (error) throw new Error(mensagemErroCasa(error));
      router.refresh();
      return data;
    },
    [supabase, router]
  );

  const gravar = useCallback<Contexto['gravar']>(
    async (tabela, op, valores, id) => {
      const t = (supabase as unknown as { from: (t: string) => any }).from(tabela);
      const q = op === 'insert' ? t.insert(valores) : op === 'update' ? t.update(valores).eq('id', id) : t.delete().eq('id', id);
      const { error } = await q;
      if (error) throw new Error(mensagemErroCasa(error));
      router.refresh();
    },
    [supabase, router]
  );

  const confirmar = useCallback<Contexto['confirmar']>(
    ({ titulo = 'Confirmar', mensagem, ok = 'Confirmar', perigo }) => new Promise<boolean>((resolver) => setConfirmacao({ titulo, mensagem, ok, perigo, resolver })),
    []
  );

  const valor = useMemo<Contexto>(
    () => ({ dados, modal, abrir: setModal, fechar: () => setModal(null), rpc, gravar, confirmar, avisar }),
    [dados, modal, rpc, gravar, confirmar, avisar]
  );

  function responder(v: boolean) {
    confirmacao?.resolver(v);
    setConfirmacao(null);
  }

  return (
    <Ctx.Provider value={valor}>
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
                autoFocus
                className={confirmacao.perigo ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-negative px-4 py-2 text-sm font-medium text-white hover:bg-red-700' : 'btn-primary'}
                onClick={() => responder(true)}
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
