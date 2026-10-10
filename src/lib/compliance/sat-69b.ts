import { isRfc, normalizeRfc } from './rfc';

/**
 * Mexico's article 69-B list (SAT): taxpayers presumed to invoice simulated operations.
 * A buyer who deducts an invoice from a "definitivo" issuer loses the deduction, so a
 * vendor's status on it is real buying information. Pure parsing lives here; the
 * download and import are in ./server.ts.
 */
export const sat69bUrl = 'http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv';

export const sat69bSituations = [
  'presunto',
  'definitivo',
  'desvirtuado',
  'sentencia_favorable',
] as const;
export type Sat69bSituation = (typeof sat69bSituations)[number];

const situationByLabel: Record<string, Sat69bSituation> = {
  presunto: 'presunto',
  definitivo: 'definitivo',
  desvirtuado: 'desvirtuado',
  'sentencia favorable': 'sentencia_favorable',
};

const months: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

/** RFC-style CSV: commas, double quotes around fields that contain them, "" escapes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

const normalizeLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

/**
 * Reads the published file: a title line with the cut-off date ("Información
 * actualizada al 31 de diciembre de 2025"), a header row, then one row per taxpayer.
 * An RFC listed twice keeps its last row. Unknown situations are counted, not guessed.
 */
export function parseSat69b(text: string) {
  const rows = parseCsv(text);
  const title = rows[0]?.[0] ?? '';
  const date = normalizeLabel(title).match(/actualizada al (\d{1,2}) de ([a-z]+) de (\d{4})/);
  const sourceDate =
    date && months[date[2]] ? `${date[3]}-${months[date[2]]}-${date[1].padStart(2, '0')}` : null;

  const header = rows.findIndex(row => normalizeLabel(row[1] ?? '') === 'rfc');
  if (header < 0) throw new Error('SAT_69B_FORMAT');
  const situationColumn = rows[header].findIndex(cell =>
    normalizeLabel(cell).startsWith('situacion'),
  );
  if (situationColumn < 0) throw new Error('SAT_69B_FORMAT');

  const byRfc = new Map<string, Sat69bSituation>();
  let skipped = 0;
  for (const row of rows.slice(header + 1)) {
    const rfc = normalizeRfc(row[1]);
    const situation = situationByLabel[normalizeLabel(row[situationColumn] ?? '')];
    if (!isRfc(rfc) || !situation) {
      if (row.some(cell => cell.trim())) skipped++;
      continue;
    }
    byRfc.set(rfc, situation);
  }
  return {
    sourceDate,
    entries: [...byRfc].map(([rfc, situation]) => ({ rfc, situation })),
    skipped,
  };
}
