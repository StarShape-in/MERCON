import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Money columns are `Decimal` in the schema so the database never loses
 * precision on financial arithmetic (SUM/AVG in Postgres, storage, updates).
 * But `JSON.stringify` — which is what `res.json()` uses — serializes a
 * `Prisma.Decimal` as a quoted STRING by default ("150.50", not 150.5),
 * because `Decimal.prototype.toJSON` returns `this.toString()`. Every
 * consumer on the wire — the web dashboard, the mobile app, xlsx exports —
 * expects a JSON number for a money field, exactly as it always got from the
 * old `Float` columns.
 *
 * This overrides that one prototype method, once, so a Decimal that reaches
 * `JSON.stringify` anywhere in the process — nested in a controller's
 * `res.json(trip)`, inside an array from `$queryRaw`, inside a report
 * builder result — serializes as a plain number. It is a safety net for
 * values that are handed straight through unmodified; it does NOT fix
 * in-process arithmetic (`total += row._sum.amount`), which silently does
 * string concatenation on a Decimal and must be fixed at each call site by
 * converting with `Number(...)` before the operation — see
 * `utils/tripFinancials.ts` for the pattern this codebase already uses.
 *
 * Deliberately not a Prisma Client extension (`$extends`): that would
 * rewrite Decimals at the client level too, which sounds stronger but
 * changes `prisma`'s TypeScript type in a way that breaks every function
 * typed to take a plain `PrismaClient` or `Prisma.TransactionClient` — of
 * which this codebase has several (`rateLookup.ts`'s `RateCardClient`,
 * `locationController.ts`, `mobileTripController.ts`). This prototype
 * override changes serialization only, not the client's shape.
 */
(Prisma.Decimal.prototype as unknown as { toJSON(): number }).toJSON = function (this: InstanceType<typeof Prisma.Decimal>) {
  return this.toNumber();
};

export const prisma = new PrismaClient();
