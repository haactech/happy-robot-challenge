# API Sequence Diagrams

## Purpose

These diagrams describe how HappyRobot and the dashboard use the REST-oriented API during the inbound carrier sales workflow.

The API is intentionally small. Each endpoint maps to one workflow decision point and returns structured data that the agent can use directly.

## Full Call Flow

```mermaid
sequenceDiagram
    autonumber
    participant Carrier
    participant HR as HappyRobot Agent
    participant API as Carrier Sales API
    participant FMCSA as FMCSA API
    participant DB as Cloudflare D1
    participant Rep as Sales Rep Mock

    Carrier->>HR: Starts inbound web call
    HR->>Carrier: Ask for MC number
    Carrier->>HR: Provides MC number

    HR->>API: POST /api/carriers/verify
    API->>FMCSA: Lookup MC number
    FMCSA-->>API: Carrier authority data
    API->>DB: Persist verification result
    API-->>HR: eligibility decision

    alt carrier eligible
        HR->>Carrier: Ask lane/equipment preferences
        Carrier->>HR: Provides requested lane details
        HR->>API: POST /api/loads/search
        API->>DB: Query viable loads
        DB-->>API: Ranked load candidates
        API-->>HR: loads + pitch summary
        HR->>Carrier: Pitch recommended load

        alt carrier accepts listed rate
            HR->>Rep: Mock transfer
            HR->>API: POST /api/calls
            API->>DB: Store booked call outcome
            API-->>HR: saved call result
        else carrier counteroffers
            loop Up to 3 rounds
                Carrier->>HR: Counteroffer
                HR->>API: POST /api/negotiations/evaluate
                API->>DB: Load rate lookup
                DB-->>API: Load economics
                API-->>HR: accept, counter, or reject
                HR->>Carrier: Communicate negotiation response
            end

            alt price agreed
                HR->>Rep: Mock transfer
                HR->>API: POST /api/calls
                API->>DB: Store booked call outcome
                API-->>HR: saved call result
            else no agreement
                HR->>API: POST /api/calls
                API->>DB: Store price_not_agreed outcome
                API-->>HR: saved call result
            end
        end
    else carrier ineligible
        HR->>Carrier: Politely decline
        HR->>API: POST /api/calls
        API->>DB: Store carrier_ineligible outcome
        API-->>HR: saved call result
    end
```

## `POST /api/carriers/verify`

```mermaid
sequenceDiagram
    autonumber
    participant HR as HappyRobot Agent
    participant API as Carrier Sales API
    participant Auth as API Key Middleware
    participant FMCSA as FMCSA API
    participant DB as Cloudflare D1

    HR->>API: POST /api/carriers/verify { mc_number }
    API->>Auth: Validate x-api-key
    Auth-->>API: Authorized
    API->>API: Validate mc_number format
    API->>FMCSA: Fetch carrier authority data

    alt FMCSA available
        FMCSA-->>API: Carrier status and authority data
        API->>API: Evaluate eligibility
    else FMCSA unavailable
        API->>API: Use deterministic mock fallback
    end

    API->>DB: Store verification attempt
    API-->>HR: carrier + decision.can_continue
```

### REST Contract Intent

- Resource focus: carrier verification.
- The endpoint is a controlled action because verification depends on an external authority lookup.
- The response returns both raw carrier summary and a workflow decision.

## `POST /api/loads/search`

```mermaid
sequenceDiagram
    autonumber
    participant HR as HappyRobot Agent
    participant API as Carrier Sales API
    participant Auth as API Key Middleware
    participant DB as Cloudflare D1

    HR->>API: POST /api/loads/search { mc_number, origin, destination, equipment_type, pickup_date }
    API->>Auth: Validate x-api-key
    Auth-->>API: Authorized
    API->>API: Validate search criteria
    API->>DB: Query available loads
    DB-->>API: Matching loads
    API->>API: Rank candidates and build pitch summary
    API-->>HR: loads[] + pitch
```

### REST Contract Intent

- Resource focus: load collection search.
- `POST` is used instead of `GET` because the query can become structured and the voice workflow benefits from a stable JSON body.
- The response includes a generated `pitch.summary` so HappyRobot does not have to assemble load details manually.

## `POST /api/negotiations/evaluate`

```mermaid
sequenceDiagram
    autonumber
    participant HR as HappyRobot Agent
    participant API as Carrier Sales API
    participant Auth as API Key Middleware
    participant Engine as Negotiation Engine
    participant DB as Cloudflare D1

    HR->>API: POST /api/negotiations/evaluate { load_id, mc_number, round, offer_cents }
    API->>Auth: Validate x-api-key
    Auth-->>API: Authorized
    API->>API: Validate round <= 3
    API->>DB: Fetch load rate
    DB-->>API: Load economics
    API->>Engine: Evaluate offer
    Engine-->>API: accept, counter, or reject
    API-->>HR: negotiation decision + agent message
```

### REST Contract Intent

- Resource focus: negotiation evaluation.
- The endpoint is deterministic for a given load, offer, and round.
- Persistence of the final outcome still happens through `POST /api/calls`; this endpoint only evaluates the current offer and does not store negotiation rounds.

## `POST /api/calls`

```mermaid
sequenceDiagram
    autonumber
    participant HR as HappyRobot Agent
    participant API as Carrier Sales API
    participant Auth as API Key Middleware
    participant DB as Cloudflare D1

    HR->>API: POST /api/calls { external_call_id, outcome, sentiment, extracted }
    API->>Auth: Validate x-api-key
    Auth-->>API: Authorized
    API->>API: Validate outcome and sentiment enums
    API->>API: Validate booked calls include agreed_price_cents when applicable
    API->>DB: Insert call, extracted fields, and offer summary
    DB-->>API: Created call_id
    API-->>HR: saved call result
```

### REST Contract Intent

- Resource focus: call records.
- This is the source of truth for dashboard metrics.
- The API stores structured extraction, not full transcripts.

## `GET /api/metrics/summary`

```mermaid
sequenceDiagram
    autonumber
    participant User as Broker Ops User
    participant UI as Dashboard UI
    participant API as Carrier Sales API
    participant Auth as API Key Middleware
    participant DB as Cloudflare D1

    User->>UI: Opens dashboard
    UI->>API: GET /api/metrics/summary
    API->>Auth: Validate x-api-key
    Auth-->>API: Authorized
    API->>DB: Aggregate calls, outcomes, offers, and sentiment
    DB-->>API: Metric rows
    API->>API: Format summary response
    API-->>UI: totals, conversion, negotiation, sentiment, recent_calls
    UI-->>User: Render dashboard
```

### REST Contract Intent

- Resource focus: metrics summary.
- This is read-only.
- The MVP exposes only one dashboard endpoint to avoid premature analytics complexity.
