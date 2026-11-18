import type { Dictionary } from '../../dictionary';

export const categoryExplorer = {
  emptyTitle: "We don't have a solution for that yet.",
  emptyDesc: 'The catalog is growing. Try other words or browse a category.',
  briefCta: 'Post your need',
  briefNote:
    'Your search goes into the need. The projects that fit send you a proposal and a person on the shwcs team reads it.',
  briefCardTitle: 'Post your need',
  briefCardEmpty:
    'No {category} projects are published yet. Describe what you are looking for: a person on the shwcs team reads it and, when one that fits is published, it sends you a proposal.',
  briefCardFew:
    "Don't see what you need in {category}? Post your need and the projects that fit send you a proposal.",
  availableSpace: 'Available space',
  applySpaceTitle: 'Your solution could be here',
  applySpaceBtn: 'Apply in',
  applySpaceLabel: 'Apply with a solution for {category}, slot {slot}',
  availableSlotsCount: 'available slot',
  availableSlotsCountPlural: 'available slots',
  briefCardCta: 'Post my need',
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
