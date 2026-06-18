INSERT INTO carrier_verifications (
  mc_number,
  legal_name,
  status,
  eligible,
  source
) VALUES
  ('123456', 'Example Carrier LLC', 'active', 1, 'mock'),
  ('654321', 'Blocked Carrier Inc', 'inactive', 0, 'mock');

INSERT INTO loads (
  load_id,
  origin,
  destination,
  pickup_datetime,
  delivery_datetime,
  equipment_type,
  loadboard_rate_cents,
  notes,
  weight,
  commodity_type,
  num_of_pieces,
  miles,
  dimensions
) VALUES
  (
    'LD-1001',
    'Chicago, IL',
    'Dallas, TX',
    '2026-06-19T09:00:00-05:00',
    '2026-06-21T15:00:00-05:00',
    'dry_van',
    240000,
    'Appointment required at pickup.',
    42000,
    'packaged_food',
    24,
    925,
    '53 ft trailer'
  ),
  (
    'LD-1002',
    'Omaha, NE',
    'Phoenix, AZ',
    '2026-06-20T08:00:00-05:00',
    '2026-06-22T18:00:00-07:00',
    'reefer',
    185000,
    'Temperature-controlled freight.',
    38000,
    'frozen_food',
    18,
    1300,
    '53 ft reefer'
  ),
  (
    'LD-1003',
    'Denver, CO',
    'El Paso, TX',
    '2026-06-18T07:30:00-06:00',
    '2026-06-18T18:00:00-06:00',
    'flatbed',
    132000,
    'Tarp required.',
    46000,
    'construction_materials',
    12,
    635,
    '48 ft flatbed'
  ),
  (
    'LD-1004',
    'Seattle, WA',
    'Portland, OR',
    '2026-06-25T10:00:00-07:00',
    '2026-06-25T14:00:00-07:00',
    'dry_van',
    99000,
    'Short-haul lane for quick turn loads.',
    28000,
    'retail_goods',
    16,
    175,
    '53 ft trailer'
  );
