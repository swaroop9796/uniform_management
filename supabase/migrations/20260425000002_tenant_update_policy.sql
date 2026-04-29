-- Allow owners to update their own company name
CREATE POLICY "owner_update_tenant"
  ON tenants FOR UPDATE
  USING (id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (id = get_user_tenant_id() AND get_user_role() = 'owner');
