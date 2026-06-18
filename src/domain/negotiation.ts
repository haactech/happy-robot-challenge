import type { NegotiationDecision } from "../types";

export type NegotiationEvaluation = {
  decision: NegotiationDecision;
  counter_offer_cents: number | null;
  agreed_price_cents: number | null;
};

export function evaluateNegotiation(input: {
  offer_cents: number;
  loadboard_rate_cents: number;
}): NegotiationEvaluation {
  const acceptThreshold = input.loadboard_rate_cents * 0.95;
  const counterThreshold = input.loadboard_rate_cents * 0.85;

  if (input.offer_cents >= acceptThreshold) {
    return {
      decision: "accept",
      counter_offer_cents: null,
      agreed_price_cents: input.offer_cents,
    };
  }

  if (input.offer_cents >= counterThreshold) {
    return {
      decision: "counter",
      counter_offer_cents: Math.round((input.offer_cents + input.loadboard_rate_cents) / 2),
      agreed_price_cents: null,
    };
  }

  return {
    decision: "reject",
    counter_offer_cents: null,
    agreed_price_cents: null,
  };
}
