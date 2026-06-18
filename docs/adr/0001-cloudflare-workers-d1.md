# ADR 0001: Deploy the MVP on Cloudflare Workers with D1

## Status

Accepted

## Context

The technical challenge asks for a working proof of concept for inbound carrier sales automation. The system needs an API, lightweight persistence, dashboard metrics, HTTPS, API key authentication, and clear deployment instructions.

Docker containerization is mentioned in the challenge, but the highest-risk parts of the demo are the HappyRobot workflow integration, API contract, load matching, negotiation capture, and dashboard stability.

Cloudflare provides Workers, D1 SQLite Database, Workers & Pages, R2, Containers, and Workers VPC in the account. D1 is available for lightweight relational persistence, and Workers provide HTTPS by default.

## Decision

Use Cloudflare Workers as the production runtime and Cloudflare D1 as the primary database for the MVP.

Do not use Workers VPC for the MVP because there is no private external network dependency. Do not start with Cloudflare Containers because it adds deployment and binding complexity without improving the demo-critical path.

Keep the application portable enough to add Docker-based local execution later if needed.

## Consequences

### Positive

- Faster implementation path.
- Built-in HTTPS through Cloudflare.
- Simple deployment with Wrangler.
- D1 provides enough relational persistence for loads, carriers, calls, offers, and metrics.
- Lower operational complexity than managing a container runtime for the first version.

### Negative

- Production deployment is not Docker-based.
- Some Node.js runtime assumptions may not apply in the Workers runtime.
- If the interviewer treats Docker as a strict production requirement, we will need to explain the tradeoff and provide a local Docker option.

### Follow-ups

- Add a local Dockerfile if time allows, mainly for reproducibility.
- Document why Cloudflare Workers is the production deployment target.
- Keep API and business logic isolated from Worker-specific bindings where practical.
