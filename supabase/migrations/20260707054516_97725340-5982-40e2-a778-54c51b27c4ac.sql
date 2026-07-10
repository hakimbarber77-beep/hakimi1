-- Move privilege-check functions out of the API-exposed public schema into a
-- private schema so they can no longer be called directly over the Data API by
-- anon or authenticated users, while still being usable inside RLS policies.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- Recreate every policy to reference the private helper.
DROP POLICY "Admin manage barbers" ON public.barbers;
CREATE POLICY "Admin manage barbers" ON public.barbers FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage services" ON public.services;
CREATE POLICY "Admin manage services" ON public.services FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage sales" ON public.sales;
CREATE POLICY "Admin manage sales" ON public.sales FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage sale_items" ON public.sale_items;
CREATE POLICY "Admin manage sale_items" ON public.sale_items FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage suppliers" ON public.suppliers;
CREATE POLICY "Admin manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage inventory" ON public.inventory;
CREATE POLICY "Admin manage inventory" ON public.inventory FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage stock_in" ON public.stock_in;
CREATE POLICY "Admin manage stock_in" ON public.stock_in FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage stock_usage" ON public.stock_usage;
CREATE POLICY "Admin manage stock_usage" ON public.stock_usage FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage expenses" ON public.expenses;
CREATE POLICY "Admin manage expenses" ON public.expenses FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage payroll" ON public.payroll;
CREATE POLICY "Admin manage payroll" ON public.payroll FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage salary_payments" ON public.salary_payments;
CREATE POLICY "Admin manage salary_payments" ON public.salary_payments FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admin manage settings" ON public.settings;
CREATE POLICY "Admin manage settings" ON public.settings FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY "Admins read roles" ON public.user_roles;
CREATE POLICY "Admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (private.is_admin() OR user_id = auth.uid());

-- Now the old public helpers are unreferenced; drop them (removes them from the
-- exposed API). claim_admin allowed the first authenticated user to self-grant
-- admin, enabling a first-admin takeover race, and is no longer used.
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.claim_admin();

-- Make the fail-closed intent explicit on the PIN tables: no anon/authenticated
-- client may ever read or write them; they are reachable only via the
-- service-role server code.
CREATE POLICY "No client access to admin_security" ON public.admin_security
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No client access to pin_change_log" ON public.pin_change_log
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);