# API Contract

## Purpose

This contract defines the minimum API surface required for the HappyRobot inbound carrier sales proof of concept.

The API is tool-driven: HappyRobot calls specific endpoints during the conversation instead of sending only a final transcript for analysis.

## Base Assumptions

- Base path: `/api`
- Style: REST-oriented resources and actions
- Transport: HTTPS
- Authentication: `x-api-key: <API_KEY>`
- Request format: JSON
- Response format: JSON
- Time format: ISO 8601 strings
- Currency: USD integer cents unless explicitly noted
- Distance: miles
- Weight: pounds

## Standard Error Response

All endpoints return this shape for non-2xx responses.

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Human-readable explanation",
    "details": {}
  }
}
```

### Error Codes

- `unauthorized`
- `invalid_request`
- `not_found`
- `carrier_ineligible`
- `negotiation_limit_reached`
- `internal_error`

## `POST /api/carriers/verify`

Verifies whether a carrier is eligible to work with the broker based on MC number.

### Request

```json
{
  "mc_number": "123456"
}
```

### Response `200`

```json
{
  "carrier": {
    "mc_number": "123456",
    "legal_name": "Example Carrier LLC",
    "status": "active",
    "eligible": true,
    "source": "fmcsa"
  },
  "decision": {
    "can_continue": true,
    "reason": "Carrier is active and eligible."
  }
}
```

### Notes

- `source` can be `fmcsa` or `mock`.
- If FMCSA is unavailable during the demo, the API may use a deterministic mock fallback.
- HappyRobot should stop the booking flow when `decision.can_continue` is `false`.

## `POST /api/loads/search`

Finds viable loads to pitch to the carrier.

### Request

```json
{
  "mc_number": "123456",
  "origin": "Chicago, IL",
  "destination": "Dallas, TX",
  "equipment_type": "dry_van",
  "pickup_date": "2026-06-19"
}
```

### Response `200`

```json
{
  "loads": [
    {
      "load_id": "LD-1001",
      "origin": "Chicago, IL",
      "destination": "Dallas, TX",
      "pickup_datetime": "2026-06-19T09:00:00-05:00",
      "delivery_datetime": "2026-06-21T15:00:00-05:00",
      "equipment_type": "dry_van",
      "loadboard_rate_cents": 240000,
      "notes": "Appointment required at pickup.",
      "weight": 42000,
      "commodity_type": "packaged_food",
      "num_of_pieces": 24,
      "miles": 925,
      "dimensions": "53 ft trailer"
    }
  ],
  "pitch": {
    "recommended_load_id": "LD-1001",
    "summary": "I found a dry van load from Chicago, IL to Dallas, TX picking up June 19 at 9:00 AM and delivering June 21 at 3:00 PM. It pays $2,400."
  }
}
```

### Notes

- The MVP only needs to return a small ranked list.
- HappyRobot should pitch `pitch.summary` first.
- If no loads match, return `loads: []` and `recommended_load_id: null`.

## `POST /api/negotiations/evaluate`

Evaluates a carrier offer or counteroffer for a load.

### Request

```json
{
  "load_id": "LD-1001",
  "mc_number": "123456",
  "round": 1,
  "offer_cents": 225000
}
```

### Response `200`

```json
{
  "negotiation": {
    "load_id": "LD-1001",
    "round": 1,
    "max_rounds": 3,
    "offer_cents": 225000,
    "loadboard_rate_cents": 240000,
    "decision": "counter",
    "counter_offer_cents": 232500,
    "agreed_price_cents": null
  },
  "message": "I cannot do $2,250, but I can meet you at $2,325."
}
```

### Decision Values

- `accept`
- `counter`
- `reject`

### Notes

- Maximum negotiation depth is three rounds.
- If `decision` is `accept`, `agreed_price_cents` must be set.
- If `decision` is `counter`, `counter_offer_cents` must be set.
- If `round` is greater than `3`, return `409 negotiation_limit_reached`.

## `POST /api/calls`

Persists the final structured outcome of a HappyRobot call.

### Request

```json
{
  "external_call_id": "hr-call-abc123",
  "mc_number": "123456",
  "load_id": "LD-1001",
  "outcome": "booked",
  "sentiment": "positive",
  "agreed_price_cents": 232500,
  "negotiation_rounds": 2,
  "transferred": true,
  "extracted": {
    "carrier_contact_name": "Alex",
    "carrier_phone": "+15551234567",
    "initial_offer_cents": 225000,
    "final_offer_cents": 232500,
    "notes": "Carrier accepted after one counteroffer."
  }
}
```

### Response `201`

```json
{
  "call_id": "call_01JZ0000000000000000000000",
  "saved": true,
  "outcome": "booked",
  "sentiment": "positive"
}
```

### Outcome Values

- `booked`
- `carrier_ineligible`
- `no_matching_load`
- `not_interested`
- `price_not_agreed`
- `incomplete`

### Sentiment Values

- `positive`
- `neutral`
- `negative`

### Notes

- This endpoint stores structured extraction from the call.
- HappyRobot owns the conversation transcript; the MVP API stores only the relevant extracted fields.
- If a price is agreed, HappyRobot can say the transfer was successful and then call this endpoint with `outcome: "booked"` and `transferred: true`.

## `GET /api/metrics/summary`

Returns dashboard metrics derived from stored calls and offers.

### Response `200`

```json
{
  "totals": {
    "calls": 25,
    "booked": 9,
    "carrier_ineligible": 3,
    "no_matching_load": 2,
    "price_not_agreed": 6,
    "not_interested": 5
  },
  "conversion": {
    "booking_rate": 0.36,
    "agreement_rate": 0.36
  },
  "negotiation": {
    "average_rounds": 1.7,
    "average_agreed_price_cents": 231250,
    "average_rate_delta_cents": -8750
  },
  "sentiment": {
    "positive": 11,
    "neutral": 10,
    "negative": 4
  },
  "recent_calls": [
    {
      "call_id": "call_01JZ0000000000000000000000",
      "external_call_id": "hr-call-abc123",
      "mc_number": "123456",
      "load_id": "LD-1001",
      "outcome": "booked",
      "sentiment": "positive",
      "agreed_price_cents": 232500,
      "created_at": "2026-06-18T04:15:00Z"
    }
  ]
}
```

### Notes

- This is the only endpoint needed by the custom dashboard for the MVP.
- More granular analytics can be added later if the dashboard needs filters.
