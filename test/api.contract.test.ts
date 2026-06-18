import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const env = { API_KEY: "test-api-key" };

type TestApp = ReturnType<typeof createApp>;

async function requestJson(
  app: TestApp,
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {},
) {
  const response = await app.request(
    path,
    {
      method: options.method ?? "GET",
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    },
    env,
  );
  return {
    status: response.status,
    body: (await response.json()) as any,
  };
}

describe("API contract", () => {
  it("exposes a public health endpoint", async () => {
    const app = createApp();

    const response = await app.request("/health", {}, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "carrier-sales-api",
      version: "0.1.0",
    });
  });

  it("exposes the OpenAPI contract as public JSON", async () => {
    const app = createApp();

    const response = await app.request("/openapi.json", {}, env);
    const body = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      openapi: "3.1.0",
      info: {
        title: "Carrier Sales API",
      },
      paths: {
        "/api/carriers/verify": expect.any(Object),
        "/api/loads/search": expect.any(Object),
        "/api/negotiations/evaluate": expect.any(Object),
        "/api/calls": expect.any(Object),
        "/api/metrics/summary": expect.any(Object),
      },
    });
  });

  it("exposes a public browsable contract page", async () => {
    const app = createApp();

    const response = await app.request("/contract", {}, env);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("SwaggerUIBundle");
    expect(html).toContain("/openapi.json");
  });

  it("rejects protected API endpoints without x-api-key", async () => {
    const app = createApp();

    const result = await requestJson(app, "/api/carriers/verify", {
      method: "POST",
      body: { mc_number: "123456" },
    });

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      error: {
        code: "unauthorized",
      },
    });
  });

  it("verifies an eligible carrier by MC number", async () => {
    const app = createApp();

    const result = await requestJson(app, "/api/carriers/verify", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: { mc_number: "123456" },
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      carrier: {
        mc_number: "123456",
        legal_name: "Example Carrier LLC",
        status: "active",
        eligible: true,
        source: "mock",
      },
      decision: {
        can_continue: true,
      },
    });
  });

  it("returns ranked load matches with a voice-ready pitch", async () => {
    const app = createApp();

    const result = await requestJson(app, "/api/loads/search", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: {
        mc_number: "123456",
        origin: "Chicago, IL",
        destination: "Dallas, TX",
        equipment_type: "dry_van",
        pickup_date: "2026-06-19",
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      loads: [
        {
          load_id: "LD-1001",
          loadboard_rate_cents: 240000,
        },
      ],
      pitch: {
        recommended_load_id: "LD-1001",
      },
    });
    expect(result.body.pitch.summary).toContain("Chicago, IL to Dallas, TX");
  });

  it("returns an empty load result when no lane matches", async () => {
    const app = createApp();

    const result = await requestJson(app, "/api/loads/search", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: {
        mc_number: "123456",
        origin: "Miami, FL",
        destination: "Boise, ID",
        equipment_type: "dry_van",
        pickup_date: "2026-06-19",
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      loads: [],
      pitch: {
        recommended_load_id: null,
        summary: "I could not find a matching load.",
      },
    });
  });

  it("evaluates a counteroffer without creating a call record", async () => {
    const app = createApp();

    const result = await requestJson(app, "/api/negotiations/evaluate", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: {
        load_id: "LD-1001",
        mc_number: "123456",
        round: 1,
        offer_cents: 225000,
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      negotiation: {
        load_id: "LD-1001",
        round: 1,
        max_rounds: 3,
        offer_cents: 225000,
        loadboard_rate_cents: 240000,
        decision: "counter",
        counter_offer_cents: 232500,
        agreed_price_cents: null,
      },
    });

    const metrics = await requestJson(app, "/api/metrics/summary", {
      headers: { "x-api-key": "test-api-key" },
    });
    expect(metrics.body).toMatchObject({
      totals: {
        calls: 0,
      },
    });
  });

  it("accepts a strong enough negotiation offer", async () => {
    const app = createApp();

    const result = await requestJson(app, "/api/negotiations/evaluate", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: {
        load_id: "LD-1001",
        mc_number: "123456",
        round: 1,
        offer_cents: 230000,
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      negotiation: {
        load_id: "LD-1001",
        round: 1,
        max_rounds: 3,
        offer_cents: 230000,
        loadboard_rate_cents: 240000,
        decision: "accept",
        counter_offer_cents: null,
        agreed_price_cents: 230000,
      },
      message: expect.stringContaining("I can accept $2,300"),
    });
  });

  it("rejects a too-low negotiation offer", async () => {
    const app = createApp();

    const result = await requestJson(app, "/api/negotiations/evaluate", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: {
        load_id: "LD-1001",
        mc_number: "123456",
        round: 1,
        offer_cents: 200000,
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      negotiation: {
        load_id: "LD-1001",
        round: 1,
        max_rounds: 3,
        offer_cents: 200000,
        loadboard_rate_cents: 240000,
        decision: "reject",
        counter_offer_cents: null,
        agreed_price_cents: null,
      },
      message: expect.stringContaining("I cannot accept $2,000"),
    });
  });

  it("persists carrier_ineligible call outcomes", async () => {
    const app = createApp();

    const callResponse = await requestJson(app, "/api/calls", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: {
        external_call_id: "hr-call-ineligible",
        mc_number: "654321",
        load_id: null,
        outcome: "carrier_ineligible",
        sentiment: "negative",
        transferred: false,
      },
    });

    expect(callResponse.status).toBe(201);
    expect(callResponse.body).toMatchObject({
      saved: true,
      outcome: "carrier_ineligible",
      sentiment: "negative",
    });

    const metrics = await requestJson(app, "/api/metrics/summary", {
      headers: { "x-api-key": "test-api-key" },
    });

    expect(metrics.status).toBe(200);
    expect(metrics.body).toMatchObject({
      totals: {
        calls: 1,
        carrier_ineligible: 1,
      },
      recent_calls: [
        {
          external_call_id: "hr-call-ineligible",
          outcome: "carrier_ineligible",
          load_id: null,
        },
      ],
    });
  });

  it("persists no_matching_load call outcomes", async () => {
    const app = createApp();

    const callResponse = await requestJson(app, "/api/calls", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: {
        external_call_id: "hr-call-no-load",
        mc_number: "123456",
        load_id: null,
        outcome: "no_matching_load",
        sentiment: "neutral",
        transferred: false,
      },
    });

    expect(callResponse.status).toBe(201);
    expect(callResponse.body).toMatchObject({
      saved: true,
      outcome: "no_matching_load",
      sentiment: "neutral",
    });

    const metrics = await requestJson(app, "/api/metrics/summary", {
      headers: { "x-api-key": "test-api-key" },
    });

    expect(metrics.status).toBe(200);
    expect(metrics.body).toMatchObject({
      totals: {
        calls: 1,
        no_matching_load: 1,
      },
      recent_calls: [
        {
          external_call_id: "hr-call-no-load",
          outcome: "no_matching_load",
          load_id: null,
        },
      ],
    });
  });

  it("rejects booked calls without an agreed price", async () => {
    const app = createApp();

    const result = await requestJson(app, "/api/calls", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: {
        external_call_id: "hr-call-missing-price",
        mc_number: "123456",
        load_id: "LD-1001",
        outcome: "booked",
        sentiment: "positive",
        transferred: true,
      },
    });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      error: {
        code: "invalid_request",
        message: "Booked calls require agreed_price_cents.",
      },
    });
  });

  it("rejects negotiations after three rounds", async () => {
    const app = createApp();

    const result = await requestJson(app, "/api/negotiations/evaluate", {
      method: "POST",
      headers: { "x-api-key": "test-api-key" },
      body: {
        load_id: "LD-1001",
        mc_number: "123456",
        round: 4,
        offer_cents: 225000,
      },
    });

    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({
      error: {
        code: "negotiation_limit_reached",
      },
    });
  });

  it("persists final call outcomes for dashboard metrics", async () => {
    const app = createApp();
    const callResponse = await app.request(
      "/api/calls",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify({
          external_call_id: "hr-call-abc123",
          mc_number: "123456",
          load_id: "LD-1001",
          outcome: "booked",
          sentiment: "positive",
          agreed_price_cents: 232500,
          negotiation_rounds: 2,
          transferred: true,
          extracted: {
            carrier_contact_name: "Alex",
            initial_offer_cents: 225000,
            final_offer_cents: 232500,
          },
        }),
      },
      env,
    );

    expect(callResponse.status).toBe(201);
    await expect(callResponse.json()).resolves.toMatchObject({
      saved: true,
      outcome: "booked",
      sentiment: "positive",
    });

    const metricsResponse = await app.request(
      "/api/metrics/summary",
      {
        headers: { "x-api-key": "test-api-key" },
      },
      env,
    );

    expect(metricsResponse.status).toBe(200);
    await expect(metricsResponse.json()).resolves.toMatchObject({
      totals: {
        calls: 1,
        booked: 1,
      },
      sentiment: {
        positive: 1,
      },
      recent_calls: [
        {
          external_call_id: "hr-call-abc123",
          outcome: "booked",
        },
      ],
    });
  });
});
