-- ============================================================
-- Production seed: Bengaluru Cafe — Basavangudi branch
-- Run once in Supabase SQL Editor (production)
-- ============================================================

DO $$
DECLARE
  v_tenant UUID := '521f74a8-0e0b-40bc-9db0-eb9c50c4ed26';
  v_branch UUID := '06336885-e9be-48f6-acab-fbccc06cac70';

  -- uniform category IDs
  v_chef UUID; v_ctr UUID; v_cash UUID; v_sup UUID; v_hkb UUID; v_hkl UUID;

  -- state + subtype IDs (resolved after seed_company_defaults)
  v_ws UUID;   -- With Staff
  v_is UUID;   -- In Store
  v_sh UUID; v_pa UUID; v_ap UUID;  -- Shirt, Pant, Apron

  v_sid UUID;  -- temp staff_id per loop
BEGIN

  -- ── 1. Company defaults ──────────────────────────────────────
  -- Creates: asset_states, staff_categories, item_subtypes
  PERFORM seed_company_defaults(v_tenant);

  SELECT id INTO v_ws FROM asset_states  WHERE tenant_id = v_tenant AND name = 'With Staff';
  SELECT id INTO v_is FROM asset_states  WHERE tenant_id = v_tenant AND name = 'In Store';
  SELECT id INTO v_sh FROM item_subtypes WHERE tenant_id = v_tenant AND name = 'Shirt';
  SELECT id INTO v_pa FROM item_subtypes WHERE tenant_id = v_tenant AND name = 'Pant';
  SELECT id INTO v_ap FROM item_subtypes WHERE tenant_id = v_tenant AND name = 'Apron';

  -- ── 2. Uniform categories ────────────────────────────────────
  v_chef := gen_random_uuid(); v_ctr  := gen_random_uuid(); v_cash := gen_random_uuid();
  v_sup  := gen_random_uuid(); v_hkb  := gen_random_uuid(); v_hkl  := gen_random_uuid();

  INSERT INTO uniform_categories (id, tenant_id, name, code_prefix, has_shirt, has_pant, has_apron, color_hex) VALUES
  (v_chef, v_tenant, 'Chef',       'CH',  true,  true,  true,  '#f59e0b'),
  (v_ctr,  v_tenant, 'Counter',    'C',   true,  true,  true,  '#3b82f6'),
  (v_cash, v_tenant, 'Cashier',    'CA',  true,  true,  false, '#8b5cf6'),
  (v_sup,  v_tenant, 'Supervisor', 'S',   true,  true,  false, '#06b6d4'),
  (v_hkb,  v_tenant, 'HK Boys',    'HK',  true,  true,  true,  '#10b981'),
  (v_hkl,  v_tenant, 'HK Ladies',  'HKL', false, false, true,  '#ec4899');

  -- ── 3. Staff + Uniform items ─────────────────────────────────
  -- Convention:
  --   Set 1 items → with_staff (currently issued to staff)
  --   Set 2 items → in_store  (spare set in store)
  -- Supervisor + Cashier have no apron.
  -- HK Ladies have apron only.

  -- 1. Preetham P — Chef — CH1
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Preetham P', 'chef') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 2. MD Samir — Chef — CH5
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'MD Samir', 'chef') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH5', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH5', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH5', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH5', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH5', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH5', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 3. Tippeswamy — Chef — CH7
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Tippeswamy', 'chef') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH7', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH7', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH7', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH7', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH7', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH7', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 4. Suraj Dhami — Chef — CH9
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Suraj Dhami', 'chef') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH9', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH9', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH9', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH9', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH9', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH9', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 5. Jeevan — Chef — CH4
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Jeevan', 'chef') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH4', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH4', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH4', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH4', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH4', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH4', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 6. Hari Teja — Cashier — CA1 (no apron)
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Hari Teja', 'cashier') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_cash, 'pant',  v_pa, 'CA1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_cash, 'shirt', v_sh, 'CA1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_cash, 'pant',  v_pa, 'CA1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_cash, 'shirt', v_sh, 'CA1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 7. K Shivaraju — Chef — CH8
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'K Shivaraju', 'chef') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH8', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH8', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH8', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH8', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH8', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH8', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 8. Anand Kumar — Chef — CH2 (Set 2 apron is C44 — replacement from counter stock)
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Anand Kumar', 'chef') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH2', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH2', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'apron', v_ap, 'CH2', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_chef, 'pant',  v_pa, 'CH2', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_chef, 'shirt', v_sh, 'CH2', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr,  'apron', v_ap, 'C44', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 9. Narad Reang — Counter — C1
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Narad Reang', 'counter') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 10. Ujit Kumar Reang — Counter — C2
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Ujit Kumar Reang', 'counter') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C2', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C2', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C2', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C2', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C2', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C2', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 11. Sani Rai Reang — Counter — C5
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Sani Rai Reang', 'counter') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C5', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C5', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C5', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C5', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C5', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C5', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 12. Majendra Reang — Counter — C6
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Majendra Reang', 'counter') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C6', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C6', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C6', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C6', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C6', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C6', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 13. Anand Dodamanni — Counter — C4
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Anand Dodamanni', 'counter') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C4', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C4', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C4', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C4', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C4', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C4', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 14. MD Rahul — Counter — C3 (Set 2 apron missing in PDF — 1 apron only)
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'MD Rahul', 'counter') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C3', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C3', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C3', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C3', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C3', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 15. Gautham Kumar Yadav — Counter — C7
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Gautham Kumar Yadav', 'counter') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C7', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C7', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C7', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_ctr, 'pant',  v_pa, 'C7', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'shirt', v_sh, 'C7', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_ctr, 'apron', v_ap, 'C7', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 16. Suran Jan Reang — HK Boys — HK9
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Suran Jan Reang', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK9', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK9', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK9', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK9', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK9', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK9', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 17. Thangfi Rai Reang — HK Boys — HK8
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Thangfi Rai Reang', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK8', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK8', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK8', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK8', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK8', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK8', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 18. Rahul Reang — HK Boys — HK5
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Rahul Reang', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK5', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK5', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK5', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK5', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK5', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK5', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 19. Chousen Reang — HK Boys — HK7
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Chousen Reang', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK7', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK7', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK7', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK7', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK7', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK7', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 20. Maten Joi Reang — HK Boys — HK2 (Set 2 shirt missing in PDF — 1 shirt only)
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Maten Joi Reang', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK2', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK2', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK2', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK2', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK2', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 21. Rahul Raju — HK Boys — HK1
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Rahul Raju', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 22. Poul Patowary — HK Boys — HK3
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Poul Patowary', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK3', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK3', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK3', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK3', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK3', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK3', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 23. Bikas Debbarma — HK Boys — HK4
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Bikas Debbarma', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK4', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK4', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK4', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK4', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK4', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK4', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 24. Ananda Reang — HK Boys — HK11
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Ananda Reang', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK11', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK11', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK11', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK11', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK11', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK11', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 25. Kiran Kumar Reang — HK Boys — HK6 (aprons are HK12)
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Kiran Kumar Reang', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK6',  1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK6',  1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK12', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK6',  2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK6',  2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK12', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 26. Bikash Gorh — HK Boys — HK10 (Set 2 shirt missing in PDF — 1 shirt only)
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Bikash Gorh', 'hk_boys') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK10', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'shirt', v_sh, 'HK10', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK10', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_hkb, 'pant',  v_pa, 'HK10', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_hkb, 'apron', v_ap, 'HK10', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

  -- 27. Rohon Kujur — Supervisor — S1 (no apron; Set 2 also present)
  INSERT INTO staff_members (tenant_id, branch_id, name, role_category)
  VALUES (v_tenant, v_branch, 'Rohon Kujur', 'supervisor') RETURNING id INTO v_sid;
  INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id) VALUES
  (v_tenant, v_branch, v_sup, 'pant',  v_pa, 'S1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_sup, 'shirt', v_sh, 'S1', 1, gen_random_uuid()::text, 'with_staff', v_ws, v_sid),
  (v_tenant, v_branch, v_sup, 'pant',  v_pa, 'S1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL),
  (v_tenant, v_branch, v_sup, 'shirt', v_sh, 'S1', 2, gen_random_uuid()::text, 'in_store',   v_is, NULL);

END $$;
