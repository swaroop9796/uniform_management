-- Soft delete column for uniform_items
ALTER TABLE uniform_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial unique indexes (only enforce among non-deleted rows)
CREATE UNIQUE INDEX IF NOT EXISTS uniform_items_qr_code_unique
  ON uniform_items (qr_code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniform_items_position_unique
  ON uniform_items (tenant_id, branch_id, position_code, item_type, set_number)
  WHERE deleted_at IS NULL;
