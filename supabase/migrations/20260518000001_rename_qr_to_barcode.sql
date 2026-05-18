-- Rename column qr_code -> barcode
ALTER TABLE uniform_items RENAME COLUMN qr_code TO barcode;

-- Drop old index (renamed with column in some engines, but explicit is safer)
DROP INDEX IF EXISTS uniform_items_qr_code_unique;

-- Recreate unique partial index under new name
CREATE UNIQUE INDEX IF NOT EXISTS uniform_items_barcode_unique
  ON uniform_items (barcode)
  WHERE deleted_at IS NULL;

-- Assign 6-digit numeric codes to all existing items using a sequence for uniqueness
CREATE SEQUENCE IF NOT EXISTS uniform_barcode_seq START 100001;
UPDATE uniform_items
  SET barcode = LPAD(NEXTVAL('uniform_barcode_seq')::TEXT, 6, '0')
  WHERE deleted_at IS NULL;
