import type { Dictionary } from '../../dictionary';

export const meta = {
  site: {
    title: 'shwcs | Projects for your business',
    description:
      'Discover software, agencies and services for your business. See what they solve and connect with the people who build them.',
    imageAlt: 'shwcs — Explore projects, discover tools and connect with the people who run them.',
    ogLocale: 'en_US',
  },
  solution: {
    fallbackDescription: 'Discover curated solutions for your business.',
  },
  community: {
    title: 'Community lists | shwcs',
    description: 'Discover selections of software, agencies and services shared by the community.',
  },
  communityList: {
    title: 'Community list | shwcs',
  },
} as const satisfies Dictionary['meta'];
