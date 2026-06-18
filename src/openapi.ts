export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Carrier Sales API",
    version: "0.1.0",
    description: "API contract for the HappyRobot inbound carrier sales MVP.",
  },
  servers: [
    {
      url: "/",
      description: "Current deployment",
    },
  ],
  security: [{ ApiKeyAuth: [] }],
  tags: [
    { name: "Health" },
    { name: "Carriers" },
    { name: "Loads" },
    { name: "Negotiations" },
    { name: "Calls" },
    { name: "Metrics" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Service health check",
        security: [],
        responses: {
          "200": {
            description: "Service is healthy.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/api/carriers/verify": {
      post: {
        tags: ["Carriers"],
        summary: "Verify carrier eligibility by MC number",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CarrierVerifyRequest" },
              examples: {
                eligible: {
                  value: { mc_number: "123456" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Carrier verification result.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CarrierVerifyResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/loads/search": {
      post: {
        tags: ["Loads"],
        summary: "Search viable loads for a carrier",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoadSearchRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Matching loads and voice-ready pitch.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoadSearchResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/negotiations/evaluate": {
      post: {
        tags: ["Negotiations"],
        summary: "Evaluate a carrier offer for a load",
        description: "Deterministic evaluation. This endpoint does not persist negotiation rounds.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NegotiationEvaluateRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Negotiation decision.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NegotiationEvaluateResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/NegotiationLimitReached" },
        },
      },
    },
    "/api/calls": {
      post: {
        tags: ["Calls"],
        summary: "Persist final structured call outcome",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CallCreateRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Call outcome saved.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CallCreateResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/metrics/summary": {
      get: {
        tags: ["Metrics"],
        summary: "Read dashboard summary metrics",
        responses: {
          "200": {
            description: "Dashboard metrics summary.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MetricsSummaryResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid API key.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      InvalidRequest: {
        description: "Invalid request payload.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Requested resource was not found.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NegotiationLimitReached: {
        description: "Negotiation exceeded the three-round limit.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["status", "service", "version"],
        properties: {
          status: { type: "string", enum: ["ok"] },
          service: { type: "string", example: "carrier-sales-api" },
          version: { type: "string", example: "0.1.0" },
        },
      },
      CarrierVerifyRequest: {
        type: "object",
        required: ["mc_number"],
        properties: {
          mc_number: { type: "string", example: "123456" },
        },
      },
      CarrierVerifyResponse: {
        type: "object",
        required: ["carrier", "decision"],
        properties: {
          carrier: { $ref: "#/components/schemas/Carrier" },
          decision: {
            type: "object",
            required: ["can_continue", "reason"],
            properties: {
              can_continue: { type: "boolean" },
              reason: { type: "string" },
            },
          },
        },
      },
      Carrier: {
        type: "object",
        required: ["mc_number", "legal_name", "status", "eligible", "source"],
        properties: {
          mc_number: { type: "string" },
          legal_name: { type: "string" },
          status: { type: "string", enum: ["active", "inactive", "suspended"] },
          eligible: { type: "boolean" },
          source: { type: "string", enum: ["fmcsa", "mock"] },
        },
      },
      LoadSearchRequest: {
        type: "object",
        required: ["mc_number", "origin", "destination", "equipment_type"],
        properties: {
          mc_number: { type: "string" },
          origin: { type: "string", example: "Chicago, IL" },
          destination: { type: "string", example: "Dallas, TX" },
          equipment_type: { type: "string", example: "dry_van" },
          pickup_date: { type: "string", format: "date", example: "2026-06-19" },
        },
      },
      LoadSearchResponse: {
        type: "object",
        required: ["loads", "pitch"],
        properties: {
          loads: {
            type: "array",
            items: { $ref: "#/components/schemas/Load" },
          },
          pitch: {
            type: "object",
            required: ["recommended_load_id", "summary"],
            properties: {
              recommended_load_id: {
                anyOf: [{ type: "string" }, { type: "null" }],
                example: "LD-1001",
              },
              summary: { type: "string" },
            },
          },
        },
      },
      Load: {
        type: "object",
        required: [
          "load_id",
          "origin",
          "destination",
          "pickup_datetime",
          "delivery_datetime",
          "equipment_type",
          "loadboard_rate_cents",
          "notes",
          "weight",
          "commodity_type",
          "num_of_pieces",
          "miles",
          "dimensions",
        ],
        properties: {
          load_id: { type: "string", example: "LD-1001" },
          origin: { type: "string" },
          destination: { type: "string" },
          pickup_datetime: { type: "string", format: "date-time" },
          delivery_datetime: { type: "string", format: "date-time" },
          equipment_type: { type: "string", enum: ["dry_van", "reefer", "flatbed"] },
          loadboard_rate_cents: { type: "integer", example: 240000 },
          notes: { type: "string" },
          weight: { type: "integer" },
          commodity_type: { type: "string" },
          num_of_pieces: { type: "integer" },
          miles: { type: "integer" },
          dimensions: { type: "string" },
        },
      },
      NegotiationEvaluateRequest: {
        type: "object",
        required: ["load_id", "mc_number", "round", "offer_cents"],
        properties: {
          load_id: { type: "string", example: "LD-1001" },
          mc_number: { type: "string", example: "123456" },
          round: { type: "integer", minimum: 1, maximum: 3 },
          offer_cents: { type: "integer", minimum: 1, example: 225000 },
        },
      },
      NegotiationEvaluateResponse: {
        type: "object",
        required: ["negotiation", "message"],
        properties: {
          negotiation: {
            type: "object",
            required: [
              "load_id",
              "round",
              "max_rounds",
              "offer_cents",
              "loadboard_rate_cents",
              "decision",
              "counter_offer_cents",
              "agreed_price_cents",
            ],
            properties: {
              load_id: { type: "string" },
              round: { type: "integer" },
              max_rounds: { type: "integer", enum: [3] },
              offer_cents: { type: "integer" },
              loadboard_rate_cents: { type: "integer" },
              decision: { type: "string", enum: ["accept", "counter", "reject"] },
              counter_offer_cents: { anyOf: [{ type: "integer" }, { type: "null" }] },
              agreed_price_cents: { anyOf: [{ type: "integer" }, { type: "null" }] },
            },
          },
          message: { type: "string" },
        },
      },
      CallCreateRequest: {
        type: "object",
        required: ["external_call_id", "mc_number", "outcome", "sentiment", "transferred"],
        properties: {
          external_call_id: { type: "string", example: "hr-call-abc123" },
          mc_number: { type: "string", example: "123456" },
          load_id: { anyOf: [{ type: "string" }, { type: "null" }] },
          outcome: {
            type: "string",
            enum: [
              "booked",
              "carrier_ineligible",
              "no_matching_load",
              "not_interested",
              "price_not_agreed",
              "incomplete",
            ],
          },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          agreed_price_cents: { anyOf: [{ type: "integer" }, { type: "null" }] },
          negotiation_rounds: { anyOf: [{ type: "integer", minimum: 0, maximum: 3 }, { type: "null" }] },
          transferred: { type: "boolean" },
          extracted: { $ref: "#/components/schemas/CallExtractedData" },
        },
      },
      CallExtractedData: {
        type: "object",
        properties: {
          carrier_contact_name: { type: "string" },
          carrier_phone: { type: "string" },
          initial_offer_cents: { type: "integer" },
          final_offer_cents: { type: "integer" },
          notes: { type: "string" },
        },
      },
      CallCreateResponse: {
        type: "object",
        required: ["call_id", "saved", "outcome", "sentiment"],
        properties: {
          call_id: { type: "string" },
          saved: { type: "boolean", enum: [true] },
          outcome: {
            type: "string",
            enum: [
              "booked",
              "carrier_ineligible",
              "no_matching_load",
              "not_interested",
              "price_not_agreed",
              "incomplete",
            ],
          },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
        },
      },
      MetricsSummaryResponse: {
        type: "object",
        required: ["totals", "conversion", "negotiation", "sentiment", "recent_calls"],
        properties: {
          totals: {
            type: "object",
            required: [
              "calls",
              "booked",
              "carrier_ineligible",
              "no_matching_load",
              "price_not_agreed",
              "not_interested",
            ],
            properties: {
              calls: { type: "integer" },
              booked: { type: "integer" },
              carrier_ineligible: { type: "integer" },
              no_matching_load: { type: "integer" },
              price_not_agreed: { type: "integer" },
              not_interested: { type: "integer" },
            },
          },
          conversion: {
            type: "object",
            required: ["booking_rate", "agreement_rate"],
            properties: {
              booking_rate: { type: "number" },
              agreement_rate: { type: "number" },
            },
          },
          negotiation: {
            type: "object",
            required: ["average_rounds", "average_agreed_price_cents", "average_rate_delta_cents"],
            properties: {
              average_rounds: { type: "number" },
              average_agreed_price_cents: { type: "number" },
              average_rate_delta_cents: { type: "number" },
            },
          },
          sentiment: {
            type: "object",
            required: ["positive", "neutral", "negative"],
            properties: {
              positive: { type: "integer" },
              neutral: { type: "integer" },
              negative: { type: "integer" },
            },
          },
          recent_calls: {
            type: "array",
            items: { $ref: "#/components/schemas/RecentCall" },
          },
        },
      },
      RecentCall: {
        type: "object",
        required: [
          "call_id",
          "external_call_id",
          "mc_number",
          "load_id",
          "outcome",
          "sentiment",
          "agreed_price_cents",
          "created_at",
        ],
        properties: {
          call_id: { type: "string" },
          external_call_id: { type: "string" },
          mc_number: { type: "string" },
          load_id: { anyOf: [{ type: "string" }, { type: "null" }] },
          outcome: {
            type: "string",
            enum: [
              "booked",
              "carrier_ineligible",
              "no_matching_load",
              "not_interested",
              "price_not_agreed",
              "incomplete",
            ],
          },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          agreed_price_cents: { anyOf: [{ type: "integer" }, { type: "null" }] },
          created_at: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "details"],
            properties: {
              code: {
                type: "string",
                enum: [
                  "unauthorized",
                  "invalid_request",
                  "not_found",
                  "carrier_ineligible",
                  "negotiation_limit_reached",
                  "internal_error",
                ],
              },
              message: { type: "string" },
              details: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
  },
} as const;

export function renderContractHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Carrier Sales API Contract</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true
      });
    </script>
  </body>
</html>`;
}
