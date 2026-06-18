import { demoCarriers, demoLoads } from "../fixtures/demoData";
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

export class InMemoryCarrierRepository implements CarrierRepository {
  private carriers = new Map<string, CarrierVerification>();

  constructor(initialCarriers: CarrierVerification[] = demoCarriers) {
    for (const carrier of initialCarriers) {
      this.carriers.set(carrier.mc_number, carrier);
    }
  }

  async findByMcNumber(mcNumber: string): Promise<CarrierVerification | null> {
    return this.carriers.get(mcNumber) ?? null;
  }

  async saveVerification(carrier: CarrierVerification): Promise<void> {
    this.carriers.set(carrier.mc_number, carrier);
  }
}

export class InMemoryLoadRepository implements LoadRepository {
  constructor(private readonly loads: Load[] = demoLoads) {}

  async search(criteria: LoadSearchCriteria): Promise<Load[]> {
    return this.loads.filter((load) => {
      return (
        matchesLocation(load.origin, criteria.origin) &&
        matchesLocation(load.destination, criteria.destination) &&
        load.equipment_type === criteria.equipment_type
      );
    });
  }

  async findById(loadId: string): Promise<Load | null> {
    return this.loads.find((load) => load.load_id === loadId) ?? null;
  }
}

export class InMemoryCallRepository implements CallRepository {
  private calls: CallRecord[] = [];

  async create(input: CallRecordInput): Promise<CallRecord> {
    const call: CallRecord = {
      ...input,
      call_id: `call_${String(this.calls.length + 1).padStart(6, "0")}`,
      created_at: new Date(this.calls.length).toISOString(),
    };
    this.calls.push(call);
    return call;
  }

  async listRecent(limit: number): Promise<CallRecord[]> {
    return [...this.calls]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, limit);
  }

  async listAll(): Promise<CallRecord[]> {
    return [...this.calls];
  }
}

export function createInMemoryRepositories(): Repositories {
  return {
    carriers: new InMemoryCarrierRepository(),
    loads: new InMemoryLoadRepository(),
    calls: new InMemoryCallRepository(),
  };
}

function matchesLocation(actual: string, requested: string): boolean {
  return actual.toLowerCase() === requested.toLowerCase();
}
