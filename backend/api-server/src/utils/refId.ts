import { randomInt } from 'crypto';

/**
 * Collision-safe, human-readable reference IDs (e.g. "TRP-K7Q2M9", "INV-2026-3F8QP2").
 *
 * Replaces the old `PREFIX-${random(1000-9999)}` scheme, which had only ~9k
 * possible values and no uniqueness guarantee.
 *
 * Strategy:
 *  - 6 chars of Crockford base32 → ~1.07 billion combinations per prefix.
 *  - `crypto.randomInt` for unbiased randomness (not Math.random).
 *  - Verify against the DB and retry on the (astronomically rare) clash.
 *  - `ref_id` columns are `@unique`, so the database is the final guard even if
 *    two requests race between the check and the insert.
 */

/** Crockford base32 — omits I, L, O, U to avoid visual ambiguity. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export interface RefIdOptions {
  /** Include the current year, e.g. "INV-2026-XXXXXX". Default false. */
  year?: boolean;
  /** Number of random characters. Default 6 (~1.07e9 space). */
  length?: number;
  /** Max attempts before giving up. Default 6. */
  maxAttempts?: number;
}

/**
 * Generate a unique reference id for the given prefix.
 * `isTaken` should resolve true if a candidate already exists in the DB
 * (pass a Prisma delegate lookup — works inside a transaction too).
 */
export async function generateRefId(
  prefix: string,
  isTaken: (candidate: string) => Promise<boolean>,
  opts: RefIdOptions = {},
): Promise<string> {
  const { year = false, length = 6, maxAttempts = 6 } = opts;
  const yearPart = year ? `${new Date().getFullYear()}-` : '';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `${prefix}-${yearPart}${randomCode(length)}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`Could not generate a unique "${prefix}" reference id after ${maxAttempts} attempts`);
}
