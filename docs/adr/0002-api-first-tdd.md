# ADR 0002: Build API-first with TDD

## Status

Accepted

## Context

The HappyRobot workflow depends on clear API contracts for carrier verification, load search, negotiation decisions, call extraction, and dashboard metrics.

Starting from database implementation or UI risks coupling the implementation to unfinished assumptions. The demo also needs stable endpoints that can be integrated incrementally with HappyRobot.

## Decision

Build the system API-first and use TDD to define the contract before integrating persistence.

Start with request/response contracts, route tests, and deterministic business logic tests. Add D1 persistence after the API behavior is clear.

## Consequences

### Positive

- Clear contract for HappyRobot integration.
- Faster feedback on business rules.
- Easier mocking for FMCSA verification and negotiation scenarios.
- Database schema can be derived from actual use cases instead of guessed upfront.

### Negative

- Some early tests may use in-memory repositories before D1 is wired.
- Requires discipline to avoid overbuilding abstractions.

### Follow-ups

- Define OpenAPI-style endpoint contracts.
- Add route-level tests for all HappyRobot-facing endpoints.
- Add business logic tests for load matching, eligibility, and negotiation.
- Add D1 integration tests after core behavior is stable.
