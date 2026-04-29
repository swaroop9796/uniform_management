-- ============================================================
-- v1 Architecture: config-driven states/categories,
-- simplified roles (owner | store_manager),
-- multi-branch store managers
-- ============================================================

-- ── NEW TABLES ────────────────────────────────────────────

-- Staff categories (replaces hardcoded role_category enum)
CREATE TABLE staff_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  color_hex   TEXT        NOT NULL DEFAULT '#64748b',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
ALTER TABLE staff_categories ENABLE ROW LEVEL SECURITY;

-- Asset states (replaces hardcoded UniformStatus enum)
CREATE TABLE asset_states (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  color_hex         TEXT        NOT NULL DEFAULT '#64748b',
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  is_assigned_state BOOLEAN     NOT NULL DEFAULT false,  -- true = "with a person"
  is_initial_state  BOOLEAN     NOT NULL DEFAULT false,  -- true = default for new items
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
ALTER TABLE asset_states ENABLE ROW LEVEL SECURITY;

-- Item subtypes (replaces hardcoded shirt/pant/apron)
CREATE TABLE item_subtypes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
ALTER TABLE item_subtypes ENABLE ROW LEVEL SECURITY;

-- User-branch assignments (many-to-many: store_manager ↔ branches)
CREATE TABLE user_branches (
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id  UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, branch_id)
);
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;

-- User invitations (email invite flow)
CREATE TABLE user_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'store_manager' CHECK (role = 'store_manager'),
  branch_ids  UUID[]      NOT NULL DEFAULT '{}',
  invited_by  UUID        NOT NULL REFERENCES profiles(id),
  token       UUID        NOT NULL DEFAULT gen_random_uuid(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '72 hours',
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- ── ALTER EXISTING TABLES ─────────────────────────────────

-- profiles: owner | store_manager only; branch_id kept as deprecated nullable column
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'store_manager'));

-- staff_members: add staff_category_id FK; relax the role_category enum check
ALTER TABLE staff_members
  ADD COLUMN staff_category_id UUID REFERENCES staff_categories(id) ON DELETE SET NULL;
ALTER TABLE staff_members DROP CONSTRAINT staff_members_role_category_check;

-- uniform_items: add asset_state_id + item_subtype_id FKs; relax text enum checks
ALTER TABLE uniform_items
  ADD COLUMN asset_state_id  UUID REFERENCES asset_states(id)  ON DELETE SET NULL,
  ADD COLUMN item_subtype_id UUID REFERENCES item_subtypes(id) ON DELETE SET NULL;
ALTER TABLE uniform_items DROP CONSTRAINT uniform_items_current_status_check;
ALTER TABLE uniform_items DROP CONSTRAINT uniform_items_item_type_check;

-- uniform_transitions: add state FK columns; relax text enum checks
ALTER TABLE uniform_transitions
  ADD COLUMN from_state_id UUID REFERENCES asset_states(id) ON DELETE SET NULL,
  ADD COLUMN to_state_id   UUID REFERENCES asset_states(id) ON DELETE SET NULL;
ALTER TABLE uniform_transitions DROP CONSTRAINT IF EXISTS uniform_transitions_from_status_check;
ALTER TABLE uniform_transitions DROP CONSTRAINT IF EXISTS uniform_transitions_to_status_check;

-- ── HELPER FUNCTIONS ──────────────────────────────────────

-- Array of branch IDs accessible by the current user
-- (owner → all branches in tenant; store_manager → their assigned branches)
CREATE OR REPLACE FUNCTION get_user_branch_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN get_user_role() = 'owner' THEN
      ARRAY(SELECT id FROM branches WHERE tenant_id = get_user_tenant_id())
    ELSE
      ARRAY(SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
  END
$$;

-- Updated single-branch helper — now reads from user_branches (backwards compat)
CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT branch_id FROM user_branches WHERE user_id = auth.uid() LIMIT 1
$$;

-- ── RLS: NEW TABLES ───────────────────────────────────────

CREATE POLICY "view_staff_categories" ON staff_categories FOR SELECT
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "manage_staff_categories" ON staff_categories FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner');

CREATE POLICY "view_asset_states" ON asset_states FOR SELECT
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "manage_asset_states" ON asset_states FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner');

CREATE POLICY "view_item_subtypes" ON item_subtypes FOR SELECT
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "manage_item_subtypes" ON item_subtypes FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner');

CREATE POLICY "view_user_branches" ON user_branches FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'owner');
CREATE POLICY "manage_user_branches" ON user_branches FOR ALL
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "manage_invitations" ON user_invitations FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner');

-- ── RLS: UPDATE EXISTING POLICIES ────────────────────────

-- branches: owner only for writes (hr_admin removed)
DROP POLICY "manage_branches" ON branches;
CREATE POLICY "manage_branches" ON branches FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner');

-- uniform_categories: owner only for writes
DROP POLICY "manage_categories" ON uniform_categories;
CREATE POLICY "manage_categories" ON uniform_categories FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner');

-- staff_members: branch-scoped read + write
DROP POLICY "view_staff" ON staff_members;
CREATE POLICY "view_staff" ON staff_members FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND (get_user_role() = 'owner' OR branch_id = ANY(get_user_branch_ids()))
  );

DROP POLICY "manage_staff" ON staff_members;
CREATE POLICY "manage_staff" ON staff_members FOR ALL
  USING (
    tenant_id = get_user_tenant_id()
    AND (get_user_role() = 'owner' OR branch_id = ANY(get_user_branch_ids()))
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND (get_user_role() = 'owner' OR branch_id = ANY(get_user_branch_ids()))
  );

-- uniform_items: branch-scoped read + write
DROP POLICY "view_items" ON uniform_items;
CREATE POLICY "view_items" ON uniform_items FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND (get_user_role() = 'owner' OR branch_id = ANY(get_user_branch_ids()))
  );

DROP POLICY "manage_items" ON uniform_items;
CREATE POLICY "manage_items" ON uniform_items FOR ALL
  USING (
    tenant_id = get_user_tenant_id()
    AND (get_user_role() = 'owner' OR branch_id = ANY(get_user_branch_ids()))
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND (get_user_role() = 'owner' OR branch_id = ANY(get_user_branch_ids()))
  );

-- uniform_transitions: owner + store_manager can insert
DROP POLICY "insert_transitions" ON uniform_transitions;
CREATE POLICY "insert_transitions" ON uniform_transitions FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('owner', 'store_manager')
  );

-- ── SEED DEFAULTS FUNCTION ────────────────────────────────
-- Called once per company on creation (from seed.sql or onboarding)

CREATE OR REPLACE FUNCTION seed_company_defaults(p_tenant_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO asset_states (tenant_id, name, color_hex, sort_order, is_assigned_state, is_initial_state) VALUES
    (p_tenant_id, 'With Staff', '#10b981', 1, true,  false),
    (p_tenant_id, 'In Laundry', '#f59e0b', 2, false, false),
    (p_tenant_id, 'In Store',   '#3b82f6', 3, false, true),
    (p_tenant_id, 'Damaged',    '#ef4444', 4, false, false),
    (p_tenant_id, 'Lost',       '#94a3b8', 5, false, false);

  INSERT INTO staff_categories (tenant_id, name, color_hex, sort_order) VALUES
    (p_tenant_id, 'Chef',       '#f59e0b', 1),
    (p_tenant_id, 'Counter',    '#3b82f6', 2),
    (p_tenant_id, 'Cashier',    '#8b5cf6', 3),
    (p_tenant_id, 'Supervisor', '#06b6d4', 4),
    (p_tenant_id, 'HK Boys',    '#10b981', 5),
    (p_tenant_id, 'HK Ladies',  '#ec4899', 6);

  INSERT INTO item_subtypes (tenant_id, name, sort_order) VALUES
    (p_tenant_id, 'Shirt', 1),
    (p_tenant_id, 'Pant',  2),
    (p_tenant_id, 'Apron', 3);
END;
$$;

-- ── UPDATED transition_uniform FUNCTION ──────────────────
-- Backwards compatible: accepts legacy p_new_status (text) OR new p_state_id (UUID)

CREATE OR REPLACE FUNCTION transition_uniform(
  p_item_id      UUID,
  p_new_status   TEXT    DEFAULT NULL,
  p_staff_id     UUID    DEFAULT NULL,
  p_performed_by UUID    DEFAULT NULL,
  p_notes        TEXT    DEFAULT NULL,
  p_state_id     UUID    DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_status    TEXT;
  v_old_state_id  UUID;
  v_tenant_id     UUID;
  v_is_assigned   BOOLEAN := false;
  v_final_status  TEXT;
  v_final_state_id UUID;
BEGIN
  SELECT current_status, asset_state_id, tenant_id
  INTO v_old_status, v_old_state_id, v_tenant_id
  FROM uniform_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Uniform item not found: %', p_item_id;
  END IF;

  IF p_state_id IS NOT NULL THEN
    -- New path: resolve name + assigned flag from asset_states
    SELECT name, is_assigned_state INTO v_final_status, v_is_assigned
    FROM asset_states WHERE id = p_state_id AND tenant_id = v_tenant_id;
    v_final_state_id := p_state_id;
  ELSE
    -- Legacy path: text status used directly
    v_final_status   := p_new_status;
    v_is_assigned    := (p_new_status = 'with_staff');
    v_final_state_id := NULL;
  END IF;

  INSERT INTO uniform_transitions (
    tenant_id, uniform_item_id,
    from_status, to_status,
    from_state_id, to_state_id,
    staff_id, performed_by, notes
  ) VALUES (
    v_tenant_id, p_item_id,
    v_old_status, v_final_status,
    v_old_state_id, v_final_state_id,
    p_staff_id, p_performed_by, p_notes
  );

  UPDATE uniform_items SET
    current_status    = v_final_status,
    asset_state_id    = v_final_state_id,
    current_staff_id  = CASE WHEN v_is_assigned THEN p_staff_id ELSE NULL END,
    updated_at        = now()
  WHERE id = p_item_id;
END;
$$;

-- ── INDEXES ───────────────────────────────────────────────

CREATE INDEX idx_staff_category_id     ON staff_members(staff_category_id);
CREATE INDEX idx_items_asset_state     ON uniform_items(asset_state_id);
CREATE INDEX idx_items_subtype         ON uniform_items(item_subtype_id);
CREATE INDEX idx_user_branches_user    ON user_branches(user_id);
CREATE INDEX idx_user_branches_branch  ON user_branches(branch_id);
CREATE INDEX idx_transitions_to_state  ON uniform_transitions(to_state_id);
CREATE INDEX idx_invitations_token     ON user_invitations(token);
CREATE INDEX idx_invitations_tenant    ON user_invitations(tenant_id);
