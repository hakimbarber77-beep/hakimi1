-- Tips: shop income stays in sales.total; tip is tracked separately and belongs to the barber
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tip numeric NOT NULL DEFAULT 0;

-- Barber salary scheduling
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS salary_day integer NOT NULL DEFAULT 1;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS last_salary_paid_date date;

-- Tips flow into payroll net pay
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS tips numeric NOT NULL DEFAULT 0;

-- Full payment breakdown for printable payment history
ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS salary numeric NOT NULL DEFAULT 0;
ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS commission numeric NOT NULL DEFAULT 0;
ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS bonus numeric NOT NULL DEFAULT 0;
ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS tips numeric NOT NULL DEFAULT 0;
ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS deduction numeric NOT NULL DEFAULT 0;
ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS advance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS period text;

-- Helpful indexes for per-barber stats and history
CREATE INDEX IF NOT EXISTS idx_sales_barber_id ON public.sales(barber_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_barber_id ON public.salary_payments(barber_id);