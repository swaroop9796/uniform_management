ALTER TABLE staff_members DROP CONSTRAINT IF EXISTS staff_members_tenant_id_branch_id_employee_code_key;
ALTER TABLE staff_members DROP COLUMN IF EXISTS employee_code;
