export type Env = {
  API_KEY: string;
  DB?: D1Database;
};

export type CarrierVerificationSource = "fmcsa" | "mock";

export type CarrierVerification = {
  mc_number: string;
  legal_name: string;
  status: "active" | "inactive" | "suspended";
  eligible: boolean;
  source: CarrierVerificationSource;
};

export type Load = {
  load_id: string;
  origin: string;
  destination: string;
  pickup_datetime: string;
  delivery_datetime: string;
  equipment_type: string;
  loadboard_rate_cents: number;
  notes: string;
  weight: number;
  commodity_type: string;
  num_of_pieces: number;
  miles: number;
  dimensions: string;
};

export type NegotiationDecision = "accept" | "counter" | "reject";

export type CallOutcome =
  | "booked"
  | "carrier_ineligible"
  | "no_matching_load"
  | "not_interested"
  | "price_not_agreed"
  | "incomplete";

export type Sentiment = "positive" | "neutral" | "negative";
