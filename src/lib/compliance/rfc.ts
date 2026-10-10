/**
 * Mexico's RFC (Registro Federal de Contribuyentes), shared by billing (the buyer's tax
 * data) and compliance (the vendor's declared identity).
 */

/** 3 letters (persona moral) or 4 (física), a YYMMDD date and a 3-character homoclave. */
const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

/** Generic RFCs (público en general, extranjero) identify no one. */
const genericRfcs = new Set(['XAXX010101000', 'XEXX010101000']);

/** Upper-cases and drops spaces and dashes, the way people copy an RFC from a PDF. */
export function normalizeRfc(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[\s-]/g, '') : '';
}

export function isRfc(value: string) {
  return rfcPattern.test(value);
}

export function isGenericRfc(value: string) {
  return genericRfcs.has(value);
}
