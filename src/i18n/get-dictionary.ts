import type { Locale } from "./config";

const dictionaries = {
  en: () => import("./dictionaries/en").then((module) => module.en),
  es: () => import("./dictionaries/es").then((module) => module.es),
};

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale]?.() ?? dictionaries.es();
};
