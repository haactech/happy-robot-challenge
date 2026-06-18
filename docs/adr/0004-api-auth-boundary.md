# ADR 0004: Keep health checks public and protect API endpoints with API key auth

## Status

Accepted

## Context

The MVP needs basic security without adding unnecessary identity infrastructure. HappyRobot needs to call backend tools over HTTPS, and the dashboard needs to fetch metrics.

The system also needs a simple health endpoint for local development, deployment checks, and basic operational visibility.

## Decision

Expose `GET /health` without authentication.

Require `x-api-key` authentication for all `/api/*` endpoints.

Use the same API key for HappyRobot and the MVP dashboard unless a concrete need for separate credentials appears later.

## Consequences

### Positive

- Simple to implement and test.
- Easy to configure in HappyRobot tool headers.
- `GET /health` can be used by deployment probes without secret management.
- Avoids premature user/session management for the dashboard.

### Negative

- API key rotation and role separation are manual.
- Dashboard and HappyRobot share the same access boundary in the MVP.

### Follow-ups

- Add separate dashboard auth only if the dashboard becomes public-facing beyond the demo.
- Document API key setup in deployment instructions.
