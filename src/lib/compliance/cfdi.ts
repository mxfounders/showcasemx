import { isRfc, normalizeRfc } from './rfc';

/**
 * Status of a Mexican CFDI (electronic invoice) through the SAT's public consultation
 * service: the same check anyone can run at verificacfdi.facturaelectronica.sat.gob.mx.
 * Used to back a review with a real purchase. Only the outcome is kept; the receipt's
 * data is sent to the SAT and never stored (docs/reviews.md).
 */
const defaultUrl = 'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc';

export type CfdiReceipt = { uuid: string; issuer: string; receiver: string; total: number };
export type CfdiStatus = 'vigente' | 'cancelado' | 'no_encontrado';

const uuidPattern = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;

/** Validates what a person copies from their invoice. Returns the field that is wrong. */
export function readCfdiReceipt(
  input: unknown,
): { ok: true; receipt: CfdiReceipt } | { ok: false; field: keyof CfdiReceipt } {
  const body = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const uuid = typeof body.uuid === 'string' ? body.uuid.trim().toUpperCase() : '';
  if (!uuidPattern.test(uuid)) return { ok: false, field: 'uuid' };
  const issuer = normalizeRfc(body.issuer);
  if (!isRfc(issuer)) return { ok: false, field: 'issuer' };
  const receiver = normalizeRfc(body.receiver);
  if (!isRfc(receiver)) return { ok: false, field: 'receiver' };
  const total =
    typeof body.total === 'number'
      ? body.total
      : typeof body.total === 'string'
        ? Number(body.total.replace(/[\s,$]/g, ''))
        : NaN;
  if (!Number.isFinite(total) || total <= 0 || total > 1e12) return { ok: false, field: 'total' };
  return { ok: true, receipt: { uuid, issuer, receiver, total } };
}

/**
 * The query string the SAT expects. Its total format changed between CFDI versions:
 * 3.3/4.0 drop insignificant zeros but keep at least one decimal (`100.0`, `1566.5`);
 * 3.2 pads to 10 integer digits and 6 decimals (`0000000100.000000`). A receipt is
 * looked up with both and the first answer that finds it wins.
 */
export function cfdiExpressions({ uuid, issuer, receiver, total }: CfdiReceipt) {
  const escape = (value: string) => value.replace(/&/g, '&amp;');
  const current = total.toFixed(6).replace(/0+$/, '').replace(/\.$/, '.0');
  const legacy = total.toFixed(6).padStart(17, '0');
  return [current, legacy].map(
    tt => `?re=${escape(issuer)}&rr=${escape(receiver)}&tt=${tt}&id=${uuid}`,
  );
}

/** Reads `<a:Estado>` from the SOAP answer: Vigente, Cancelado or No Encontrado. */
export function parseCfdiResponse(xml: string): CfdiStatus | null {
  const estado = xml
    .match(/<(?:\w+:)?Estado>([^<]*)<\/(?:\w+:)?Estado>/)?.[1]
    ?.trim()
    .toLowerCase();
  if (estado === 'vigente') return 'vigente';
  if (estado === 'cancelado') return 'cancelado';
  if (estado === 'no encontrado') return 'no_encontrado';
  return null;
}

async function consult(expression: string) {
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/"><soap:Body><tem:Consulta><tem:expresionImpresa><![CDATA[${expression}]]></tem:expresionImpresa></tem:Consulta></soap:Body></soap:Envelope>`;
  const response = await fetch(process.env.SAT_CFDI_URL || defaultUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'http://tempuri.org/IConsultaCFDIService/Consulta',
    },
    body: envelope,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('SAT_CFDI_UNAVAILABLE');
  const status = parseCfdiResponse(await response.text());
  if (!status) throw new Error('SAT_CFDI_UNREADABLE');
  return status;
}

/** Throws when the SAT cannot answer; never guesses a status. */
export async function cfdiStatus(receipt: CfdiReceipt): Promise<CfdiStatus> {
  let last: CfdiStatus = 'no_encontrado';
  for (const expression of cfdiExpressions(receipt)) {
    last = await consult(expression);
    if (last !== 'no_encontrado') return last;
  }
  return last;
}
