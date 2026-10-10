import type { Dictionary } from '../../dictionary';

export const project = {
  metaTitle: 'Projects worth knowing',
  heroLine1: 'Finding is easy<br />Choosing right changes everything',
  heroDesc:
    'shwcs presents software, agencies, and services with the context a company needs to understand them, compare them, and start a useful conversation.',
  exploreBtn: 'Explore projects',
  card1Title: 'Understand before you reach out',
  card1Desc:
    'Explore by need, save options, create lists, and compare the context of each project before opening a conversation.',
  card1Btn: 'Discover projects',
  card2Title: 'Present something that is understood',
  card2Desc:
    'Explain the problem, the scope, and the people behind it. Keep information up to date and respond with context to those who want to know you.',
  card2Btn: 'Apply a project',
  problemTitle: "More options don't always mean better decisions.",
  problemDesc:
    'We built shwcs to organize that search around specific questions: what it solves, who it works for, what limits it has, and who is behind it. The catalog is the starting point; the decision remains yours.',
} as const satisfies Dictionary['project'];
