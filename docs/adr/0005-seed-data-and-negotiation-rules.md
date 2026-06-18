# ADR 0005: Use synthetic SQL seed data and deterministic negotiation thresholds

## Status

Accepted

## Context

The technical challenge defines the load fields required for the inbound carrier sales workflow. The MVP also needs carrier verification behavior, negotiation decisions, call outcomes, sentiment labels, and dashboard metrics.

FMCSA is an external verification source, but its raw response shape should not define the internal database schema. The API only needs a normalized eligibility decision for the HappyRobot workflow.

## Decision

Use synthetic SQL seed data for D1 based on the challenge load schema and this repository's API contract.

Use TypeScript fixtures for fast route and domain tests. The fixtures should mirror the SQL seed data but should not require D1 to run unit tests.

Do not use FMCSA raw API payloads as seed data. Store only the normalized carrier verification fields required by the contract, with an optional raw payload field later if needed.

Implement deterministic negotiation rules:

- Accept offers at or above 95% of `loadboard_rate_cents`.
- Counter offers from 85% inclusive up to 95% exclusive of `loadboard_rate_cents`.
- Reject offers below 85% of `loadboard_rate_cents`.
- Limit negotiation to three rounds.
- For counteroffers, use the midpoint between the carrier offer and the loadboard rate, rounded to whole cents.

## Consequences

### Positive

- Demo data is stable and predictable.
- Tests do not depend on external API availability.
- The database schema stays aligned to the product workflow instead of an external API payload.
- Negotiation behavior is explainable in the customer demo.

### Negative

- Seed data is synthetic and does not prove real FMCSA data quality.
- Negotiation thresholds are simplistic and not market-aware.
- The real FMCSA adapter still needs mapping logic once implemented.

### Follow-ups

- Document which MC numbers are valid, ineligible, and mock-only for demos.
- Keep at least one seed load for each negotiation path: accept, counter, reject.
- Revisit negotiation thresholds if real broker margin requirements are provided.
