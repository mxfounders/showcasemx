import type { Locale } from "./config";

const dictionaries = {
  en: () => import("./dictionaries/en").then((module) => module.en as any),
  es: () => import("./dictionaries/es").then((module) => module.es as any),
};

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale]?.() ?? dictionaries.es();
};
