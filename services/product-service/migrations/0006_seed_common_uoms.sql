-- Seed common UOMs (Units of Measure)
-- This migration adds standard UOMs that can be used across products

-- Base unit
INSERT INTO uoms (id, code, name, conversion_factor, is_base_unit, created_at)
VALUES ('uom-pcs', 'PCS', 'Pieces', 1, 1, unixepoch());

-- Common packaging units
INSERT INTO uoms (id, code, name, conversion_factor, is_base_unit, created_at)
VALUES
  ('uom-dozen', 'DOZEN', 'Dozen (12 PCS)', 12, 0, unixepoch()),
  ('uom-box6', 'BOX6', 'Box of 6', 6, 0, unixepoch()),
  ('uom-box12', 'BOX12', 'Box of 12', 12, 0, unixepoch()),
  ('uom-box24', 'BOX24', 'Box of 24', 24, 0, unixepoch()),
  ('uom-carton18', 'CARTON18', 'Carton (18 PCS)', 18, 0, unixepoch()),
  ('uom-carton24', 'CARTON24', 'Carton (24 PCS)', 24, 0, unixepoch()),
  ('uom-carton36', 'CARTON36', 'Carton (36 PCS)', 36, 0, unixepoch()),
  ('uom-carton48', 'CARTON48', 'Carton (48 PCS)', 48, 0, unixepoch()),
  ('uom-pack', 'PACK', 'Pack (10 PCS)', 10, 0, unixepoch()),
  ('uom-bundle', 'BUNDLE', 'Bundle (5 PCS)', 5, 0, unixepoch());
