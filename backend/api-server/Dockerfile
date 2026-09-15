# Build from the repo root: docker build -f backend/api-server/Dockerfile .
FROM node:20-alpine

RUN apk add --no-cache openssl curl

WORKDIR /app

# Workspace manifests first (for layer caching)
COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY backend/api-server/package.json ./backend/api-server/
RUN npm install --workspace=@mercon/shared-types --workspace=@mercon/api-server --ignore-scripts && npm cache clean --force


# Shared types (built explicitly since --ignore-scripts skips prepare)
COPY packages/shared-types ./packages/shared-types
RUN npm run build -w @mercon/shared-types

# Prisma client
COPY backend/api-server/prisma ./backend/api-server/prisma
RUN cd backend/api-server && npx prisma generate

# API source + build
COPY backend/api-server ./backend/api-server
RUN npm run build -w @mercon/api-server

WORKDIR /app/backend/api-server
RUN mkdir -p /app/backend/api-server/uploads

EXPOSE 3000

# Start command: apply migrations, seed, then serve.
#
# The schema step is deliberately FATAL (`&&`, not `; ... || true`). It used to
# be `prisma db push --accept-data-loss || true`, which had three problems:
# `db push` left no migration history to review or roll back, the flag let a
# destructive change run unattended on every restart, and `|| true` meant a
# failed schema change still started the API against a database that did not
# match the code. A container that cannot bring the schema up to date must not
# serve traffic — let it exit and restart loudly instead.
#
# The seed stays non-fatal: it is idempotent and re-runs every start, so a
# failure there is worth shouting about but not worth taking the API down for.
#
# NOTE: `migrate deploy` requires the database to have a `_prisma_migrations`
CMD ["sh", "-c", "npx prisma migrate resolve --applied 20260913180000_backfill_missing_trip_stops 2>/dev/null || true; npx prisma migrate resolve --applied 20260914140000_add_driver_devices_table 2>/dev/null || true; npx prisma migrate resolve --applied 20260915153000_add_vehicle_compatibility_rules 2>/dev/null || true; npx prisma migrate resolve --applied 20260915153500_add_audit_log 2>/dev/null || true; npx prisma migrate resolve --applied 20260915153500_add_quotation_number_sequence 2>/dev/null || true; npx prisma migrate resolve --applied 20260915163000_add_trip_assignment_events_and_contingency 2>/dev/null || true; npx prisma migrate resolve --applied 20260915220000_add_provider_rate_cards 2>/dev/null || true; npx prisma migrate deploy && npx prisma generate && node dist/index.js"]
