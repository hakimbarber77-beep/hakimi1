-- Secure admin PIN storage (server-only; no client access, locked by RLS with no policies)
CREATE TABLE public.admin_security (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_security TO service_role;
ALTER TABLE public.admin_security ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_admin_security_updated BEFORE UPDATE ON public.admin_security FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit log of successful PIN changes (server-only)
CREATE TABLE public.pin_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pin_change_log TO service_role;
ALTER TABLE public.pin_change_log ENABLE ROW LEVEL SECURITY;