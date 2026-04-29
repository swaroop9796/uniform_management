-- ============================================================
-- Seed: Demo data for Bengaluru Cafe — Jayanagar branch
-- Run via: supabase db reset
-- Login: owner@demo.com / manager@demo.com  password: demo1234
-- ============================================================

DO $$
DECLARE
  v_tenant_id UUID := 'b1000000-0000-0000-0000-000000000001';
  v_branch_id UUID := 'b2000000-0000-0000-0000-000000000001';
  v_owner_id  UUID := 'b3000000-0000-0000-0000-000000000001';
  v_mgr_id    UUID := 'b3000000-0000-0000-0000-000000000002';
  v_swaroop_id UUID := 'b3000000-0000-0000-0000-000000000003';

  -- Uniform category IDs
  v_cat_chef      UUID := 'c0000000-0000-0000-0000-000000000001';
  v_cat_counter   UUID := 'c0000000-0000-0000-0000-000000000002';
  v_cat_cashier   UUID := 'c0000000-0000-0000-0000-000000000003';
  v_cat_super     UUID := 'c0000000-0000-0000-0000-000000000004';
  v_cat_hk_boys   UUID := 'c0000000-0000-0000-0000-000000000005';
  v_cat_hk_ladies UUID := 'c0000000-0000-0000-0000-000000000006';

  -- Config IDs (looked up after seed_company_defaults)
  v_state_with_staff UUID;
  v_state_in_laundry UUID;
  v_state_in_store   UUID;

  v_scat_chef      UUID;
  v_scat_counter   UUID;
  v_scat_cashier   UUID;
  v_scat_super     UUID;
  v_scat_hk_boys   UUID;
  v_scat_hk_ladies UUID;

  v_sub_shirt UUID;
  v_sub_pant  UUID;
  v_sub_apron UUID;

  -- Loop vars
  v_staff      JSONB;
  v_staff_id   UUID;
  v_cat_id     UUID;
  v_scat_id    UUID;
  v_pos_code   TEXT;
  v_has_shirt  BOOLEAN;
  v_has_pant   BOOLEAN;
  v_has_apron  BOOLEAN;
  v_status1    TEXT;
  v_status2    TEXT;
  v_state_id1  UUID;
  v_state_id2  UUID;
  v_emp_idx    INTEGER := 0;
BEGIN

  -- ── TENANT ────────────────────────────────────────────────
  INSERT INTO tenants (id, name) VALUES (v_tenant_id, 'Bengaluru Cafe');

  -- ── BRANCH ────────────────────────────────────────────────
  INSERT INTO branches (id, tenant_id, name)
  VALUES (v_branch_id, v_tenant_id, 'Jayanagar');

  -- ── SEED CONFIG DEFAULTS ──────────────────────────────────
  PERFORM seed_company_defaults(v_tenant_id);

  -- ── LOOK UP CONFIG IDs ────────────────────────────────────
  SELECT id INTO v_state_with_staff FROM asset_states WHERE tenant_id = v_tenant_id AND name = 'With Staff';
  SELECT id INTO v_state_in_laundry FROM asset_states WHERE tenant_id = v_tenant_id AND name = 'In Laundry';
  SELECT id INTO v_state_in_store   FROM asset_states WHERE tenant_id = v_tenant_id AND name = 'In Store';

  SELECT id INTO v_scat_chef      FROM staff_categories WHERE tenant_id = v_tenant_id AND name = 'Chef';
  SELECT id INTO v_scat_counter   FROM staff_categories WHERE tenant_id = v_tenant_id AND name = 'Counter';
  SELECT id INTO v_scat_cashier   FROM staff_categories WHERE tenant_id = v_tenant_id AND name = 'Cashier';
  SELECT id INTO v_scat_super     FROM staff_categories WHERE tenant_id = v_tenant_id AND name = 'Supervisor';
  SELECT id INTO v_scat_hk_boys   FROM staff_categories WHERE tenant_id = v_tenant_id AND name = 'HK Boys';
  SELECT id INTO v_scat_hk_ladies FROM staff_categories WHERE tenant_id = v_tenant_id AND name = 'HK Ladies';

  SELECT id INTO v_sub_shirt FROM item_subtypes WHERE tenant_id = v_tenant_id AND name = 'Shirt';
  SELECT id INTO v_sub_pant  FROM item_subtypes WHERE tenant_id = v_tenant_id AND name = 'Pant';
  SELECT id INTO v_sub_apron FROM item_subtypes WHERE tenant_id = v_tenant_id AND name = 'Apron';

  -- ── AUTH USERS ────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    aud, role, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES
  (
    v_owner_id, '00000000-0000-0000-0000-000000000000',
    'owner@demo.com', crypt('demo1234', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Vikas"}',
    'authenticated', 'authenticated', '', '', '', ''
  ),
  (
    v_mgr_id, '00000000-0000-0000-0000-000000000000',
    'manager@demo.com', crypt('demo1234', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Harish Gowda"}',
    'authenticated', 'authenticated', '', '', '', ''
  ),
  (
    v_swaroop_id, '00000000-0000-0000-0000-000000000000',
    'swaroop.9796@gmail.com', '',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Swaroop"}',
    'authenticated', 'authenticated', '', '', '', ''
  );

  -- ── PROFILES ──────────────────────────────────────────────
  INSERT INTO profiles (id, tenant_id, full_name, role) VALUES
  (v_owner_id,   v_tenant_id, 'Vikas',        'owner'),
  (v_mgr_id,     v_tenant_id, 'Harish Gowda', 'store_manager'),
  (v_swaroop_id, v_tenant_id, 'Swaroop',       'owner');

  -- ── USER → BRANCH ASSIGNMENTS ─────────────────────────────
  INSERT INTO user_branches (user_id, branch_id) VALUES (v_mgr_id, v_branch_id);

  -- ── UNIFORM CATEGORIES ────────────────────────────────────
  INSERT INTO uniform_categories (id, tenant_id, name, code_prefix, has_shirt, has_pant, has_apron, color_hex) VALUES
  (v_cat_chef,      v_tenant_id, 'Chef',       'CH',  true,  true,  true,  '#f59e0b'),
  (v_cat_counter,   v_tenant_id, 'Counter',    'C',   true,  true,  true,  '#3b82f6'),
  (v_cat_cashier,   v_tenant_id, 'Cashier',    'CA',  true,  true,  false, '#8b5cf6'),
  (v_cat_super,     v_tenant_id, 'Supervisor', 'S',   true,  true,  false, '#06b6d4'),
  (v_cat_hk_boys,   v_tenant_id, 'HK Boys',    'HK',  true,  true,  true,  '#10b981'),
  (v_cat_hk_ladies, v_tenant_id, 'HK Ladies',  'HKL', false, false, true,  '#ec4899');

  -- ── STAFF MEMBERS (27 from client PDF) ────────────────────
  FOR v_staff IN SELECT * FROM jsonb_array_elements('[
    {"code":"1",  "name":"Rajesh Kumar",       "cat":"chef",       "scat":"Chef"},
    {"code":"2",  "name":"Venkatesh Naidu",     "cat":"chef",       "scat":"Chef"},
    {"code":"3",  "name":"Suresh Babu",         "cat":"chef",       "scat":"Chef"},
    {"code":"4",  "name":"Nagaraj S",           "cat":"chef",       "scat":"Chef"},
    {"code":"5",  "name":"Krishnappa M",        "cat":"chef",       "scat":"Chef"},
    {"code":"6",  "name":"Manjunath R",         "cat":"chef",       "scat":"Chef"},
    {"code":"7",  "name":"Siddesh Patil",       "cat":"chef",       "scat":"Chef"},
    {"code":"8",  "name":"Praveen Kumar",       "cat":"chef",       "scat":"Chef"},
    {"code":"9",  "name":"Gautham Kumar Yadav", "cat":"counter",    "scat":"Counter"},
    {"code":"10", "name":"Anitha Reddy",        "cat":"counter",    "scat":"Counter"},
    {"code":"11", "name":"Kavitha S",           "cat":"counter",    "scat":"Counter"},
    {"code":"12", "name":"Ramesh B",            "cat":"counter",    "scat":"Counter"},
    {"code":"13", "name":"Priya Kumari",        "cat":"counter",    "scat":"Counter"},
    {"code":"14", "name":"Deepa Nair",          "cat":"cashier",    "scat":"Cashier"},
    {"code":"15", "name":"Sunil Kumar",         "cat":"cashier",    "scat":"Cashier"},
    {"code":"16", "name":"Meena R",             "cat":"cashier",    "scat":"Cashier"},
    {"code":"17", "name":"Swati Menon",         "cat":"supervisor", "scat":"Supervisor"},
    {"code":"18", "name":"Ravi Shankar",        "cat":"supervisor", "scat":"Supervisor"},
    {"code":"19", "name":"Mahesh B",            "cat":"hk_boys",    "scat":"HK Boys"},
    {"code":"20", "name":"Ganesh Kumar",        "cat":"hk_boys",    "scat":"HK Boys"},
    {"code":"21", "name":"Santhosh R",          "cat":"hk_boys",    "scat":"HK Boys"},
    {"code":"22", "name":"Dinesh S",            "cat":"hk_boys",    "scat":"HK Boys"},
    {"code":"23", "name":"Muthu Kumar",         "cat":"hk_boys",    "scat":"HK Boys"},
    {"code":"24", "name":"Kiran Kumar",         "cat":"hk_boys",    "scat":"HK Boys"},
    {"code":"25", "name":"Lakshmi Devi",        "cat":"hk_ladies",  "scat":"HK Ladies"},
    {"code":"26", "name":"Saraswathi N",        "cat":"hk_ladies",  "scat":"HK Ladies"},
    {"code":"27", "name":"Bhavani S",           "cat":"hk_ladies",  "scat":"HK Ladies"}
  ]'::jsonb)
  LOOP
    v_emp_idx := v_emp_idx + 1;

    -- Resolve staff_category_id from the scat name
    CASE v_staff->>'scat'
      WHEN 'Chef'       THEN v_scat_id := v_scat_chef;
      WHEN 'Counter'    THEN v_scat_id := v_scat_counter;
      WHEN 'Cashier'    THEN v_scat_id := v_scat_cashier;
      WHEN 'Supervisor' THEN v_scat_id := v_scat_super;
      WHEN 'HK Boys'    THEN v_scat_id := v_scat_hk_boys;
      WHEN 'HK Ladies'  THEN v_scat_id := v_scat_hk_ladies;
      ELSE                   v_scat_id := v_scat_chef;
    END CASE;

    INSERT INTO staff_members (id, tenant_id, branch_id, name, role_category, staff_category_id)
    VALUES (
      gen_random_uuid(), v_tenant_id, v_branch_id,
      v_staff->>'name', v_staff->>'cat',
      v_scat_id
    )
    RETURNING id INTO v_staff_id;

    -- Resolve uniform category + items for this staff member
    CASE v_staff->>'cat'
      WHEN 'chef'       THEN v_cat_id := v_cat_chef;      v_has_shirt := true;  v_has_pant := true;  v_has_apron := true;  v_pos_code := 'CH'  || v_emp_idx;
      WHEN 'counter'    THEN v_cat_id := v_cat_counter;   v_has_shirt := true;  v_has_pant := true;  v_has_apron := true;  v_pos_code := 'C'   || (v_emp_idx - 8);
      WHEN 'cashier'    THEN v_cat_id := v_cat_cashier;   v_has_shirt := true;  v_has_pant := true;  v_has_apron := false; v_pos_code := 'CA'  || (v_emp_idx - 13);
      WHEN 'supervisor' THEN v_cat_id := v_cat_super;     v_has_shirt := true;  v_has_pant := true;  v_has_apron := false; v_pos_code := 'S'   || (v_emp_idx - 16);
      WHEN 'hk_boys'    THEN v_cat_id := v_cat_hk_boys;   v_has_shirt := true;  v_has_pant := true;  v_has_apron := true;  v_pos_code := 'HK'  || (v_emp_idx - 18);
      WHEN 'hk_ladies'  THEN v_cat_id := v_cat_hk_ladies; v_has_shirt := false; v_has_pant := false; v_has_apron := true;  v_pos_code := 'HKL' || (v_emp_idx - 24);
      ELSE v_cat_id := v_cat_chef; v_has_shirt := true; v_has_pant := true; v_has_apron := false; v_pos_code := 'X1';
    END CASE;

    -- Realistic status spread: Set 1 mostly with staff, Set 2 mixed
    IF (v_emp_idx % 5) = 0 THEN
      v_status1 := 'in_laundry'; v_state_id1 := v_state_in_laundry;
    ELSE
      v_status1 := 'with_staff'; v_state_id1 := v_state_with_staff;
    END IF;

    CASE (v_emp_idx % 4)
      WHEN 0 THEN v_status2 := 'with_staff';  v_state_id2 := v_state_with_staff;
      WHEN 1 THEN v_status2 := 'in_laundry';  v_state_id2 := v_state_in_laundry;
      ELSE        v_status2 := 'in_store';     v_state_id2 := v_state_in_store;
    END CASE;

    -- Set 1 items
    IF v_has_shirt THEN
      INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id)
      VALUES (v_tenant_id, v_branch_id, v_cat_id, 'shirt', v_sub_shirt, v_pos_code, 1, gen_random_uuid()::text,
        v_status1, v_state_id1, CASE WHEN v_status1 = 'with_staff' THEN v_staff_id ELSE NULL END);
    END IF;
    IF v_has_pant THEN
      INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id)
      VALUES (v_tenant_id, v_branch_id, v_cat_id, 'pant', v_sub_pant, v_pos_code, 1, gen_random_uuid()::text,
        v_status1, v_state_id1, CASE WHEN v_status1 = 'with_staff' THEN v_staff_id ELSE NULL END);
    END IF;
    IF v_has_apron THEN
      INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id)
      VALUES (v_tenant_id, v_branch_id, v_cat_id, 'apron', v_sub_apron, v_pos_code, 1, gen_random_uuid()::text,
        v_status1, v_state_id1, CASE WHEN v_status1 = 'with_staff' THEN v_staff_id ELSE NULL END);
    END IF;

    -- Set 2 items
    IF v_has_shirt THEN
      INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id)
      VALUES (v_tenant_id, v_branch_id, v_cat_id, 'shirt', v_sub_shirt, v_pos_code, 2, gen_random_uuid()::text,
        v_status2, v_state_id2, CASE WHEN v_status2 = 'with_staff' THEN v_staff_id ELSE NULL END);
    END IF;
    IF v_has_pant THEN
      INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id)
      VALUES (v_tenant_id, v_branch_id, v_cat_id, 'pant', v_sub_pant, v_pos_code, 2, gen_random_uuid()::text,
        v_status2, v_state_id2, CASE WHEN v_status2 = 'with_staff' THEN v_staff_id ELSE NULL END);
    END IF;
    IF v_has_apron THEN
      INSERT INTO uniform_items (tenant_id, branch_id, category_id, item_type, item_subtype_id, position_code, set_number, qr_code, current_status, asset_state_id, current_staff_id)
      VALUES (v_tenant_id, v_branch_id, v_cat_id, 'apron', v_sub_apron, v_pos_code, 2, gen_random_uuid()::text,
        v_status2, v_state_id2, CASE WHEN v_status2 = 'with_staff' THEN v_staff_id ELSE NULL END);
    END IF;

  END LOOP;

  -- ── SAMPLE TRANSITION HISTORY ─────────────────────────────
  INSERT INTO uniform_transitions (tenant_id, uniform_item_id, from_status, to_status, from_state_id, to_state_id, staff_id, performed_by, notes, created_at)
  SELECT
    ui.tenant_id, ui.id,
    'in_store', 'with_staff',
    v_state_in_store, v_state_with_staff,
    ui.current_staff_id, v_mgr_id,
    'Issued for new shift',
    now() - (random() * interval '14 days')
  FROM uniform_items ui
  WHERE ui.current_status = 'with_staff' AND ui.current_staff_id IS NOT NULL
  LIMIT 30;

  INSERT INTO uniform_transitions (tenant_id, uniform_item_id, from_status, to_status, from_state_id, to_state_id, staff_id, performed_by, notes, created_at)
  SELECT
    ui.tenant_id, ui.id,
    'with_staff', 'in_laundry',
    v_state_with_staff, v_state_in_laundry,
    NULL, v_mgr_id,
    'Sent for laundry',
    now() - (random() * interval '7 days')
  FROM uniform_items ui
  WHERE ui.current_status = 'in_laundry'
  LIMIT 15;

  INSERT INTO uniform_transitions (tenant_id, uniform_item_id, from_status, to_status, from_state_id, to_state_id, staff_id, performed_by, notes, created_at)
  SELECT
    ui.tenant_id, ui.id,
    'in_laundry', 'in_store',
    v_state_in_laundry, v_state_in_store,
    NULL, v_mgr_id,
    'Returned from laundry',
    now() - (random() * interval '3 days')
  FROM uniform_items ui
  WHERE ui.current_status = 'in_store'
  LIMIT 10;

END $$;
