-- ============================================
-- MIGRATION 006: Create Audit Trail
-- Tracks all INSERT, UPDATE, DELETE operations
-- ============================================

-- ============================================
-- AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[], -- List of changed column names for UPDATE
  changed_by UUID REFERENCES auth.users(id),
  changed_by_user_id UUID, -- Reference to public.users.id
  ip_address INET,
  user_agent TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON public.audit_log(changed_by);

-- Composite index for querying specific record history
CREATE INDEX IF NOT EXISTS idx_audit_log_record_history
  ON public.audit_log(table_name, record_id, changed_at DESC);

-- ============================================
-- GENERIC AUDIT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[];
  record_id UUID;
  key TEXT;
BEGIN
  -- Determine the record ID
  IF TG_OP = 'DELETE' THEN
    record_id := OLD.id;
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    record_id := NEW.id;
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    record_id := NEW.id;
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);

    -- Calculate changed fields
    changed_fields := ARRAY[]::TEXT[];
    FOR key IN SELECT jsonb_object_keys(new_data)
    LOOP
      IF (old_data->key IS DISTINCT FROM new_data->key) THEN
        changed_fields := changed_fields || key;
      END IF;
    END LOOP;

    -- Skip if no actual changes
    IF array_length(changed_fields, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Insert audit record
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    changed_by,
    changed_by_user_id
  ) VALUES (
    TG_TABLE_NAME,
    record_id,
    TG_OP,
    old_data,
    new_data,
    changed_fields,
    auth.uid(),
    public.get_current_user_id()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE AUDIT TRIGGERS FOR ALL MAIN TABLES
-- ============================================

-- Users
DROP TRIGGER IF EXISTS audit_users ON public.users;
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Branches
DROP TRIGGER IF EXISTS audit_branches ON public.branches;
CREATE TRIGGER audit_branches
  AFTER INSERT OR UPDATE OR DELETE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Students
DROP TRIGGER IF EXISTS audit_students ON public.students;
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Parents
DROP TRIGGER IF EXISTS audit_parents ON public.parents;
CREATE TRIGGER audit_parents
  AFTER INSERT OR UPDATE OR DELETE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Parent-Students (junction)
DROP TRIGGER IF EXISTS audit_parent_students ON public.parent_students;
CREATE TRIGGER audit_parent_students
  AFTER INSERT OR UPDATE OR DELETE ON public.parent_students
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Courses
DROP TRIGGER IF EXISTS audit_courses ON public.courses;
CREATE TRIGGER audit_courses
  AFTER INSERT OR UPDATE OR DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Packages
DROP TRIGGER IF EXISTS audit_packages ON public.packages;
CREATE TRIGGER audit_packages
  AFTER INSERT OR UPDATE OR DELETE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Enrollments
DROP TRIGGER IF EXISTS audit_enrollments ON public.enrollments;
CREATE TRIGGER audit_enrollments
  AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Attendance
DROP TRIGGER IF EXISTS audit_attendance ON public.attendance;
CREATE TRIGGER audit_attendance
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Payments
DROP TRIGGER IF EXISTS audit_payments ON public.payments;
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Adcoin Transactions
DROP TRIGGER IF EXISTS audit_adcoin_transactions ON public.adcoin_transactions;
CREATE TRIGGER audit_adcoin_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.adcoin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Items
DROP TRIGGER IF EXISTS audit_items ON public.items;
CREATE TRIGGER audit_items
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Missions
DROP TRIGGER IF EXISTS audit_missions ON public.missions;
CREATE TRIGGER audit_missions
  AFTER INSERT OR UPDATE OR DELETE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ============================================
-- HELPER: Get audit history for a record
-- ============================================
CREATE OR REPLACE FUNCTION public.get_audit_history(
  p_table_name TEXT,
  p_record_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  action TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  changed_by UUID,
  changed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.action,
    al.old_data,
    al.new_data,
    al.changed_fields,
    al.changed_by,
    al.changed_at
  FROM public.audit_log al
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.changed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS for audit_log (admins only)
-- ============================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

-- No one can directly insert/update/delete - only through triggers
CREATE POLICY "No direct inserts"
  ON public.audit_log FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "No updates"
  ON public.audit_log FOR UPDATE
  USING (FALSE);

CREATE POLICY "No deletes"
  ON public.audit_log FOR DELETE
  USING (FALSE);
