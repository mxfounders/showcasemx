import type { Dictionary } from '../../dictionary';

export const recognition = {
  verified: 'Verified by shwcs',
  verifiedShort: 'Verified',
  verifiedOn: 'Verified on {date}',
  verifiedExplainer:
    'The shwcs team checked that the site works and belongs to the project, that the product exists and does what this listing says, and that whoever registered it represents it. It doesn’t certify quality or results.',
  howItWorks: 'How we verify and recognize',
  weeklyAll: '#{rank} of the week',
  weeklyIn: '#{rank} of the week in {category}',
  editorial: 'shwcs pick',
  weeklyExplainer:
    'Place earned with that week’s real activity: likes, saves, comments and reviews from verified accounts outside the project’s team.',
  editorialExplainer: 'Chosen by the shwcs team. Why:',
  awardsLabel: 'Recognition',
  sealButton: '{name}: see what it means',
  badge: {
    featured: 'Listed on',
    verified: 'Verified by',
    editorial: 'Team pick',
    title: '{name} on shwcs',
    seal: {
      featured: 'Listed',
      featuredBy: 'In the catalog',
      verified: 'Verified',
      verifiedBy: 'By the team',
      weekly: 'Of the week',
      overall: 'Overall',
      editorial: 'Pick',
      editorialBy: 'By the team',
      since: 'Since {date}',
    },
  },
  founder: {
    title: 'Verification and badges',
    verified: 'Verified by the team on {date}.',
    pending: 'Not verified yet. The team reviews it; you don’t have to do anything.',
    moved: 'You changed sites: verification will be reviewed again.',
    verificationLink: 'What we review',
    awards: 'Recognition',
    noAwards:
      'None yet. Every week we recognize the projects with the most real activity in their category.',
    badgesTitle: 'Badges for your site',
    badgesHint:
      'Put one on your site and link to your listing. It updates itself: if a recognition is withdrawn, it stops showing.',
    kinds: { featured: 'Listed', verified: 'Verified', award: 'Recognition' },
    layoutLabel: 'Format',
    card: 'Horizontal',
    sealLayout: 'Seal',
    themeLabel: 'Theme',
    light: 'Light',
    dark: 'Dark',
    codeLabel: 'Code to paste on your site',
    copy: 'Copy code',
    copied: 'Copied',
    copyFailed: 'We couldn’t copy it. Select the code and copy it.',
    previewAlt: 'Badge preview',
  },
  criteria: {
    title: 'Verification and recognition',
    intro:
      'Three signals that can only be earned: the team decides verification, and recognition comes from real activity or an explained choice. None is paid for; all of them are dated and can be withdrawn.',
    note: 'Top of the week is computed every Monday, Mexico City time: likes ×1, saves ×2, comments ×3 and reviews by their verification, only from accounts with a verified email and never from the project’s own team. Each project needs 3 different accounts and each ranking 3 projects; one place is awarded for every two competing, up to three.',
    verified: {
      label: 'Verified by shwcs',
      tag: 'Team',
      desc: 'We check that the site belongs to the project, that the product does what the listing says and that whoever registered it represents it. Tied to the reviewed domain.',
    },
    weekly: {
      label: 'Top of the week',
      tag: 'Weekly',
      desc: 'Up to three places overall and per category, from the week’s real activity. Without enough competition there is no award.',
    },
    editorial: {
      label: 'shwcs pick',
      tag: 'Monthly',
      desc: 'Up to three projects a month, chosen by the team with the reason in view. Nobody can pick their own project.',
    },
  },
} as const satisfies Dictionary['recognition'];
