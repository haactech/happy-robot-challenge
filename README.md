# Carrier Sales API

MVP API for the HappyRobot inbound carrier sales technical challenge.

## Stack

- Cloudflare Workers
- Hono
- Zod
- Vitest
- Cloudflare D1

## Local Setup

```sh
npm install
cp .dev.vars.example .dev.vars
npm test
npm run typecheck
npm run dev
```

## API

- Public:
  - `GET /health`
- Protected with `x-api-key`:
  - `POST /api/carriers/verify`
  - `POST /api/loads/search`
  - `POST /api/negotiations/evaluate`
  - `POST /api/calls`
  - `GET /api/metrics/summary`

See `docs/api/contract.md` for request and response schemas.

## D1

Create a D1 database and replace `database_id` in `wrangler.toml`.

```sh
npx wrangler d1 create carrier-sales-api
npx wrangler d1 migrations apply carrier-sales-api --local
npx wrangler d1 migrations apply carrier-sales-api --remote
```

The MVP schema lives in:

- `migrations/0001_create_mvp_schema.sql`
- `migrations/0002_seed_mvp_data.sql`

## Notes

- `POST /api/negotiations/evaluate` is deterministic and does not persist negotiation rounds.
- Final call outcome and negotiation summary are persisted through `POST /api/calls`.
- Production uses D1 when the `DB` binding exists; tests use in-memory repositories.
