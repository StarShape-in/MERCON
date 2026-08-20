/**
 * Search normalisation for list endpoints.
 *
 * A search bar has to behave the way people actually type: any case, extra
 * spaces, words in any order, and punctuation that may not match how the value
 * was stored ("abc1234" should still find plate "ABC-1234").
 *
 * The rules:
 *  - the query is split into tokens on whitespace;
 *  - a row matches when EVERY token matches at least ONE of the listed fields
 *    (AND across tokens, OR across fields) — so "john riyadh" finds John's trip
 *    to Riyadh, and "smith john" works as well as "john smith";
 *  - matching is case-insensitive and substring-based;
 *  - punctuation is bridged by also splitting a token at non-alphanumeric
 *    characters and at letter/digit boundaries, then requiring every chunk in
 *    the SAME field. Postgres can't strip punctuation out of the stored value
 *    through Prisma, so this is the closest equivalent: "abc1234", "abc-1234"
 *    and "ABC 1234" all find a plate stored as "ABC-1234".
 *
 * The browser-side twin of this lives in the dashboard (`lib/search.ts`) and the
 * mobile app (`lib/search.ts`) for lists that are filtered client-side.
 */

/** Guard against pathological queries turning into hundreds of OR branches. */
const MAX_TOKENS = 8;

/**
 * Only split a token into chunks when it is long enough for the chunks to mean
 * something — splitting "a1" into "a" + "1" would match almost any row.
 */
const MIN_CHUNK_SPLIT_LENGTH = 4;

/** Field path: a scalar column, or a relation path ('customer.name'). Use `[]` for a to-many relation ('stops[].location_name'). */
export type SearchFieldPath = string;

export interface SearchOptions {
  /**
   * Extra match conditions for a single token, e.g. matching an enum column
   * against the word the user typed. Merged into that token's OR branch.
   */
  extraClausesForToken?: (token: string) => any[];
}

const ROUTE_CONNECTOR_WORDS = new Set(['to', 'from', 'via', 'ret', 'return', '-', '->', '>']);

/** Split a raw query into normalised tokens. */
export function searchTokens(search: unknown): string[] {
  if (typeof search !== 'string') return [];
  const rawTokens = search.trim().split(/\s+/).filter(Boolean);
  const filtered = rawTokens.filter((tok) => !ROUTE_CONNECTOR_WORDS.has(tok.toLowerCase()));
  const finalTokens = filtered.length > 0 ? filtered : rawTokens;
  return finalTokens.slice(0, MAX_TOKENS);
}

/**
 * Split a token at punctuation and at letter/digit boundaries.
 * "abc1234" -> ["abc", "1234"], "trp-0001" -> ["trp", "0001"], "john" -> [].
 * Returns an empty array when the token isn't worth splitting.
 */
function chunkToken(token: string): string[] {
  const compact = token.replace(/[^a-z0-9]/gi, '');
  if (compact.length < MIN_CHUNK_SPLIT_LENGTH) return [];
  const chunks = token.match(/[a-z]+|[0-9]+/gi) ?? [];
  return chunks.length > 1 ? chunks : [];
}

/** Wrap a leaf condition in its relation path: ['customer'] -> { customer: <leaf> }. */
function wrapInRelations(prefix: string[], leaf: any): any {
  let node = leaf;
  for (let i = prefix.length - 1; i >= 0; i--) {
    const segment = prefix[i];
    node = segment.endsWith('[]')
      ? { [segment.slice(0, -2)]: { some: node } }
      : { [segment]: node };
  }
  return node;
}

/** Condition matching one token against one field path. */
function tokenClauseForField(path: SearchFieldPath, token: string): any {
  const segments = path.split('.');
  const field = segments[segments.length - 1];
  const contains = (value: string) => ({
    [field]: { contains: value, mode: 'insensitive' as const },
  });

  const chunks = chunkToken(token);
  const leaf = chunks.length > 1
    ? { OR: [contains(token), { AND: chunks.map(contains) }] }
    : contains(token);

  return wrapInRelations(segments.slice(0, -1), leaf);
}

/**
 * Build the `AND` conditions for a search query — one entry per token.
 * Returns `[]` when there is nothing to search for, so callers can do:
 *
 *   const searchAnd = buildSearchAnd(search, ['ref_id', 'customer.name']);
 *   if (searchAnd.length > 0) whereClause.AND = searchAnd;
 */
export function buildSearchAnd(
  search: unknown,
  fields: SearchFieldPath[],
  options: SearchOptions = {},
): any[] {
  const tokens = searchTokens(search);
  if (tokens.length === 0 || fields.length === 0) return [];

  return tokens.map((token) => ({
    OR: [
      ...fields.map((field) => tokenClauseForField(field, token)),
      ...(options.extraClausesForToken?.(token) ?? []),
    ],
  }));
}
