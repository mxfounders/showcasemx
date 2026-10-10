import type { es } from './dictionaries/es';

/** Literal strings and tuples from `as const` widened, so other locales can satisfy the shape. */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly Widen<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: Widen<T[Key]> }
      : T;

/** Spanish is the source locale: every other dictionary must match its shape exactly. */
export type Dictionary = Widen<typeof es>;
