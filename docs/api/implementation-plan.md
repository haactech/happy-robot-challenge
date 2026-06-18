# API Implementation Plan

## Goal

Implement the minimum API required for the HappyRobot inbound carrier sales proof of concept, following the current ADRs:

- Cloudflare Workers + D1 for production deployment.
- API-first with TDD.
- Tool-driven REST-oriented endpoints.
- Deterministic negotiation evaluation without per-round persistence.

## Non-Goals

- No full CRM/TMS integration.
- No full transcript storage.
- No production-grade carrier compliance engine.
- No per-round negotiation persistence.
- No Docker-first production deployment.
- No complex dashboard filters before the core metrics work.

## Implementation Order

### 1. Project Scaffold

Create a TypeScript Cloudflare Worker project with:

- Hono for HTTP routing.
- Vitest for unit and route tests.
- Zod for request validation.
- Wrangler for local development and deployment.

Expected files:

- `src/app.ts`
- `src/index.ts`
- `src/routes/*`
- `src/domain/*`
- `src/repositories/*`
- `test/*`
- `wrangler.toml`

### 2. Contract Tests First

Write route-level tests from `docs/api/contract.md` before implementing persistence.

Initial contract test coverage:

- Rejects missing or invalid `x-api-key`.
- Validates required request fields.
- Returns documented response shapes.
- Returns documented error response shape.
- Enforces negotiation round limit.
- Enforces enum values for `outcome`, `sentiment`, and negotiation `decision`.

### 3. Domain Logic

Implement deterministic domain services independent of Cloudflare bindings:

- `verifyCarrier`
- `searchLoads`
- `evaluateNegotiation`
- `createCallRecord`
- `summarizeMetrics`

The services should be testable with in-memory adapters.

### 4. In-Memory Repository Adapters

Start with in-memory repositories to keep tests fast and avoid D1 setup friction.

Temporary repositories:

- `InMemoryCarrierRepository`
- `InMemoryLoadRepository`
- `InMemoryCallRepository`

These are implementation scaffolding, not production persistence.

### 5. D1 Schema and Repositories

Add D1 only after route and domain behavior is stable.

Minimum tables:

- `loads`
- `carrier_verifications`
- `calls`

Avoid a separate `negotiation_rounds` table for MVP. Store final negotiation summary on `calls`.

### 6. Seed Data

Create deterministic seed data for demo stability.

Seed loads must cover:

- At least one obvious match.
- At least one no-match scenario.
- Different equipment types.
- Rates that exercise accept, counter, and reject negotiation paths.

### 7. FMCSA Adapter

Implement FMCSA verification behind an adapter:

- Primary: FMCSA HTTP lookup.
- Fallback: deterministic mock by MC number.

The mock fallback must be explicit in the response via `carrier.source: "mock"`.

### 8. Dashboard Metrics Endpoint

Implement only `GET /api/metrics/summary` for the MVP dashboard.

Metrics come from stored calls:

- Total calls.
- Outcome totals.
- Booking rate.
- Agreement rate.
- Average negotiation rounds.
- Average agreed price.
- Average rate delta.
- Sentiment totals.
- Recent calls.

### 9. Deployment Readiness

Add:

- `wrangler.toml`
- D1 binding config.
- Migration scripts.
- Seed command or seed SQL.
- README deployment instructions.
- Required environment variables and secrets.

## Proposed Test Slices

### Slice 1: Authentication and Health

- `GET /health` returns service metadata without auth.
- API endpoints reject missing `x-api-key`.
- API endpoints accept valid `x-api-key`.

### Slice 2: Carrier Verification

- Valid MC number returns eligible carrier.
- Known ineligible MC number returns `can_continue: false`.
- Invalid payload returns `400 invalid_request`.

### Slice 3: Load Search

- Matching lane returns ranked loads and pitch.
- No matching lane returns empty results and null recommendation.
- Missing equipment type returns validation error.

### Slice 4: Negotiation

- Offer at or above threshold returns `accept`.
- Offer near threshold returns `counter`.
- Low offer returns `reject`.
- Round greater than `3` returns `409 negotiation_limit_reached`.

### Slice 5: Call Capture

- Booked call persists final summary.
- Non-booked call can omit agreed price.
- Invalid outcome or sentiment returns validation error.

### Slice 6: Metrics

- Metrics summarize stored calls.
- Recent calls are returned in descending creation order.
- Empty state returns zeroed metrics.

## Closed Decisions

- `GET /health` is public.
- All `/api/*` endpoints require `x-api-key`.
- The dashboard and HappyRobot use the same `x-api-key` for the MVP.

## Open Questions

1. Should demo seed data live as SQL migrations or TypeScript fixtures?
2. What exact negotiation thresholds should the MVP implement?
