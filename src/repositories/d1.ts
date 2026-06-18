import type { CarrierVerification, Load } from "../types";
import type {
  CallRecord,
  CallRecordInput,
  CallRepository,
  CarrierRepository,
  LoadRepository,
  LoadSearchCriteria,
  Repositories,
} from "./types";

export function createD1Repositories(db: D1Database): Repositories {
  return {
    carriers: new D1CarrierRepository(db),
    loads: new D1LoadRepository(db),
    calls: new D1CallRepository(db),
  };
}

class D1CarrierRepository implements CarrierRepository {
  constructor(private readonly db: D1Database) {}

  async findByMcNumber(mcNumber: string): Promise<CarrierVerification | null> {
    const row = await this.db
      .prepare(
        `
        SELECT mc_number, legal_name, status, eligible, source
        FROM carrier_verifications
        WHERE mc_number = ?
        `,
      )
      .bind(mcNumber)
      .first<CarrierVerificationRow>();

    return row ? mapCarrier(row) : null;
  }

  async saveVerification(carrier: CarrierVerification): Promise<void> {
    await this.db
      .prepare(
        `
        INSERT INTO carrier_verifications (mc_number, legal_name, status, eligible, source)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(mc_number) DO UPDATE SET
          legal_name = excluded.legal_name,
          status = excluded.status,
          eligible = excluded.eligible,
          source = excluded.source
        `,
      )
      .bind(
        carrier.mc_number,
        carrier.legal_name,
        carrier.status,
        carrier.eligible ? 1 : 0,
        carrier.source,
      )
      .run();
  }
}

class D1LoadRepository implements LoadRepository {
  constructor(private readonly db: D1Database) {}

  async search(criteria: LoadSearchCriteria): Promise<Load[]> {
    const pickupDateFilter = criteria.pickup_date ? "AND pickup_datetime LIKE ?" : "";
    const bindings = [
      criteria.origin,
      criteria.destination,
      criteria.equipment_type,
      ...(criteria.pickup_date ? [`${criteria.pickup_date}%`] : []),
    ];
    const result = await this.db
      .prepare(
        `
        SELECT *
        FROM loads
        WHERE origin = ?
          AND destination = ?
          AND equipment_type = ?
          ${pickupDateFilter}
        ORDER BY pickup_datetime ASC
        LIMIT 5
        `,
      )
      .bind(...bindings)
      .all<LoadRow>();

    return result.results.map(mapLoad);
  }

  async findById(loadId: string): Promise<Load | null> {
    const row = await this.db
      .prepare(
        `
        SELECT *
        FROM loads
        WHERE load_id = ?
        `,
      )
      .bind(loadId)
      .first<LoadRow>();

    return row ? mapLoad(row) : null;
  }
}

class D1CallRepository implements CallRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: CallRecordInput): Promise<CallRecord> {
    const call: CallRecord = {
      ...input,
      call_id: `call_${crypto.randomUUID().replaceAll("-", "")}`,
      created_at: new Date().toISOString(),
    };

    await this.db
      .prepare(
        `
        INSERT INTO calls (
          call_id,
          external_call_id,
          mc_number,
          load_id,
          outcome,
          sentiment,
          agreed_price_cents,
          negotiation_rounds,
          transferred,
          extracted,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        call.call_id,
        call.external_call_id,
        call.mc_number,
        call.load_id ?? null,
        call.outcome,
        call.sentiment,
        call.agreed_price_cents ?? null,
        call.negotiation_rounds ?? 0,
        call.transferred ? 1 : 0,
        JSON.stringify(call.extracted ?? {}),
        call.created_at,
      )
      .run();

    return call;
  }

  async listRecent(limit: number): Promise<CallRecord[]> {
    const result = await this.db
      .prepare(
        `
        SELECT *
        FROM calls
        ORDER BY created_at DESC
        LIMIT ?
        `,
      )
      .bind(limit)
      .all<CallRow>();

    return result.results.map(mapCall);
  }

  async listAll(): Promise<CallRecord[]> {
    const result = await this.db
      .prepare(
        `
        SELECT *
        FROM calls
        ORDER BY created_at DESC
        `,
      )
      .all<CallRow>();

    return result.results.map(mapCall);
  }
}

type CarrierVerificationRow = {
  mc_number: string;
  legal_name: string;
  status: "active" | "inactive" | "suspended";
  eligible: number;
  source: "fmcsa" | "mock";
};

type LoadRow = Load;

type CallRow = {
  call_id: string;
  external_call_id: string;
  mc_number: string;
  load_id: string | null;
  outcome: CallRecord["outcome"];
  sentiment: CallRecord["sentiment"];
  agreed_price_cents: number | null;
  negotiation_rounds: number | null;
  transferred: number;
  extracted: string;
  created_at: string;
};

function mapCarrier(row: CarrierVerificationRow): CarrierVerification {
  return {
    mc_number: row.mc_number,
    legal_name: row.legal_name,
    status: row.status,
    eligible: row.eligible === 1,
    source: row.source,
  };
}

function mapLoad(row: LoadRow): Load {
  return {
    ...row,
    notes: row.notes ?? "",
    dimensions: row.dimensions ?? "",
  };
}

function mapCall(row: CallRow): CallRecord {
  return {
    call_id: row.call_id,
    external_call_id: row.external_call_id,
    mc_number: row.mc_number,
    load_id: row.load_id,
    outcome: row.outcome,
    sentiment: row.sentiment,
    agreed_price_cents: row.agreed_price_cents,
    negotiation_rounds: row.negotiation_rounds,
    transferred: row.transferred === 1,
    extracted: parseExtracted(row.extracted),
    created_at: row.created_at,
  };
}

function parseExtracted(value: string): CallRecord["extracted"] {
  try {
    return JSON.parse(value) as CallRecord["extracted"];
  } catch {
    return {};
  }
}
