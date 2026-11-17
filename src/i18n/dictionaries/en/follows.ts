import type { Dictionary } from '../../dictionary';

export const follows = {
  actions: {
    followList: 'Follow list',
    followingList: 'Following this list',
    followCurator: 'Follow {name}',
    followingCurator: 'Following {name}',
    hint: 'We tell you in your account when the list adds projects or {name} publishes another. Nobody sees who follows whom.',
    signIn: 'Sign in',
    signInSuffix: 'to follow lists and curators.',
    error: 'We couldn’t save the change. Please try again.',
  },
  page: {
    listsTitle: 'Lists you follow',
    listsEmpty: 'You don’t follow any list yet. On a public list, choose «Follow list».',
    curatorsTitle: 'Curators you follow',
    curatorsEmpty: 'You don’t follow any curator yet. On a public list, choose «Follow…».',
    curatorListsSingular: '1 public list',
    curatorListsPlural: '{count} public lists',
    curatorNoLists: 'No public lists for now',
    unfollow: 'Unfollow',
    unfollowing: 'One moment…',
    followersTitle: 'Who follows you',
    followersBody: 'Numbers only: we never show who follows whom.',
    curatorFollowersSingular: '1 person follows your lists signed «{name}»',
    curatorFollowersPlural: '{count} people follow your lists signed «{name}»',
    listFollowersSingular: '1 person follows «{name}»',
    listFollowersPlural: '{count} people follow «{name}»',
    noFollowers: 'Nobody follows your public lists yet.',
    emailNote:
      'Notices arrive in your account. By email, only a weekly summary if you turn on community emails in {link}.',
    preferences: 'Notification preferences',
  },
  errors: {
    foreignOrigin: 'Use shwcs to follow lists.',
    signIn: 'Sign in to follow lists and curators.',
    invalid: 'Invalid request.',
    own: 'You can’t follow your own lists.',
    notPublic: 'This list is no longer public.',
    rateLimited: 'Too many changes. Please try again later.',
    unavailable: 'We couldn’t save the change. Please try again.',
  },
} as const satisfies Dictionary['follows'];
