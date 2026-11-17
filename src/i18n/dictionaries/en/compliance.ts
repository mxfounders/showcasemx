import type { Dictionary } from '../../dictionary';

export const compliance = {
  public: {
    clear: "Not on the SAT's 69-B list (Mexico).",
    presunto:
      'Listed as "presumed" on the SAT\'s 69-B list: the authority presumes it invoices non-existent operations, and the process is still open.',
    definitivo:
      'Listed as "definitive" on the SAT\'s 69-B list: its invoices have no tax effect for whoever receives them.',
    desvirtuado:
      'Listed on the SAT\'s 69-B list as "disproved": it showed that its operations existed.',
    sentencia_favorable:
      'Listed on the SAT\'s 69-B list with a "favorable ruling": a court decided in its favor.',
    pending: "We have its RFC; the lookup on the SAT's 69-B list is pending.",
    declaredOnly:
      "We have its tax ID from {country}. We don't check that country's registries yet.",
    source:
      "RFC recorded by the shwcs team when reviewing the project; we don't publish it. SAT list with data as of {date}, checked on {checked}. It is a public lookup, not a certification.",
    sourceNoDate:
      "RFC recorded by the shwcs team when reviewing the project; we don't publish it. It is a public lookup, not a certification.",
  },
} as const satisfies Dictionary['compliance'];
