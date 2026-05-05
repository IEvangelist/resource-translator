/**
 * Internal representation of a JSON localization file. Values may be any JSON
 * type — only string values are sent through Azure for translation; non-string
 * primitives (numbers, booleans, null) and arrays are preserved verbatim so
 * round-trips through the action don't drop or re-shape them.
 */
export interface JsonFile {
  [key: string]: unknown;
}
