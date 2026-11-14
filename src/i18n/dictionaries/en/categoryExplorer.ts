import type { Dictionary } from '../../dictionary';

export const categoryExplorer = {
  emptyTitle: "We don't have a solution for that yet.",
  emptyDesc: 'The catalog is growing. Try other words or browse a category.',
  briefCta: 'Tell us what you need',
  briefNote: 'Your search goes in the message. A person on the shwcs team reads it.',
  briefCardTitle: 'Tell us what you need',
  briefCardEmpty:
    'No {category} projects are published yet. Write to us about what you are looking for: a person on the shwcs team reads it and helps you find it.',
  briefCardFew:
    "Don't see what you need in {category}? Tell us: a person on the shwcs team reads it.",
  briefPrefill: 'I am looking for a {category} solution:',
  briefCardCta: 'Describe what you need',
  solutionFor: 'for',
  clearBtn: 'Clear search',
  option: 'option',
  options: 'options',
  solution: 'solution',
  solutions: 'solutions',
  realResultsLabel: 'Real catalog results',
  realSolutionsCount: 'real solution',
  realSolutionsCountPlural: 'real solutions',
  fictionalNotice: 'The examples are fictional · They are not available providers',
  seeSolution: 'See solution',
  seeExample: 'See example',
  byLabel: 'By',
  previewTitle: 'Fictional product · Preview',
  previewNoticeReal:
    "Description based on the provider's site. Check there for scope, availability and terms. Its inclusion does not imply independent certification by shwcs.",
  previewNoticeMock:
    "This example shows how catalog solutions will be presented. It doesn't represent an available app or a real founder yet.",
  viewFullBtn: 'View full profile',
  visitSiteBtn: 'Visit official site',
  keepExploringBtn: 'Keep exploring',
  sectionLabel: 'Explore solutions by category',
  categoriesLabel: 'Categories',
  searchResultsLabel: 'Search results',
  categoryResultsLabel: '{category} solutions',
  coverAlt: 'Cover image for {name}',
  closePreview: 'Close preview',
  opensInNewTab: '(opens in a new tab)',
} as const satisfies Dictionary['categoryExplorer'];
