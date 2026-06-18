# ADR 0003: Expose a tool-driven API contract for HappyRobot

## Status

Accepted

## Context

The HappyRobot agent needs to perform several deterministic actions during the carrier call:

- Verify the carrier by MC number.
- Search for viable loads.
- Evaluate counteroffers during negotiation.
- Persist the final call outcome.
- Expose metrics for the custom dashboard.

A single transcript-analysis endpoint would be simpler to implement, but it would make the integration less transparent and would hide important workflow behavior inside a large post-call operation.

## Decision

Expose a small tool-driven HTTP API for the HappyRobot workflow, plus one final call-capture endpoint.

The MVP API surface is:

- `POST /api/carriers/verify`
- `POST /api/loads/search`
- `POST /api/negotiations/evaluate`
- `POST /api/calls`
- `GET /api/metrics/summary`

Each endpoint must define explicit request and response schemas before implementation. HappyRobot should not need to infer fields or parse ambiguous free text from API responses.

`POST /api/negotiations/evaluate` is deterministic and does not persist each negotiation round. The MVP persists only the final structured summary through `POST /api/calls`.

## Consequences

### Positive

- Clear contract for HappyRobot tools.
- Easier TDD because each endpoint has deterministic behavior.
- Easier demo debugging because each conversation step maps to one API call.
- Metrics can be derived from structured call and offer data.

### Negative

- Slightly more workflow wiring in HappyRobot.
- More route tests than a single endpoint design.

### Follow-ups

- Implement contract tests before persistence integration.
- Add an OpenAPI file only if the Markdown contract becomes insufficient.
- Keep response payloads concise so the voice agent can use them directly.
