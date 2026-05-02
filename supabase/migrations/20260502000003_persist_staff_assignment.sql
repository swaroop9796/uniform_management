-- Staff assignment now persists across status changes.
-- current_staff_id is only updated when p_staff_id is explicitly provided (not null).
-- A status change alone (e.g. to laundry) no longer clears who the uniform belongs to.

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
  v_old_status     TEXT;
  v_old_state_id   UUID;
  v_old_staff_id   UUID;
  v_tenant_id      UUID;
  v_final_status   TEXT;
  v_final_state_id UUID;
BEGIN
  SELECT current_status, asset_state_id, current_staff_id, tenant_id
  INTO v_old_status, v_old_state_id, v_old_staff_id, v_tenant_id
  FROM uniform_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Uniform item not found: %', p_item_id;
  END IF;

  IF p_state_id IS NOT NULL THEN
    SELECT name INTO v_final_status
    FROM asset_states WHERE id = p_state_id AND tenant_id = v_tenant_id;
    v_final_state_id := p_state_id;
  ELSE
    v_final_status   := p_new_status;
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
    current_status   = v_final_status,
    asset_state_id   = v_final_state_id,
    -- Only change staff assignment when explicitly provided; keep existing otherwise
    current_staff_id = CASE WHEN p_staff_id IS NOT NULL THEN p_staff_id ELSE v_old_staff_id END,
    updated_at       = now()
  WHERE id = p_item_id;
END;
$$;
