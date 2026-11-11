import Link from 'next/link';
import {
  IconCasa,
  IconChevronRight,
  IconEstoque,
  IconTrendDown,
  IconTrendUp,
  IconWallet,
  IconAlerta,
  IconCheck,
} from '@/components/icons';

/* ------------------------------------------------------------------ */
/* Dados (calculados no servidor em app/(dashboard)/inicio/page.tsx)   */
/* ------------------------------------------------------------------ */
export type AppPortal = 'orcamento' | 'estoque' | 'casa';
export type AlertaPortal = { app: AppPortal; nivel: 'urgente' | 'atencao' | 'info'; texto: string; detalhe?: string; href: string };

export type ResumoPortal = {
  nome: string;
  saudacao: string;
  dataExtenso: string;
  mesExtenso: string;
  orcamento: { receitas: number; despesas: number; saldo: number; aPagar: number; aPagarValor: number; atrasadas: number; atrasadasValor: number } | null;
  estoque: { reserva: number; litros: number; litrosMeta: number; vencendo: number; comprar: number; semEstoque: number } | null;
  casa: { vencidas: number; breve: number; emDia: number; semData: number; pausadas: number; proxima: { titulo: string; data: string } | null } | null;
  alertas: AlertaPortal[];
};

/* ------------------------------------------------------------------ */
const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const moedaCurta = (n: number) => (Math.abs(n) >= 10000 ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : moeda(n));
const moedaInteira = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const inicialMaiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const num = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const TEMA = {
  orcamento: {
    nome: 'Orçamento Familiar',
    curto: 'Orçamento',
    descricao: 'Contas, cartões, transações e metas',
    href: '/dashboard',
    Icone: IconWallet,
    topo: 'from-brand-50 via-white to-white',
    faixa: 'from-brand-500 to-sky-400',
    icone: 'bg-brand-600 text-white shadow-[0_6px_16px_-4px_rgb(var(--brand-600)/0.55)]',
    marca: 'text-brand-600',
    botao: 'bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-600',
    chip: 'bg-brand-50 text-brand-700',
    atalhos: [
      { href: '/transacoes', rotulo: 'Transações' },
      { href: '/orcamentos', rotulo: 'Orçamentos' },
      { href: '/metas', rotulo: 'Metas' },
    ],
  },
  estoque: {
    nome: 'Estoque Familiar',
    curto: 'Estoque',
    descricao: 'Reserva de 180 dias: alimentos, água e bebê',
    href: '/estoque',
    Icone: IconEstoque,
    topo: 'from-emerald-50 via-white to-white',
    faixa: 'from-emerald-500 to-teal-400',
    icone: 'bg-emerald-600 text-white shadow-[0_6px_16px_-4px_rgb(5_150_105/0.55)]',
    marca: 'text-emerald-600',
    botao: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-600',
    chip: 'bg-emerald-50 text-emerald-700',
    atalhos: [
      { href: '/estoque/compras', rotulo: 'Lista de compras' },
      { href: '/estoque/lotes', rotulo: 'Validades' },
      { href: '/estoque/agua', rotulo: 'Água' },
    ],
  },
  casa: {
    nome: 'Casa',
    curto: 'Casa',
    descricao: 'Manutenções, equipamentos e prestadores',
    href: '/casa',
    Icone: IconCasa,
    topo: 'from-amber-50 via-white to-white',
    faixa: 'from-amber-400 to-orange-400',
    icone: 'bg-amber-500 text-white shadow-[0_6px_16px_-4px_rgb(245_158_11/0.6)]',
    marca: 'text-amber-600',
    botao: 'bg-amber-500 hover:bg-amber-600 focus-visible:outline-amber-500',
    chip: 'bg-amber-50 text-amber-700',
    atalhos: [
      { href: '/casa/manutencoes', rotulo: 'Manutenções' },
      { href: '/casa/itens', rotulo: 'Itens' },
      { href: '/casa/prestadores', rotulo: 'Prestadores' },
    ],
  },
} as const;

const NIVEL = {
  urgente: { ponto: 'bg-red-500', anel: 'ring-red-100', texto: 'text-red-700' },
  atencao: { ponto: 'bg-amber-500', anel: 'ring-amber-100', texto: 'text-amber-700' },
  info: { ponto: 'bg-brand-500', anel: 'ring-brand-100', texto: 'text-brand-700' },
} as const;

/* ------------------------------------------------------------------ */
function Metrica({ rotulo, valor, tom, sub }: { rotulo: string; valor: React.ReactNode; tom?: string; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400">{rotulo}</p>
      <p className={`mt-0.5 truncate text-lg font-bold tabular-nums ${tom ?? 'text-gray-900'}`}>{valor}</p>
      {sub && <p className="truncate text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">{children}</p>;
}

function CardApp({ app, children, destaque }: { app: AppPortal; children: React.ReactNode; destaque?: React.ReactNode }) {
  const t = TEMA[app];
  const Icone = t.Icone;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-elevated">
      <div aria-hidden className={`h-1 bg-gradient-to-r ${t.faixa}`} />
      <div className={`relative bg-gradient-to-b ${t.topo} px-5 pb-3 pt-4`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.icone}`}>
            <Icone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-gray-900">{t.nome}</h3>
            <p className="truncate text-xs text-gray-500">{t.descricao}</p>
          </div>
          {destaque}
        </div>
      </div>
      <div className="flex-1 px-5 pb-4 pt-2">{children}</div>
      <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
          {t.atalhos.map((a) => (
            <Link key={a.href} href={a.href} className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-900">
              {a.rotulo}
            </Link>
          ))}
        </div>
        <Link
          href={t.href}
          className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-soft transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${t.botao}`}
        >
          Abrir <IconChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

function Pilula({ children, tom }: { children: React.ReactNode; tom: 'ok' | 'alerta' | 'neutro' }) {
  const c = tom === 'ok' ? 'bg-emerald-50 text-emerald-700' : tom === 'alerta' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600';
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c}`}>{children}</span>;
}

/* ---------------------------- cards ---------------------------- */
function CardOrcamento({ r, mes }: { r: ResumoPortal['orcamento']; mes: string }) {
  if (!r) {
    return (
      <CardApp app="orcamento">
        <Vazio>Abra o Orçamento para ver o resumo do mês.</Vazio>
      </CardApp>
    );
  }
  const total = r.receitas + r.despesas;
  const pReceita = total > 0 ? (r.receitas / total) * 100 : 50;
  return (
    <CardApp app="orcamento" destaque={r.atrasadas > 0 ? <Pilula tom="alerta">{r.atrasadas} em atraso</Pilula> : undefined}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Saldo de {mes}</p>
      <p className={`text-3xl font-bold tracking-tight tabular-nums ${r.saldo < 0 ? 'text-red-600' : 'text-gray-900'}`}>{moeda(r.saldo)}</p>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-100" title="Receitas x despesas">
        {total > 0 && (
          <>
            <span className="h-full bg-emerald-500" style={{ width: `${pReceita}%` }} />
            <span className="h-full bg-rose-400" style={{ width: `${100 - pReceita}%` }} />
          </>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metrica rotulo="Receitas" valor={<span className="inline-flex items-center gap-1"><IconTrendUp className="h-4 w-4 shrink-0 text-emerald-500" />{moedaCurta(r.receitas)}</span>} />
        <Metrica rotulo="Despesas" valor={<span className="inline-flex items-center gap-1"><IconTrendDown className="h-4 w-4 shrink-0 text-rose-500" />{moedaCurta(r.despesas)}</span>} />
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-gray-50 px-3.5 py-2.5 text-sm">
        <span className={`h-2 w-2 shrink-0 rounded-full ${r.atrasadas ? 'bg-red-500' : r.aPagar ? 'bg-amber-400' : 'bg-emerald-500'}`} />
        <span className="min-w-0 flex-1 truncate text-gray-700">
          {r.atrasadas ? `${r.atrasadas} conta(s) em atraso` : r.aPagar ? `${r.aPagar} conta(s) a pagar em 7 dias` : 'Nenhuma conta a pagar nos próximos 7 dias'}
        </span>
        {(r.atrasadas > 0 || r.aPagar > 0) && <b className={`shrink-0 tabular-nums ${r.atrasadas ? 'text-red-600' : 'text-gray-900'}`}>{moeda(r.atrasadas ? r.atrasadasValor : r.aPagarValor)}</b>}
      </div>
    </CardApp>
  );
}

function CardEstoque({ r }: { r: ResumoPortal['estoque'] }) {
  if (!r) {
    return (
      <CardApp app="estoque">
        <Vazio>Módulo ainda não configurado no banco (migração 0019).</Vazio>
      </CardApp>
    );
  }
  const pctAgua = r.litrosMeta > 0 ? Math.min(100, (r.litros / r.litrosMeta) * 100) : 0;
  const reserva = Math.max(0, Math.min(100, r.reserva));
  // anel de progresso da reserva
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <CardApp app="estoque" destaque={r.vencendo > 0 ? <Pilula tom="alerta">{r.vencendo} vencendo</Pilula> : undefined}>
      <div className="flex items-center gap-4">
        <div className="relative h-[76px] w-[76px] shrink-0">
          <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
            <circle cx="38" cy="38" r={R} fill="none" stroke="#e7f6ef" strokeWidth="8" />
            {reserva > 0 && <circle cx="38" cy="38" r={R} fill="none" stroke="#059669" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(reserva / 100) * C} ${C}`} />}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-gray-900">{Math.round(reserva)}%</span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Reserva concluída</p>
          {r.comprar > 0 ? (
            <>
              <p className="text-sm text-gray-600">
                Faltam <b className="text-gray-900">{r.comprar} produto(s)</b> na meta
              </p>
              {r.semEstoque > 0 && <p className="text-xs text-gray-500">{r.semEstoque} sem nenhum estoque</p>}
            </>
          ) : (
            <p className="text-sm font-semibold text-emerald-700">Todas as metas atingidas</p>
          )}
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-gray-400">Água</span>
          <span className="tabular-nums text-gray-600">
            <b className="text-gray-900">{num(r.litros)} L</b> de {num(r.litrosMeta)} L
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-sky-50">
          <span className="block h-full rounded-full bg-sky-500" style={{ width: `${pctAgua}%` }} />
        </div>
      </div>
    </CardApp>
  );
}

function CardCasa({ r }: { r: ResumoPortal['casa'] }) {
  if (!r) {
    return (
      <CardApp app="casa">
        <Vazio>App ainda não configurado no banco (migração 0020).</Vazio>
      </CardApp>
    );
  }
  const partes = [
    { n: r.vencidas, cor: 'bg-red-500', rotulo: 'Vencidas' },
    { n: r.breve, cor: 'bg-amber-400', rotulo: 'Em breve' },
    { n: r.emDia, cor: 'bg-emerald-500', rotulo: 'Em dia' },
    { n: r.semData, cor: 'bg-gray-300', rotulo: 'Sem data' },
  ];
  const total = partes.reduce((s, p) => s + p.n, 0);
  return (
    <CardApp app="casa" destaque={r.vencidas > 0 ? <Pilula tom="alerta">{r.vencidas} vencida(s)</Pilula> : total > 0 && r.breve === 0 && r.semData === 0 ? <Pilula tom="ok">Tudo em dia</Pilula> : undefined}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{total} manutenções ativas</p>
      <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
        {total > 0 && partes.filter((p) => p.n > 0).map((p) => <span key={p.rotulo} className={`h-full ${p.cor}`} style={{ width: `${(p.n / total) * 100}%` }} />)}
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        {partes.map((p) => (
          <div key={p.rotulo} className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[11px] text-gray-500">
              <span className={`h-2 w-2 shrink-0 rounded-full ${p.cor}`} />
              {p.rotulo}
            </p>
            <p className="text-lg font-bold tabular-nums text-gray-900">{p.n}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-gray-50 px-3.5 py-2.5">
        {r.proxima ? (
          <p className="truncate text-sm text-gray-700">
            <span className="mr-1.5 rounded-md bg-white px-1.5 py-0.5 text-xs font-bold tabular-nums text-amber-700 shadow-soft">{dataCurta(r.proxima.data)}</span>
            {r.proxima.titulo}
          </p>
        ) : (
          <Link href="/casa/manutencoes?status=semdata" className="text-sm font-medium text-amber-700 hover:underline">
            Definir as datas das manutenções →
          </Link>
        )}
      </div>
    </CardApp>
  );
}

/* ---------------------------- página ---------------------------- */
export function PortalInicio({ resumo }: { resumo: ResumoPortal }) {
  const { alertas } = resumo;
  const urgentes = alertas.filter((a) => a.nivel !== 'info').length;
  const frase =
    alertas.length === 0
      ? 'Tudo em dia na família. Bom momento para planejar.'
      : urgentes > 0
        ? `${urgentes} ${urgentes === 1 ? 'item pede' : 'itens pedem'} atenção hoje.`
        : `${alertas.length} ${alertas.length === 1 ? 'lembrete' : 'lembretes'} para quando der.`;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6">
      {/* Boas-vindas */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-7 text-white shadow-elevated sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/[0.06]" />
        <div aria-hidden className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white/75">{inicialMaiuscula(resumo.dataExtenso)}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {resumo.saudacao}, {resumo.nome}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/85">
              {urgentes > 0 ? <IconAlerta className="h-4 w-4 text-amber-200" /> : <IconCheck className="h-4 w-4 text-emerald-200" />}
              {frase}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[440px]">
            {[
              { rotulo: 'Saldo do mês', valor: resumo.orcamento ? moedaInteira(resumo.orcamento.saldo) : '—' },
              { rotulo: 'Reserva', valor: resumo.estoque ? `${Math.round(resumo.estoque.reserva)}%` : '—' },
              { rotulo: 'Casa em dia', valor: resumo.casa ? `${resumo.casa.emDia}/${resumo.casa.emDia + resumo.casa.vencidas + resumo.casa.breve + resumo.casa.semData}` : '—' },
            ].map((x) => (
              <div key={x.rotulo} className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-inset ring-white/15 backdrop-blur-sm sm:px-4">
                <dt className="truncate text-[11px] font-medium text-white/70">{x.rotulo}</dt>
                <dd className="truncate text-lg font-bold tabular-nums sm:text-xl">{x.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Atenção */}
      {alertas.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Pede atenção</h2>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {alertas.slice(0, 6).map((a, i) => {
              const t = TEMA[a.app];
              const n = NIVEL[a.nivel];
              const Icone = t.Icone;
              return (
                <Link
                  key={i}
                  href={a.href}
                  className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-soft transition hover:border-gray-200 hover:shadow-card"
                >
                  <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
                    <Icone className="h-4 w-4" />
                    <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${n.ponto}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">{a.texto}</span>
                    <span className="block truncate text-xs text-gray-500">
                      {t.curto}
                      {a.detalhe ? ` · ${a.detalhe}` : ''}
                    </span>
                  </span>
                  <IconChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Apps */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Seus apps</h2>
          <p className="hidden text-xs text-gray-400 sm:block">Login, família e dados compartilhados entre todos</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <CardOrcamento r={resumo.orcamento} mes={resumo.mesExtenso} />
          <CardEstoque r={resumo.estoque} />
          <CardCasa r={resumo.casa} />
        </div>
      </section>
    </div>
  );
}
