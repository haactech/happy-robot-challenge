import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { evaluateNegotiation } from "./domain/negotiation";
import { errorResponse } from "./http/errors";
import {
  callCreateSchema,
  carrierVerifySchema,
  loadSearchSchema,
  negotiationEvaluateSchema,
} from "./http/schemas";
import { createD1Repositories } from "./repositories/d1";
import { createInMemoryRepositories } from "./repositories/inMemory";
import type { CallRecord, Repositories } from "./repositories/types";
import type { Env } from "./types";

type AppVariables = {
  repos: Repositories;
};

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

export type AppOptions = {
  repositories?: Repositories;
};

export function createApp(options: AppOptions = {}) {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  const fallbackRepositories = options.repositories ?? createInMemoryRepositories();

  app.use("*", async (context, next) => {
    const repositories =
      options.repositories ?? (context.env?.DB ? createD1Repositories(context.env.DB) : fallbackRepositories);
    context.set("repos", repositories);
    await next();
  });

  app.get("/health", (context) => {
    return context.json({
      status: "ok",
      service: "carrier-sales-api",
      version: "0.1.0",
    });
  });

  app.use("/api/*", async (context, next) => {
    const expectedApiKey = context.env?.API_KEY ?? "test-api-key";
    const apiKey = context.req.header("x-api-key");

    if (!apiKey || apiKey !== expectedApiKey) {
      return errorResponse(context, 401, "unauthorized", "Missing or invalid API key.");
    }

    await next();
  });

  app.post("/api/carriers/verify", async (context) => {
    const parsed = await parseJson(context, carrierVerifySchema);
    if (!parsed.ok) return parsed.response;

    const repos = context.get("repos");
    const carrier =
      (await repos.carriers.findByMcNumber(parsed.data.mc_number)) ??
      ({
        mc_number: parsed.data.mc_number,
        legal_name: "Unknown Carrier",
        status: "inactive" as const,
        eligible: false,
        source: "mock" as const,
      });

    await repos.carriers.saveVerification(carrier);

    return context.json({
      carrier,
      decision: {
        can_continue: carrier.eligible,
        reason: carrier.eligible
          ? "Carrier is active and eligible."
          : "Carrier is not eligible to book loads.",
      },
    });
  });

  app.post("/api/loads/search", async (context) => {
    const parsed = await parseJson(context, loadSearchSchema);
    if (!parsed.ok) return parsed.response;

    const repos = context.get("repos");
    const loads = await repos.loads.search(parsed.data);
    const recommendedLoad = loads[0] ?? null;

    return context.json({
      loads,
      pitch: {
        recommended_load_id: recommendedLoad?.load_id ?? null,
        summary: recommendedLoad ? buildPitchSummary(recommendedLoad) : "I could not find a matching load.",
      },
    });
  });

  app.post("/api/negotiations/evaluate", async (context) => {
    const parsed = await parseJson(context, negotiationEvaluateSchema);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.round > 3) {
      return errorResponse(
        context,
        409,
        "negotiation_limit_reached",
        "Negotiation is limited to three rounds.",
        { max_rounds: 3 },
      );
    }

    const repos = context.get("repos");
    const load = await repos.loads.findById(parsed.data.load_id);
    if (!load) {
      return errorResponse(context, 404, "not_found", "Load was not found.");
    }

    const evaluation = evaluateNegotiation({
      offer_cents: parsed.data.offer_cents,
      loadboard_rate_cents: load.loadboard_rate_cents,
    });

    return context.json({
      negotiation: {
        load_id: load.load_id,
        round: parsed.data.round,
        max_rounds: 3,
        offer_cents: parsed.data.offer_cents,
        loadboard_rate_cents: load.loadboard_rate_cents,
        decision: evaluation.decision,
        counter_offer_cents: evaluation.counter_offer_cents,
        agreed_price_cents: evaluation.agreed_price_cents,
      },
      message: buildNegotiationMessage(evaluation, parsed.data.offer_cents),
    });
  });

  app.post("/api/calls", async (context) => {
    const parsed = await parseJson(context, callCreateSchema);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.outcome === "booked" && !parsed.data.agreed_price_cents) {
      return errorResponse(
        context,
        400,
        "invalid_request",
        "Booked calls require agreed_price_cents.",
      );
    }

    const repos = context.get("repos");
    const call = await repos.calls.create(parsed.data);

    return context.json(
      {
        call_id: call.call_id,
        saved: true,
        outcome: call.outcome,
        sentiment: call.sentiment,
      },
      201,
    );
  });

  app.get("/api/metrics/summary", async (context) => {
    const repos = context.get("repos");
    const calls = await repos.calls.listAll();
    const recentCalls = await repos.calls.listRecent(10);

    return context.json(buildMetricsSummary(calls, recentCalls));
  });

  return app;
}

async function parseJson<TSchema extends z.ZodTypeAny>(
  context: AppContext,
  schema: TSchema,
): Promise<{ ok: true; data: z.infer<TSchema> } | { ok: false; response: Response }> {
  try {
    const body = await context.req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        ok: false,
        response: errorResponse(context, 400, "invalid_request", "Invalid request payload.", {
          issues: result.error.issues,
        }),
      };
    }
    return { ok: true, data: result.data };
  } catch {
    return {
      ok: false,
      response: errorResponse(context, 400, "invalid_request", "Request body must be valid JSON."),
    };
  }
}

function buildPitchSummary(load: {
  equipment_type: string;
  origin: string;
  destination: string;
  pickup_datetime: string;
  delivery_datetime: string;
  loadboard_rate_cents: number;
}) {
  return `I found a ${load.equipment_type} load from ${load.origin} to ${load.destination} picking up ${load.pickup_datetime} and delivering ${load.delivery_datetime}. It pays ${formatMoney(load.loadboard_rate_cents)}.`;
}

function buildNegotiationMessage(
  evaluation: ReturnType<typeof evaluateNegotiation>,
  offerCents: number,
) {
  if (evaluation.decision === "accept") {
    return `I can accept ${formatMoney(offerCents)}.`;
  }

  if (evaluation.decision === "counter" && evaluation.counter_offer_cents) {
    return `I cannot do ${formatMoney(offerCents)}, but I can meet you at ${formatMoney(evaluation.counter_offer_cents)}.`;
  }

  return `I cannot accept ${formatMoney(offerCents)} for this load.`;
}

function buildMetricsSummary(calls: CallRecord[], recentCalls: CallRecord[]) {
  const totals = {
    calls: calls.length,
    booked: countByOutcome(calls, "booked"),
    carrier_ineligible: countByOutcome(calls, "carrier_ineligible"),
    no_matching_load: countByOutcome(calls, "no_matching_load"),
    price_not_agreed: countByOutcome(calls, "price_not_agreed"),
    not_interested: countByOutcome(calls, "not_interested"),
  };
  const bookedCalls = calls.filter((call) => call.outcome === "booked");
  const agreedPrices = bookedCalls
    .map((call) => call.agreed_price_cents)
    .filter((price): price is number => typeof price === "number");
  const negotiationRounds = calls
    .map((call) => call.negotiation_rounds)
    .filter((rounds): rounds is number => typeof rounds === "number");

  return {
    totals,
    conversion: {
      booking_rate: calls.length === 0 ? 0 : totals.booked / calls.length,
      agreement_rate: calls.length === 0 ? 0 : totals.booked / calls.length,
    },
    negotiation: {
      average_rounds: average(negotiationRounds),
      average_agreed_price_cents: average(agreedPrices),
      average_rate_delta_cents: 0,
    },
    sentiment: {
      positive: calls.filter((call) => call.sentiment === "positive").length,
      neutral: calls.filter((call) => call.sentiment === "neutral").length,
      negative: calls.filter((call) => call.sentiment === "negative").length,
    },
    recent_calls: recentCalls.map((call) => ({
      call_id: call.call_id,
      external_call_id: call.external_call_id,
      mc_number: call.mc_number,
      load_id: call.load_id ?? null,
      outcome: call.outcome,
      sentiment: call.sentiment,
      agreed_price_cents: call.agreed_price_cents ?? null,
      created_at: call.created_at,
    })),
  };
}

function countByOutcome(calls: CallRecord[], outcome: CallRecord["outcome"]) {
  return calls.filter((call) => call.outcome === outcome).length;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatMoney(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}
