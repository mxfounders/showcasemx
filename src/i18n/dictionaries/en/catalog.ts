import type { Dictionary } from '../../dictionary';

export const catalog = {
  filters: {
    capability: 'What it does',
    industry: 'Industry',
    companySize: 'Company size',
    integrations: 'Integrates with',
    priceBand: 'Price range',
    setupTime: 'Setup time',
    compliance: 'Compliance',
    format: 'Format',
    useCase: 'Use case',
  },
  moreFilters: 'More filters',
  clear: 'Clear',
  any: 'Any',
  sort: {
    label: 'Sort by',
    popular: 'Most popular',
    newest: 'Newest',
    az: 'Name A-Z',
  },
  showingPrefix: 'Showing',
  solutionSingular: 'solution',
  solutionPlural: 'solutions',
  noResultsTitle: 'No solutions found',
  noResultsDesc: 'Try removing some filters or browse related categories.',
  alsoUsefulTitle: 'Might also fit',
  alsoUsefulDesc:
    "They didn't declare everything you filtered by, but their category and description suggest a fit. Confirm with each project.",
  reasonIndustry: "Didn't declare that industry",
  reasonCapability: "Didn't declare that capability",
  reasonCompanySize: "Didn't declare a company size",
  ratingLabel: '{rating} out of 5 stars, {count} reviews',
  viewSolution: 'View solution',
} as const satisfies Dictionary['catalog'];
