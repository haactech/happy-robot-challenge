# Cloudflare Workers + D1 Deployment Guide

This project deploys as a Cloudflare Worker backed by a single D1 database.
Use this guide for first-time setup, migrations, secrets, deployment, smoke tests, and rollback.

## Prerequisites

- A Cloudflare account with permission to create Workers and D1 databases.
- `npx` available from this repository.
- Local repository checkout of this project.
- A value for `API_KEY` that will be shared with the calling client.

## Required Values

- `API_KEY`: Worker secret used to authenticate all `/api/*` endpoints.
- `database_id`: D1 database ID stored in `wrangler.toml` under `[[d1_databases]]`.
- `database_name`: `carrier-sales-api` in this repository.

## 1) Authenticate With Cloudflare

Log in to Cloudflare from the project directory:

```sh
npx wrangler login
```

Confirm the active account:

```sh
npx wrangler whoami
```

If the account is wrong, run `npx wrangler logout` and log in again.

## 2) Create the D1 Database

Create the database in Cloudflare:

```sh
npx wrangler d1 create carrier-sales-api
```

Wrangler prints the new database metadata, including `database_id`.
Copy that value into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "carrier-sales-api"
database_id = "replace-with-cloudflare-d1-database-id"
```

Do not create a second database unless you intentionally want a fresh environment.

## 3) Apply D1 Migrations

Apply the schema to the local D1 database first:

```sh
npx wrangler d1 migrations apply carrier-sales-api --local
```

Then apply the same migrations to the remote D1 database:

```sh
npx wrangler d1 migrations apply carrier-sales-api --remote
```

Recommended sequence:

1. Apply locally.
2. Run `npm test` or `npm run dev` if you want to verify the app against local bindings.
3. Apply remotely.

If you add a new migration later, create it in `migrations/` and re-run the same `apply` commands.

## 4) Set the API Key Secret

For local development, place the key in `.dev.vars`:

```sh
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set:

```text
API_KEY=your-production-or-staging-key
```

For the deployed Worker, store the secret in Cloudflare:

```sh
npx wrangler secret put API_KEY
```

Paste the same value you intend to use for the client that calls the API.

Do not commit `.dev.vars` or any other file containing the secret.

## 5) Deploy the Worker

Deploy the current branch to Cloudflare:

```sh
npx wrangler deploy
```

If deployment fails because a required secret is missing, add the secret and deploy again.

## 6) Smoke Test the Deployment

Set your deployed base URL first:

```sh
export BASE_URL="https://<your-worker>.<your-subdomain>.workers.dev"
export API_KEY="the-same-value-you-set-in-cloudflare"
```

### Public endpoints

Verify the service is healthy:

```sh
curl -i "$BASE_URL/health"
```

Verify the contract UI renders:

```sh
curl -i "$BASE_URL/contract"
```

Verify the OpenAPI document is available:

```sh
curl -i "$BASE_URL/openapi.json"
```

Expected result for each public route:

- HTTP `200`
- No `x-api-key` header required
- No secrets or database internals exposed

### Protected endpoints

Use the API key header on all `/api/*` routes:

```sh
curl -i \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -X POST \
  "$BASE_URL/api/loads/search" \
  -d '{
    "mc_number": "123456",
    "origin": "Chicago, IL",
    "destination": "Dallas, TX",
    "equipment_type": "dry_van"
  }'
```

Also verify a read-only protected route:

```sh
curl -i \
  -H "x-api-key: $API_KEY" \
  "$BASE_URL/api/metrics/summary"
```

To confirm the auth boundary, repeat one protected request without `x-api-key` and expect `401`:

```sh
curl -i "$BASE_URL/api/metrics/summary"
```

## 7) Basic Rollback

List recent deployments or versions to find the good version ID:

```sh
npx wrangler versions list
```

Roll back to a known-good version:

```sh
npx wrangler rollback <version-id> --name carrier-sales-api -y
```

Use rollback when the deployed Worker is unhealthy, the contract smoke test fails, or the database migration was applied correctly but the application version is broken.

If you need traffic splitting instead of a full revert, use `npx wrangler versions deploy` with version percentages.

## Operational Notes

- Keep the migration history in `migrations/` and do not edit old migration files after they have been applied remotely.
- Apply schema changes locally before remote deployment.
- Keep the same `API_KEY` value across the calling client, local `.dev.vars`, and Cloudflare secret storage unless you are intentionally rotating it.
- The Worker uses the `DB` binding when the D1 database is configured; local tests can still run with in-memory repositories.
