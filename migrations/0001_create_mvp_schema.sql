PRAGMA foreign_keys = ON;

CREATE TABLE loads (
  load_id TEXT PRIMARY KEY,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  pickup_datetime TEXT NOT NULL,
  delivery_datetime TEXT NOT NULL,
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('dry_van', 'reefer', 'flatbed')),
  loadboard_rate_cents INTEGER NOT NULL CHECK (loadboard_rate_cents > 0),
  notes TEXT,
  weight INTEGER NOT NULL CHECK (weight > 0),
  commodity_type TEXT NOT NULL,
  num_of_pieces INTEGER NOT NULL CHECK (num_of_pieces > 0),
  miles INTEGER NOT NULL CHECK (miles > 0),
  dimensions TEXT
);

CREATE INDEX idx_loads_lane ON loads(origin, destination);
CREATE INDEX idx_loads_equipment_type ON loads(equipment_type);
CREATE INDEX idx_loads_pickup_datetime ON loads(pickup_datetime);

CREATE TABLE carrier_verifications (
  mc_number TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')),
  eligible INTEGER NOT NULL CHECK (eligible IN (0, 1)),
  source TEXT NOT NULL CHECK (source IN ('fmcsa', 'mock'))
);

CREATE INDEX idx_carrier_verifications_eligible ON carrier_verifications(eligible);

CREATE TABLE calls (
  call_id TEXT PRIMARY KEY,
  external_call_id TEXT NOT NULL UNIQUE,
  mc_number TEXT NOT NULL,
  load_id TEXT,
  outcome TEXT NOT NULL CHECK (
    outcome IN (
      'booked',
      'carrier_ineligible',
      'no_matching_load',
      'not_interested',
      'price_not_agreed',
      'incomplete'
    )
  ),
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  agreed_price_cents INTEGER,
  negotiation_rounds INTEGER NOT NULL DEFAULT 0 CHECK (negotiation_rounds BETWEEN 0 AND 3),
  transferred INTEGER NOT NULL DEFAULT 0 CHECK (transferred IN (0, 1)),
  extracted TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mc_number) REFERENCES carrier_verifications(mc_number),
  FOREIGN KEY (load_id) REFERENCES loads(load_id)
);

CREATE INDEX idx_calls_mc_number ON calls(mc_number);
CREATE INDEX idx_calls_load_id ON calls(load_id);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
