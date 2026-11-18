import { IconCalendario, IconLocal } from '@/components/icons';
import { Brilho, Cruz, Pomba, Raios, Separador } from '@/components/jp/Decoracao';
import { cn } from '@/lib/utils';
import { EVENTO_JP, diasAte, type ResumoJp } from '@/lib/jp';
import { fonteScript, fonteSerif } from '@/lib/jpFontes';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function textoPrazo() {
  const d = diasAte(EVENTO_JP.confirmarAte);
  if (d > 1) return `Confirmação até ${EVENTO_JP.confirmarAteTexto} · faltam ${d} dias`;
  if (d === 1) return `Confirmação até ${EVENTO_JP.confirmarAteTexto} · falta 1 dia`;
  if (d === 0) return `Hoje é o último dia para confirmar`;
  const e = diasAte(EVENTO_JP.data);
  return e > 0 ? `Prazo de confirmação encerrado · faltam ${plural(e, 'dia', 'dias')} para o batizado` : e === 0 ? 'Hoje é o batizado!' : 'Batizado realizado';
}

/** Cabeçalho do JP no estilo do convite (usado na tela do app e no link de acompanhamento). */
export function ResumoJpTopo({ resumo, acao, subtitulo }: { resumo: ResumoJp; acao?: React.ReactNode; subtitulo?: React.ReactNode }) {
  const pct = (n: number) => (resumo.pessoas ? (n / resumo.pessoas) * 100 : 0);
  const quadros = [
    { rotulo: 'Convites enviados', valor: resumo.convitesEnviados, sub: `de ${resumo.convites} famílias` },
    { rotulo: 'Faltam enviar', valor: resumo.convitesNaoEnviados, sub: plural(resumo.naoEnviados, 'pessoa', 'pessoas') },
    { rotulo: 'Vão comparecer', valor: resumo.sim, sub: 'pessoas confirmadas' },
    { rotulo: 'Não vão', valor: resumo.nao, sub: `${resumo.pendente} sem resposta` },
    { rotulo: 'Famílias que vão', valor: resumo.familiasVao, sub: `${resumo.familiasSemResposta} sem resposta`, destaque: true },
    { rotulo: 'Brindes', valor: resumo.familiasVao, sub: '1 por família', destaque: true },
  ];

  return (
    <section className={cn('relative overflow-hidden rounded-[28px] border border-[#dfe7f2] bg-white/80 px-4 pb-6 pt-4 text-center shadow-[0_10px_40px_-20px_rgba(44,79,134,0.35)] backdrop-blur-sm sm:px-8', fonteSerif.className)}>
      {/* pomba e raios */}
      <div className="relative mx-auto h-24 w-full max-w-xs sm:h-28">
        <Raios className="absolute inset-x-0 bottom-0 mx-auto h-full w-full" />
        <Pomba className="absolute left-1/2 top-2 h-14 w-28 -translate-x-1/2 drop-shadow-sm sm:h-16 sm:w-32" />
        <Cruz className="absolute bottom-0 left-1/2 h-6 w-4 -translate-x-1/2" />
      </div>

      <h1 className={cn('mt-1 text-5xl leading-tight text-[#4a74b0] sm:text-6xl', fonteScript.className)}>{EVENTO_JP.titulo}</h1>
      <p className="mt-1 text-sm text-[#5d7aa3]">
        {resumo.pessoas} convidados em {resumo.convites} convites
        {subtitulo ? <span className="block text-xs italic text-[#8aa0bf]">{subtitulo}</span> : null}
      </p>
      {acao && <div className="mt-3 flex justify-center">{acao}</div>}

      <Separador className="mx-auto my-4 max-w-md" />

      {/* evento */}
      <div className="mx-auto grid max-w-3xl gap-3 text-[#2f5288] sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-[#d5e0ee]">
        <div className="px-4">
          <p className="text-lg italic text-[#4a74b0]">Cerimônia</p>
          <p className="flex items-center justify-center gap-1.5 text-xl font-semibold">
            <IconCalendario className="h-4 w-4 text-[#7c99c4]" /> {EVENTO_JP.dataTexto} · {EVENTO_JP.hora}
          </p>
          <p className="flex items-center justify-center gap-1.5 text-sm">
            <IconLocal className="h-4 w-4 text-[#7c99c4]" /> {EVENTO_JP.local}, {EVENTO_JP.cidade}
          </p>
        </div>
        <div className="px-4">
          <p className="text-lg italic text-[#4a74b0]">Após a cerimônia</p>
          <p className="text-base font-semibold">{EVENTO_JP.festa}</p>
          <p className="text-sm">{EVENTO_JP.endereco}</p>
        </div>
      </div>

      <div className="mx-auto mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-[#3f6aa6] px-4 py-1.5 text-xs italic text-white shadow-sm sm:text-sm">
        <Brilho className="h-3 w-3 shrink-0" />
        <span className="truncate">{textoPrazo()}</span>
      </div>

      {/* números */}
      <dl className="mx-auto mt-5 grid max-w-6xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        {quadros.map((x) => (
          <div
            key={x.rotulo}
            className={cn(
              'rounded-2xl border px-3 py-3',
              x.destaque ? 'border-[#e8d6a8] bg-gradient-to-b from-[#fffaf0] to-[#fbf1da]' : 'border-[#dfe7f2] bg-gradient-to-b from-white to-[#f3f7fc]'
            )}
          >
            <dt className={cn('truncate text-[11px] font-medium uppercase tracking-wide', x.destaque ? 'text-[#a8842f]' : 'text-[#7c93b5]')}>{x.rotulo}</dt>
            <dd className={cn('text-3xl font-semibold tabular-nums', x.destaque ? 'text-[#8a6a1e]' : 'text-[#2f5288]')}>{x.valor}</dd>
            <dd className="truncate text-[11px] italic text-[#8aa0bf]">{x.sub}</dd>
          </div>
        ))}
      </dl>

      {resumo.pessoas > 0 && (
        <div className="mx-auto mt-4 max-w-6xl">
          <div className="flex h-2 overflow-hidden rounded-full bg-[#e6edf6]" title="Sim · Não · Pendente">
            <span className="h-full bg-[#3f6aa6]" style={{ width: `${pct(resumo.sim)}%` }} />
            <span className="h-full bg-[#c9a3a3]" style={{ width: `${pct(resumo.nao)}%` }} />
            <span className="h-full bg-[#e3c47c]" style={{ width: `${pct(resumo.pendente)}%` }} />
          </div>
          <div className="mt-1.5 flex justify-center gap-4 text-[11px] text-[#7c93b5]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#3f6aa6]" />Vão</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#c9a3a3]" />Não vão</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#e3c47c]" />Pendentes</span>
          </div>
        </div>
      )}

      <p className={cn('mt-3 text-4xl text-[#4a74b0]', fonteSerif.className)}>JP</p>
    </section>
  );
}
