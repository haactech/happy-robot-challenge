import type { CarrierVerification, CallOutcome, Load, Sentiment } from "../types";

export type CallRecordInput = {
  external_call_id: string;
  mc_number: string;
  load_id?: string | null;
  outcome: CallOutcome;
  sentiment: Sentiment;
  agreed_price_cents?: number | null;
  negotiation_rounds?: number | null;
  transferred: boolean;
  extracted?: {
    carrier_contact_name?: string;
    carrier_phone?: string;
    initial_offer_cents?: number;
    final_offer_cents?: number;
    notes?: string;
  };
};

export type CallRecord = CallRecordInput & {
  call_id: string;
  created_at: string;
};

export type CarrierRepository = {
  findByMcNumber(mcNumber: string): Promise<CarrierVerification | null>;
  saveVerification(carrier: CarrierVerification): Promise<void>;
};

export type LoadSearchCriteria = {
  origin: string;
  destination: string;
  equipment_type: string;
  pickup_date?: string;
};

export type LoadRepository = {
  search(criteria: LoadSearchCriteria): Promise<Load[]>;
  findById(loadId: string): Promise<Load | null>;
};

export type CallRepository = {
  create(input: CallRecordInput): Promise<CallRecord>;
  listRecent(limit: number): Promise<CallRecord[]>;
  listAll(): Promise<CallRecord[]>;
};

export type Repositories = {
  carriers: CarrierRepository;
  loads: LoadRepository;
  calls: CallRepository;
};
