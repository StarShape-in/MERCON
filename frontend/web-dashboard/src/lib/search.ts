/**
 * Search normalisation for the lists that are filtered in the browser.
 *
 * A search bar has to behave the way people actually type: any case, extra
 * spaces, words in any order, accents or not, and punctuation that may not
 * match how the value is stored ("abc1234" should still find plate "ABC-1234").
 *
 * The rules:
 *  - the query is split into words; a row matches when EVERY word is found in
 *    at least ONE of the values passed in (AND across words, OR across fields),
 *    so "john riyadh" finds John's trip to Riyadh and word order never matters;
 *  - case, accents and Arabic-Indic digits are folded away before comparing;
 *  - separators (spaces, dashes, dots, slashes…) are stripped as a fallback
 *    comparison, so "abc1234", "abc-1234" and "ABC 1234" all find "ABC-1234".
 *
 * The server-side twin of this — for lists the API filters and paginates —
 * lives in `backend/api-server/src/utils/search.ts`.
 */

export type SearchableValue = string | number | null | undefined;

/** Combining marks left behind by NFKD (é -> e + ´). */
const DIACRITICS = /[\u0300-\u036f]/g;
/** Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits. */
const ARABIC_INDIC_DIGITS = /[\u0660-\u0669\u06f0-\u06f9]/g;
/** Punctuation people add or drop inside IDs, plates and phone numbers. */
const SEPARATORS = /[\s\-_./\\,()#&'"+:;|]+/g;

const toAsciiDigit = (digit: string): string => {
  const code = digit.charCodeAt(0);
  const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
  return String(code - base);
};

/** Lowercase, strip accents, normalise digits — the form everything is compared in. */
export function normalizeForSearch(value: SearchableValue): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .replace(ARABIC_INDIC_DIGITS, toAsciiDigit)
    .toLowerCase()
    .trim();
}

/** Normalised text with every separator removed: "ABC-1234" -> "abc1234". */
export function compactForSearch(value: SearchableValue): string {
  return normalizeForSearch(value).replace(SEPARATORS, '');
}

/**
 * Does `query` match any of `values`?
 * An empty query matches everything, which is what a cleared search bar means.
 */
export function matchesSearch(query: string, values: SearchableValue[]): boolean {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const haystack = values.map(normalizeForSearch).filter(Boolean);
  if (haystack.length === 0) return false;
  const compactHaystack = haystack.map((text) => text.replace(SEPARATORS, '')).filter(Boolean);

  return words.every((word) => {
    if (haystack.some((text) => text.includes(word))) return true;
    // Fallback for punctuation the user typed differently from how it is stored.
    const compactWord = word.replace(SEPARATORS, '');
    return compactWord !== '' && compactHaystack.some((text) => text.includes(compactWord));
  });
}
