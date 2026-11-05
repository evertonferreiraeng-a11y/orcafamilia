// Exportação de relatórios: Excel (.xlsx real, sem bibliotecas), CSV e impressão/PDF.
import { fmtMoeda, fmtQtd, r2, soma, type Relatorio } from '@/lib/estoque/calc';

function crc32(u8: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) {
    c ^= u8[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** ZIP sem compressão (suficiente para o formato .xlsx). */
function zipStore(files: { name: string; data: string }[], mime: string): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const cd = soma(central, (a) => a.length);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cd, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)] as BlobPart[], { type: mime });
}

const xmlEsc = (s: unknown) =>
  String(s ?? '')
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const colRef = (i: number) => {
  let s = '';
  let n = i + 1;
  while (n) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export function relatorioXlsx(titulo: string, r: Relatorio): Blob {
  const str = (row: number, i: number, v: unknown, st?: number) =>
    `<c r="${colRef(i)}${row}" t="inlineStr"${st ? ` s="${st}"` : ''}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  const cell = (row: number, i: number, v: unknown, tipo?: string, st?: number) =>
    typeof v === 'number' && Number.isFinite(v) && (tipo === 'num' || tipo === 'moeda')
      ? `<c r="${colRef(i)}${row}" s="${tipo === 'moeda' ? 2 : st || 0}"><v>${v}</v></c>`
      : str(row, i, v ?? '', st);
  let R = 1;
  let xml = `<row r="1">${str(1, 0, titulo, 1)}</row>`;
  R++;
  xml += `<row r="${R}">${str(R, 0, `Gerado em ${new Date().toLocaleString('pt-BR')}${r.sub || ''}`)}</row>`;
  R += 2;
  xml += `<row r="${R}">${r.colunas.map((c, i) => str(R, i, c.titulo, 1)).join('')}</row>`;
  for (const linha of r.linhas) {
    R++;
    xml += `<row r="${R}">${r.colunas.map((c, i) => cell(R, i, linha[c.chave], c.tipo)).join('')}</row>`;
  }
  if (r.totais && r.linhas.length) {
    R++;
    xml += `<row r="${R}">${r.colunas
      .map((c, i) => (i === 0 ? str(R, i, 'Total', 1) : r.totais!.includes(c.chave) ? cell(R, i, r2(soma(r.linhas, (z) => Number(z[c.chave]) || 0)), c.tipo, 1) : ''))
      .join('')}</row>`;
  }
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${r.colunas
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.tipo ? 16 : 24}" customWidth="1"/>`)
    .join('')}</cols><sheetData>${xml}</sheetData></worksheet>`;
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zipStore(
    [
      { name: '[Content_Types].xml', data: `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
      { name: '_rels/.rels', data: `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', data: `${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', data: `${H}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>` },
      { name: 'xl/worksheets/sheet1.xml', data: sheet },
    ],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

export function relatorioCsv(r: Relatorio): Blob {
  const q = (v: unknown) => {
    const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [r.colunas.map((c) => q(c.titulo)).join(';'), ...r.linhas.map((l) => r.colunas.map((c) => q(l[c.chave])).join(';'))];
  return new Blob([`﻿${linhas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
}

export function formatarCelula(v: unknown, tipo?: 'num' | 'moeda'): string {
  if (v === null || v === undefined || v === '') return '—';
  if (tipo === 'moeda') return fmtMoeda(Number(v));
  if (tipo === 'num') return fmtQtd(Number(v));
  return String(v);
}

export function tabelaHtml(r: Relatorio): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
  const totais = r.totais ?? [];
  return `<table><thead><tr>${r.colunas.map((c) => `<th class="${c.tipo ? 'n' : ''}">${esc(c.titulo)}</th>`).join('')}</tr></thead><tbody>${r.linhas
    .map((l) => `<tr>${r.colunas.map((c) => `<td class="${c.tipo ? 'n' : ''}">${esc(formatarCelula(l[c.chave], c.tipo))}</td>`).join('')}</tr>`)
    .join('')}</tbody>${
    totais.length && r.linhas.length
      ? `<tfoot><tr>${r.colunas
          .map((c, i) => `<td class="${c.tipo ? 'n' : ''}">${i === 0 ? `Total (${r.linhas.length})` : totais.includes(c.chave) ? esc(formatarCelula(soma(r.linhas, (z) => Number(z[c.chave]) || 0), c.tipo)) : ''}</td>`)
          .join('')}</tr></tfoot>`
      : ''
  }</table>`;
}

/** Imprime (ou salva como PDF) usando um iframe oculto — não é bloqueado por pop-up. */
export function imprimirHtml(titulo: string, sub: string, corpo: string) {
  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(fr);
  const d = fr.contentDocument;
  if (!d || !fr.contentWindow) return;
  d.open();
  d.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo}</title><style>@page{size:A4 landscape;margin:12mm}body{font:11px/1.4 system-ui,Arial,sans-serif;color:#1a1f2b}h1{font-size:16px;margin:0 0 2px}p{margin:0 0 12px;color:#667085}table{width:100%;border-collapse:collapse}th{background:#eef2f7;text-align:left;font-size:10px;text-transform:uppercase;padding:5px 6px;border-bottom:1px solid #cfd6df}td{padding:4px 6px;border-bottom:1px solid #e6eaee}.n{text-align:right;white-space:nowrap}tfoot td{font-weight:700;border-top:1px solid #999}</style></head><body><h1>Gestão de Estoque Familiar – Reserva 180 dias</h1><p><b>${titulo}</b> · gerado em ${new Date().toLocaleString('pt-BR')}${sub}</p>${corpo}</body></html>`
  );
  d.close();
  setTimeout(() => {
    fr.contentWindow?.focus();
    fr.contentWindow?.print();
    setTimeout(() => fr.remove(), 4000);
  }, 250);
}

export function baixarArquivo(nome: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
}

export const nomeArquivo = (t: string) =>
  `${t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;
