
-- ROLE SYSTEM
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- First user claims admin if none exists yet
CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_count int;
BEGIN
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count = 0 AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE POLICY "Admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin() OR user_id = auth.uid());

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- BARBERS
CREATE TABLE public.barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  photo_url text,
  phone text,
  address text,
  date_joined date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'active',
  salary numeric NOT NULL DEFAULT 0,
  commission_percent numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT ALL ON public.barbers TO service_role;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage barbers" ON public.barbers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_barbers_updated BEFORE UPDATE ON public.barbers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SERVICES
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_am text,
  price numeric NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage services" ON public.services FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SALES
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  notes text,
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage sales" ON public.sales FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE INDEX idx_sales_sold_at ON public.sales(sold_at DESC);
CREATE INDEX idx_sales_barber ON public.sales(barber_id);

-- SALE ITEMS
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage sale_items" ON public.sale_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);

-- SUPPLIERS
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  phone text,
  email text,
  address text,
  products text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INVENTORY
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'pcs',
  purchase_price numeric NOT NULL DEFAULT 0,
  selling_price numeric,
  minimum_stock numeric NOT NULL DEFAULT 0,
  barcode text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage inventory" ON public.inventory FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STOCK IN
CREATE TABLE public.stock_in (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  invoice_number text,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  product_name text,
  quantity numeric NOT NULL DEFAULT 0,
  purchase_price numeric NOT NULL DEFAULT 0,
  received_at date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_in TO authenticated;
GRANT ALL ON public.stock_in TO service_role;
ALTER TABLE public.stock_in ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage stock_in" ON public.stock_in FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- STOCK USAGE
CREATE TABLE public.stock_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  product_name text,
  quantity numeric NOT NULL DEFAULT 0,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  reason text,
  used_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_usage TO authenticated;
GRANT ALL ON public.stock_usage TO service_role;
ALTER TABLE public.stock_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage stock_usage" ON public.stock_usage FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'other',
  amount numeric NOT NULL DEFAULT 0,
  description text,
  receipt_url text,
  spent_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE INDEX idx_expenses_spent_at ON public.expenses(spent_at DESC);

-- PAYROLL
CREATE TABLE public.payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  period text NOT NULL,
  salary numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  advance numeric NOT NULL DEFAULT 0,
  deduction numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll TO authenticated;
GRANT ALL ON public.payroll TO service_role;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage payroll" ON public.payroll FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_payroll_updated BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SALARY PAYMENTS
CREATE TABLE public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  payroll_id uuid REFERENCES public.payroll(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_payments TO authenticated;
GRANT ALL ON public.salary_payments TO service_role;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage salary_payments" ON public.salary_payments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SETTINGS
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL DEFAULT 'Hakimi Barber Shop',
  logo_url text,
  address text,
  phone text,
  currency text NOT NULL DEFAULT 'ETB',
  language text NOT NULL DEFAULT 'en',
  daily_target numeric NOT NULL DEFAULT 5000,
  business_info text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage settings" ON public.settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED
INSERT INTO public.services (name, name_am, price) VALUES
  ('Hair Cut', 'ፀጉር መቁረጥ', 300),
  ('Steam', 'እንፋሎት', 500),
  ('Hair Wash', 'ፀጉር ማጠብ', 200);

INSERT INTO public.settings (shop_name) VALUES ('Hakimi Barber Shop');
