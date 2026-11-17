'use client';

import { useState } from 'react';
import { salvarContexto } from '@/app/(dashboard)/vida/actions';
import { cn } from '@/lib/utils';

export function AjustesVida({ textoInicial, padrao, personalizado, chaveOk, modelo }: { textoInicial: string; padrao: string; personalizado: boolean; chaveOk: boolean; modelo: string }) {
  const [texto, setTexto] = useState(textoInicial);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const alterado = texto !== textoInicial;

  async function salvar(valor = texto) {
    setSalvando(true);
    setAviso(null);
    const r = await salvarContexto(valor);
    setSalvando(false);
    setAviso(r.error ? { tipo: 'erro', texto: r.error } : { tipo: 'ok', texto: 'Instruções salvas. As próximas respostas do mentor já seguem o novo texto.' });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">⚙️ Ajustes do Mentor</h1>
        <p className="text-sm text-gray-500">Instruções que o mentor segue em todas as conversas. Tudo aqui é privado — só o seu login vê.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cn('rounded-2xl p-4', chaveOk ? 'bg-emerald-50' : 'bg-amber-50')}>
          <p className="text-xs font-medium text-gray-500">Inteligência artificial</p>
          <p className={cn('text-sm font-semibold', chaveOk ? 'text-emerald-800' : 'text-amber-800')}>{chaveOk ? '✅ Conectada' : '⚠️ Falta a chave da API'}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">modelo: {modelo}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Instruções</p>
          <p className="text-sm font-semibold text-gray-800">{personalizado ? '✏️ Personalizadas' : '📄 Texto padrão (o seu documento)'}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Privacidade</p>
          <p className="text-sm font-semibold text-gray-800">🔒 Só você</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Não aparece para a família</p>
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">Instruções e contexto pessoal</p>
          <span className="text-xs text-gray-400">{texto.length.toLocaleString('pt-BR')} caracteres</span>
        </div>
        <p className="text-xs text-gray-500">
          Atualize aqui quando sua vida mudar (novo emprego, metas, rotina). Regras de segurança fixas (como indicar o CVV 188 em caso de crise) valem sempre, mesmo se você apagar algo daqui.
        </p>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={22} className="input-field font-mono text-xs leading-relaxed" />
        {aviso && <p className={cn('text-sm', aviso.tipo === 'ok' ? 'text-positive' : 'text-negative')}>{aviso.texto}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('Voltar para o texto padrão (o documento original)? O que você editou será substituído.')) return;
              setTexto(padrao);
              salvar(padrao);
            }}
            className="btn-secondary"
          >
            Restaurar padrão
          </button>
          <button type="button" onClick={() => salvar()} disabled={salvando || !alterado} className="btn-primary ml-auto">
            {salvando ? 'Salvando...' : alterado ? 'Salvar instruções' : 'Salvo'}
          </button>
        </div>
      </div>
    </div>
  );
}
