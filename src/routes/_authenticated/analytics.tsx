import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { classifyService, type SaleRow, type ItemRow } from "@/lib/stats";
import { startOfDay } from "@/lib/format";
import { PageHeader, SectionCard, Spinner, EmptyState } from "@/components/shared";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

type Expense = { amount: number; spent_at: string };
type Barber = { id: string; full_name: string };
type Payment = { amount: number; paid_at: string };

const GOLD = "var(--gold)";
const PIE_COLORS = ["var(--gold)", "#c99a3b", "#8a6d2f", "#d9b877", "#b5842a"];

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
};

function AnalyticsPage() {
  const { t, lang } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [salesRes, itemsRes, expRes, barbersRes, payRes] = await Promise.all([
        supabase.from("sales").select("id, barber_id, total, tip, payment_method, sold_at, notes"),
        supabase.from("sale_items").select("sale_id, service_name, price, quantity"),
        supabase.from("expenses").select("amount, spent_at"),
        supabase.from("barbers").select("id, full_name"),
        supabase.from("salary_payments").select("amount, paid_at"),
      ]);
      return {
        sales: (salesRes.data ?? []) as SaleRow[],
        items: (itemsRes.data ?? []) as ItemRow[],
        expenses: (expRes.data ?? []) as Expense[],
        barbers: (barbersRes.data ?? []) as Barber[],
        payments: (payRes.data ?? []) as Payment[],
      };
    },
  });

  const monthLabels =
    lang === "am"
      ? ["ጃን", "ፌብ", "ማር", "ኤፕ", "ሜይ", "ጁን", "ጁላ", "ኦገ", "ሴፕ", "ኦክ", "ኖቬ", "ዲሴ"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const charts = useMemo(() => {
    if (!data) return null;

    // Sales by day (last 14 days)
    const byDay: { name: string; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(startOfDay());
      d.setDate(d.getDate() - i);
      const start = d.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const total = data.sales
        .filter((s) => {
          const ts = new Date(s.sold_at).getTime();
          return ts >= start && ts < end;
        })
        .reduce((a, s) => a + Number(s.total), 0);
      byDay.push({ name: `${d.getDate()}/${d.getMonth() + 1}`, total });
    }

    // Sales by month
    const byMonth = monthLabels.map((label, m) => ({
      name: label,
      total: data.sales.filter((s) => new Date(s.sold_at).getMonth() === m).reduce((a, s) => a + Number(s.total), 0),
    }));

    // Sales & tips by barber
    const nameOf = new Map(data.barbers.map((b) => [b.id, b.full_name]));
    const perBarber = new Map<string, { sales: number; tips: number }>();
    data.sales.forEach((s) => {
      if (!s.barber_id) return;
      const cur = perBarber.get(s.barber_id) ?? { sales: 0, tips: 0 };
      cur.sales += Number(s.total);
      cur.tips += Number(s.tip ?? 0);
      perBarber.set(s.barber_id, cur);
    });
    const barberRows = [...perBarber.entries()]
      .map(([id, v]) => ({ name: nameOf.get(id) ?? "-", sales: v.sales, tips: v.tips }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 8);

    // Service popularity (by class)
    const classTotals = { haircut: 0, wash: 0, steam: 0, other: 0 };
    data.items.forEach((it) => {
      classTotals[classifyService(it.service_name)] += Number(it.quantity);
    });
    const servicePie = [
      { name: t("haircuts"), value: classTotals.haircut },
      { name: t("washes"), value: classTotals.wash },
      { name: t("steamServices"), value: classTotals.steam },
      { name: t("otherServices"), value: classTotals.other },
    ].filter((x) => x.value > 0);

    // Salary payments by month
    const salaryByMonth = monthLabels.map((label, m) => ({
      name: label,
      total: data.payments.filter((p) => new Date(p.paid_at).getMonth() === m).reduce((a, p) => a + Number(p.amount), 0),
    }));

    // Expenses vs income + profit trend
    const incomeExpense = monthLabels.map((label, m) => {
      const income = data.sales.filter((s) => new Date(s.sold_at).getMonth() === m).reduce((a, s) => a + Number(s.total), 0);
      const expense = data.expenses.filter((e) => new Date(e.spent_at).getMonth() === m).reduce((a, e) => a + Number(e.amount), 0);
      return { name: label, income, expense, profit: income - expense };
    });

    return { byDay, byMonth, barberRows, servicePie, salaryByMonth, incomeExpense };
  }, [data, monthLabels, t]);

  if (isLoading || !charts) {
    return (
      <>
        <PageHeader title={t("analytics")} icon={LineChartIcon} />
        <Spinner />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("analytics")} icon={LineChartIcon} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t("salesByDay")}>
          <ChartBox>
            <BarChart data={charts.byDay} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
              <Bar dataKey="total" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
        </SectionCard>

        <SectionCard title={t("salesByMonth")}>
          <ChartBox>
            <LineChart data={charts.byMonth} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="total" stroke={GOLD} strokeWidth={3} dot={false} />
            </LineChart>
          </ChartBox>
        </SectionCard>

        <SectionCard title={t("salesByBarber")}>
          {charts.barberRows.length === 0 ? (
            <EmptyState />
          ) : (
            <ChartBox>
              <BarChart data={charts.barberRows} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="sales" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartBox>
          )}
        </SectionCard>

        <SectionCard title={t("tipsByBarber")}>
          {charts.barberRows.length === 0 ? (
            <EmptyState />
          ) : (
            <ChartBox>
              <BarChart data={charts.barberRows} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="tips" fill="#c99a3b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartBox>
          )}
        </SectionCard>

        <SectionCard title={t("servicePopularity")}>
          {charts.servicePie.length === 0 ? (
            <EmptyState />
          ) : (
            <ChartBox>
              <PieChart>
                <Pie data={charts.servicePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {charts.servicePie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ChartBox>
          )}
        </SectionCard>

        <SectionCard title={t("salaryPaymentsChart")}>
          <ChartBox>
            <BarChart data={charts.salaryByMonth} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
              <Bar dataKey="total" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
        </SectionCard>

        <SectionCard title={t("expensesVsIncome")}>
          <ChartBox>
            <BarChart data={charts.incomeExpense} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name={t("income")} fill={GOLD} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name={t("expenses")} fill="var(--destructive)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
        </SectionCard>

        <SectionCard title={t("profitTrend")}>
          <ChartBox>
            <AreaChart data={charts.incomeExpense} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GOLD} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="profit" name={t("monthlyProfit")} stroke={GOLD} strokeWidth={2} fill="url(#profitFill)" />
            </AreaChart>
          </ChartBox>
        </SectionCard>
      </div>
    </div>
  );
}

function ChartBox({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
