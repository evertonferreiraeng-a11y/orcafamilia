import { Fragment } from 'react';

/** Negrito (**x**) e itálico (*x*) dentro de uma linha. */
function inline(texto: string, chave: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={`${chave}-${i}`}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={`${chave}-${i}`}>{p.slice(1, -1)}</em>;
    return <Fragment key={`${chave}-${i}`}>{p}</Fragment>;
  });
}

/** Renderizador simples de markdown para as respostas do mentor (títulos, listas, negrito, parágrafos). */
export function TextoFormatado({ texto }: { texto: string }) {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const blocos: React.ReactNode[] = [];
  let lista = null as { tipo: 'ul' | 'ol'; itens: string[] } | null;
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      const k = `p${blocos.length}`;
      blocos.push(
        <p key={k} className="leading-relaxed">
          {paragrafo.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {inline(l, `${k}-${i}`)}
            </Fragment>
          ))}
        </p>
      );
      paragrafo = [];
    }
  };
  const fecharLista = () => {
    if (lista) {
      const k = `l${blocos.length}`;
      const Tag = lista.tipo;
      blocos.push(
        <Tag key={k} className={Tag === 'ul' ? 'list-disc space-y-1 pl-5' : 'list-decimal space-y-1 pl-5'}>
          {lista.itens.map((it, i) => (
            <li key={i} className="leading-relaxed">
              {inline(it, `${k}-${i}`)}
            </li>
          ))}
        </Tag>
      );
      lista = null;
    }
  };

  for (const bruta of linhas) {
    const l = bruta.trimEnd();
    const titulo = l.match(/^(#{1,4})\s+(.*)$/);
    const ul = l.match(/^\s*[-•*]\s+(.*)$/);
    const ol = l.match(/^\s*\d+[.)]\s+(.*)$/);
    if (!l.trim()) {
      fecharParagrafo();
      fecharLista();
    } else if (titulo) {
      fecharParagrafo();
      fecharLista();
      blocos.push(
        <p key={`h${blocos.length}`} className="pt-1 font-semibold text-gray-900">
          {inline(titulo[2], `h${blocos.length}`)}
        </p>
      );
    } else if (/^-{3,}$/.test(l.trim())) {
      fecharParagrafo();
      fecharLista();
      blocos.push(<hr key={`hr${blocos.length}`} className="border-gray-200" />);
    } else if (ul || ol) {
      fecharParagrafo();
      const tipo = ul ? 'ul' : 'ol';
      if (!lista || lista.tipo !== tipo) {
        fecharLista();
        lista = { tipo, itens: [] };
      }
      lista.itens.push((ul ?? ol)![1]);
    } else {
      fecharLista();
      paragrafo.push(l);
    }
  }
  fecharParagrafo();
  fecharLista();

  return <div className="space-y-2.5 text-sm text-gray-800">{blocos}</div>;
}
