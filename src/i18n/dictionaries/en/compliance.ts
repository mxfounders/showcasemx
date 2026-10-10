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
    pending: "It declared its RFC; the lookup on the SAT's 69-B list is pending.",
    declaredOnly:
      "It declared its tax ID from {country}. We don't check that country's registries yet.",
    source:
      "RFC declared by the vendor; we don't publish it. SAT list with data as of {date}, checked on {checked}. It is a public lookup, not a certification.",
    sourceNoDate:
      "RFC declared by the vendor; we don't publish it. It is a public lookup, not a certification.",
  },
  owner: {
    title: 'Tax identity',
    desc: 'Declare the tax ID you invoice with. It stays private: your listing only shows the result of checking it against public registries (in Mexico, the SAT 69-B list), and it lets your customers prove their purchase in their reviews.',
    country: 'Country',
    taxId: 'Tax ID',
    taxIdMx: 'RFC',
    save: 'Save',
    saving: 'Saving…',
    remove: 'Remove',
    removing: 'Removing…',
    saved: 'Saved. The result is already on your public listing.',
    removed: 'Removed. Your listing no longer shows registry results.',
    current: 'Current result',
    public: 'This is what a buyer sees:',
  },
  errors: {
    foreignOrigin: 'Submit the form from shwcs.',
    signIn: 'Sign in to continue.',
    invalidRequest: "We couldn't process the request.",
    rateLimited: 'Too many changes in a row. Wait a few minutes.',
    notOwner: 'Only the publisher of the solution can declare its tax identity.',
    country: 'Choose a country from the list.',
    taxId: 'Enter the tax ID (3 to 40 letters or digits).',
    rfc: 'Enter a valid RFC: 12 characters (company) or 13 (individual).',
    genericRfc: "A generic RFC doesn't identify a vendor.",
    saveFailed: "We couldn't save. Try again.",
  },
} as const satisfies Dictionary['compliance'];
