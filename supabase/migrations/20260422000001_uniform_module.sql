-- ============================================================
-- Uniform Management Module
-- ============================================================

-- TENANTS
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- BRANCHES
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- PROFILES (app users — managers, owners)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'hr_admin', 'branch_manager', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STAFF MEMBERS (restaurant employees who receive uniforms, not app users)
CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  name TEXT NOT NULL,
  role_category TEXT NOT NULL CHECK (role_category IN ('chef', 'counter', 'cashier', 'supervisor', 'hk_boys', 'hk_ladies')),
  shift TEXT NOT NULL DEFAULT '1' CHECK (shift IN ('1', '2', 'both')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, branch_id, employee_code)
);
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- UNIFORM CATEGORIES (Chef, Counter, Cashier, etc.)
CREATE TABLE uniform_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code_prefix TEXT NOT NULL,
  has_shirt BOOLEAN NOT NULL DEFAULT true,
  has_pant BOOLEAN NOT NULL DEFAULT true,
  has_apron BOOLEAN NOT NULL DEFAULT true,
  color_hex TEXT NOT NULL DEFAULT '#64748b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE uniform_categories ENABLE ROW LEVEL SECURITY;

-- UNIFORM ITEMS (every physical piece — shirt/pant/apron — has a unique QR code)
CREATE TABLE uniform_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES uniform_categories(id),
  item_type TEXT NOT NULL CHECK (item_type IN ('shirt', 'pant', 'apron')),
  position_code TEXT NOT NULL,       -- e.g. "CH1", "S2" — human-readable identifier
  set_number INTEGER NOT NULL CHECK (set_number IN (1, 2)),
  qr_code TEXT NOT NULL UNIQUE,      -- UUID printed on label for scanning
  current_status TEXT NOT NULL DEFAULT 'in_store'
    CHECK (current_status IN ('with_staff', 'in_laundry', 'in_store', 'damaged', 'lost')),
  current_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE uniform_items ENABLE ROW LEVEL SECURITY;

-- UNIFORM TRANSITIONS (full audit history of every state change)
CREATE TABLE uniform_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uniform_item_id UUID NOT NULL REFERENCES uniform_items(id) ON DELETE CASCADE,
  from_status TEXT CHECK (from_status IN ('with_staff', 'in_laundry', 'in_store', 'damaged', 'lost')),
  to_status TEXT NOT NULL CHECK (to_status IN ('with_staff', 'in_laundry', 'in_store', 'damaged', 'lost')),
  staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE uniform_transitions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS for RLS (SECURITY DEFINER bypasses RLS
-- when these functions query the profiles table)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- tenants: users can read their own tenant
CREATE POLICY "view_own_tenant"
  ON tenants FOR SELECT
  USING (id = get_user_tenant_id());

-- branches: all tenant members can read; owner/hr_admin can write
CREATE POLICY "view_own_tenant_branches"
  ON branches FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "manage_branches"
  ON branches FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'hr_admin'))
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'hr_admin'));

-- profiles: users can always read own row; can read same-tenant profiles
CREATE POLICY "view_own_profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "view_same_tenant_profiles"
  ON profiles FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- staff_members: all tenant members can read; managers write in scope
CREATE POLICY "view_staff"
  ON staff_members FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "manage_staff"
  ON staff_members FOR ALL
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      get_user_role() IN ('owner', 'hr_admin')
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    )
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND (
      get_user_role() IN ('owner', 'hr_admin')
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    )
  );

-- uniform_categories: all tenant members can read; owner/hr_admin write
CREATE POLICY "view_categories"
  ON uniform_categories FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "manage_categories"
  ON uniform_categories FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'hr_admin'))
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() IN ('owner', 'hr_admin'));

-- uniform_items: all tenant members can read; managers write in scope
CREATE POLICY "view_items"
  ON uniform_items FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "manage_items"
  ON uniform_items FOR ALL
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      get_user_role() IN ('owner', 'hr_admin')
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    )
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND (
      get_user_role() IN ('owner', 'hr_admin')
      OR (get_user_role() = 'branch_manager' AND branch_id = get_user_branch_id())
    )
  );

-- uniform_transitions: all tenant members can read; managers can insert
CREATE POLICY "view_transitions"
  ON uniform_transitions FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "insert_transitions"
  ON uniform_transitions FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('owner', 'hr_admin', 'branch_manager')
  );

-- ============================================================
-- TRANSITION FUNCTION (atomic: updates item + logs history)
-- ============================================================

CREATE OR REPLACE FUNCTION transition_uniform(
  p_item_id UUID,
  p_new_status TEXT,
  p_staff_id UUID DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_status TEXT;
  v_tenant_id UUID;
BEGIN
  SELECT current_status, tenant_id INTO v_current_status, v_tenant_id
  FROM uniform_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Uniform item not found: %', p_item_id;
  END IF;

  INSERT INTO uniform_transitions (
    tenant_id, uniform_item_id, from_status, to_status, staff_id, performed_by, notes
  ) VALUES (
    v_tenant_id, p_item_id, v_current_status, p_new_status, p_staff_id, p_performed_by, p_notes
  );

  UPDATE uniform_items SET
    current_status = p_new_status,
    current_staff_id = CASE WHEN p_new_status = 'with_staff' THEN p_staff_id ELSE NULL END,
    updated_at = now()
  WHERE id = p_item_id;
END;
$$;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_branches_tenant ON branches(tenant_id);
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_staff_branch ON staff_members(branch_id);
CREATE INDEX idx_staff_tenant ON staff_members(tenant_id);
CREATE INDEX idx_categories_tenant ON uniform_categories(tenant_id);
CREATE INDEX idx_items_branch ON uniform_items(branch_id);
CREATE INDEX idx_items_status ON uniform_items(current_status);
CREATE INDEX idx_items_staff ON uniform_items(current_staff_id);
CREATE INDEX idx_items_qr ON uniform_items(qr_code);
CREATE INDEX idx_transitions_item ON uniform_transitions(uniform_item_id);
CREATE INDEX idx_transitions_staff ON uniform_transitions(staff_id);
CREATE INDEX idx_transitions_created ON uniform_transitions(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON uniform_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON uniform_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
