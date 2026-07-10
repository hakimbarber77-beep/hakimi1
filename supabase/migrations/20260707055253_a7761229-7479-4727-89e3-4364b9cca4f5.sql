CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id text NOT NULL UNIQUE,
  read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage notification reads" ON public.notification_reads
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE TRIGGER trg_notification_reads_updated BEFORE UPDATE ON public.notification_reads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();