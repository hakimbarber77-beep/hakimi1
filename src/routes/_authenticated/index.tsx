import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  Users,
  CalendarDays,
  TrendingUp,
  Wallet,
  Boxes,
  AlertTriangle,
  Scissors,
  ListChecks,
  Trophy,
  Coins,
  Crown,
  CalendarClock,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  money,
  fmtDateTime,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
} from "@/lib/format";
import { salaryStatus } from "@/lib/stats";
import { PageHeader, MoneyStat, StatCard, SectionCard, EmptyState, Spinner } from "@/components/shared";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

type Sale = { id: string; barber_id: string | null; total: number; tip: number; payment_method: string; sold_at: string };
type Expense = { id: string; category: string; amount: number; spent_at: string; description: string | null };
type BarberRow = { id: string; full_name: string; status: string; salary_day: number };
type PaymentRow = { barber_id: string; paid_at: string };

function Dashboard() {
  const { t, lang } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const yearStart = startOfYear().toISOString();
      const [salesRes, itemsRes, expRes, barbersRes, servicesRes, invRes, payRes] = await Promise.all([
        supabase.from("sales").select("*").gte("sold_at", yearStart).order("sold_at", { ascending: false }),
        supabase.from("sale_items").select("service_name, price, quantity, created_at").gte("created_at", yearStart),
        supabase.from("expenses").select("*").gte("spent_at", startOfYear().toISOString().slice(0, 10)),
        supabase.from("barbers").select("id, full_name, status, salary_day"),
        supabase.from("services").select("id, enabled"),
        supabase.from("inventory").select("quantity, purchase_price, minimum_stock, name"),
        supabase.from("salary_payments").select("barber_id, paid_at"),
      ]);
      return {
        sales: (salesRes.data ?? []) as Sale[],
        items: (itemsRes.data ?? []) as { service_name: string; price: number; quantity: number }[],
        expenses: (expRes.data ?? []) as Expense[],
        barbers: (barbersRes.data ?? []) as BarberRow[],
        services: (servicesRes.data ?? []) as { id: string; enabled: boolean }[],
        inventory: (invRes.data ?? []) as { quantity: number; purchase_price: number; minimum_stock: number; name: string }[],
        payments: (payRes.data ?? []) as PaymentRow[],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title={t("dashboard")} subtitle={t("overview")} icon={TrendingUp} />
        <Spinner />
      </>
    );
  }

  const now = new Date();
  const dayS = startOfDay(now).getTime();
  const weekS = startOfWeek(now).getTime();
  const monthS = startOfMonth(now).getTime();

  const sum = (arr: Sale[]) => arr.reduce((a, s) => a + Number(s.total), 0);
  const today = data.sales.filter((s) => new Date(s.sold_at).getTime() >= dayS);
  const weekly = data.sales.filter((s) => new Date(s.sold_at).getTime() >= weekS);
  const monthly = data.sales.filter((s) => new Date(s.sold_at).getTime() >= monthS);

  const monthlyExpenses = data.expenses
    .filter((e) => new Date(e.spent_at).getTime() >= monthS)
    .reduce((a, e) => a + Number(e.amount), 0);
  const monthlySalesTotal = sum(monthly);
  const inventoryValue = data.inventory.reduce((a, i) => a + Number(i.quantity) * Number(i.purchase_price), 0);
  const lowStock = data.inventory.filter((i) => Number(i.quantity) <= Number(i.minimum_stock) && Number(i.minimum_stock) > 0);

  // Sales by barber
  const barberName = new Map(data.barbers.map((b) => [b.id, b.full_name]));
  const byBarber = new Map<string, number>();
  monthly.forEach((s) => {
    if (!s.barber_id) return;
    byBarber.set(s.barber_id, (byBarber.get(s.barber_id) ?? 0) + Number(s.total));
  });
  const barberChart = [...byBarber.entries()]
    .map(([id, total]) => ({ name: barberName.get(id) ?? "-", total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Best selling service
  const svcCount = new Map<string, number>();
  data.items.forEach((it) => svcCount.set(it.service_name, (svcCount.get(it.service_name) ?? 0) + Number(it.quantity)));
  const bestService = [...svcCount.entries()].sort((a, b) => b[1] - a[1])[0];

  // Tips
  const todayTips = today.reduce((a, s) => a + Number(s.tip ?? 0), 0);
  const monthlyTips = monthly.reduce((a, s) => a + Number(s.tip ?? 0), 0);

  // Highest tip barber (this month)
  const tipByBarber = new Map<string, number>();
  monthly.forEach((s) => {
    if (!s.barber_id) return;
    tipByBarber.set(s.barber_id, (tipByBarber.get(s.barber_id) ?? 0) + Number(s.tip ?? 0));
  });
  const topTip = [...tipByBarber.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];

  // Top selling barber (this month)
  const topBarber = [...byBarber.entries()].sort((a, b) => b[1] - a[1])[0];

  // Top customer count barber (this month)
  const custByBarber = new Map<string, number>();
  monthly.forEach((s) => {
    if (!s.barber_id) return;
    custByBarber.set(s.barber_id, (custByBarber.get(s.barber_id) ?? 0) + 1);
  });
  const topCust = [...custByBarber.entries()].sort((a, b) => b[1] - a[1])[0];

  // Salary due (active barbers whose salary day has arrived and not paid this month)
  const paymentsByBarber = new Map<string, { paid_at: string }[]>();
  data.payments.forEach((p) => {
    const arr = paymentsByBarber.get(p.barber_id) ?? [];
    arr.push({ paid_at: p.paid_at });
    paymentsByBarber.set(p.barber_id, arr);
  });
  const dueBarbers = data.barbers
    .filter((b) => b.status === "active")
    .filter((b) => salaryStatus(b.salary_day, paymentsByBarber.get(b.id) ?? []).due);

  // Monthly trend (last 12 months)
  const monthLabels = lang === "am"
    ? ["ጃን", "ፌብ", "ማር", "ኤፕ", "ሜይ", "ጁን", "ጁላ", "ኦገ", "ሴፕ", "ኦክ", "ኖቬ", "ዲሴ"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trend = Array.from({ length: 12 }, (_, m) => {
    const total = data.sales
      .filter((s) => new Date(s.sold_at).getMonth() === m)
      .reduce((a, s) => a + Number(s.total), 0);
    return { name: monthLabels[m], total };
  });

  const chartStroke = "var(--gold)";

  return (
    <div className="space-y-5">
      <PageHeader title={t("dashboard")} subtitle={t("overview")} icon={TrendingUp} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <MoneyStat label={t("todaySales")} value={sum(today)} icon={DollarSign} accent />
        <StatCard label={t("todayCustomers")} value={today.length} icon={Users} />
        <MoneyStat label={t("weeklySales")} value={sum(weekly)} icon={CalendarDays} />
        <MoneyStat label={t("monthlySales")} value={monthlySalesTotal} icon={TrendingUp} />
        <MoneyStat label={t("annualSales")} value={sum(data.sales)} icon={CalendarDays} />
        <MoneyStat label={t("monthlyProfit")} value={monthlySalesTotal - monthlyExpenses} icon={TrendingUp} />
        <MoneyStat label={t("monthlyExpenses")} value={monthlyExpenses} icon={Wallet} />
        <MoneyStat label={t("inventoryValue")} value={inventoryValue} icon={Boxes} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("lowStockAlerts")} value={lowStock.length} icon={AlertTriangle} />
        <StatCard label={t("totalBarbers")} value={data.barbers.filter((b) => b.status === "active").length} icon={Scissors} />
        <StatCard label={t("totalServices")} value={data.services.filter((s) => s.enabled).length} icon={ListChecks} />
        <StatCard
          label={t("bestSellingService")}
          value={bestService ? bestService[0] : "-"}
          icon={Trophy}
          hint={bestService ? `${bestService[1]}×` : undefined}
        />
      </div>

      {/* Tips & barber performance */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <MoneyStat label={t("todayTips")} value={todayTips} icon={Coins} accent />
        <MoneyStat label={t("monthlyTips")} value={monthlyTips} icon={Coins} />
        <StatCard
          label={t("highestTipBarber")}
          value={topTip ? barberName.get(topTip[0]) ?? "-" : "-"}
          icon={Crown}
          hint={topTip ? `${money(topTip[1])} ${t("currency")}` : undefined}
        />
        <StatCard
          label={t("topSellingBarber")}
          value={topBarber ? barberName.get(topBarber[0]) ?? "-" : "-"}
          icon={Trophy}
          hint={topBarber ? `${money(topBarber[1])} ${t("currency")}` : undefined}
        />
        <StatCard
          label={t("topCustomerCount")}
          value={topCust ? barberName.get(topCust[0]) ?? "-" : "-"}
          icon={Users}
          hint={topCust ? `${topCust[1]}` : undefined}
        />
        <StatCard label={t("salaryDue")} value={dueBarbers.length} icon={CalendarClock} />
        <StatCard
          label={t("unpaidSalaries")}
          value={dueBarbers.length}
          icon={Wallet}
          hint={dueBarbers.slice(0, 2).map((b) => b.full_name).join(", ") || undefined}
        />
      </div>



      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t("salesTrend")}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Line type="monotone" dataKey="total" stroke={chartStroke} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title={t("salesByBarber")}>
          {barberChart.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barberChart} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    cursor={{ fill: "var(--accent)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar dataKey="total" fill={chartStroke} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t("recentSales")}>
          {today.length === 0 && data.sales.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-border">
              {data.sales.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {s.barber_id ? barberName.get(s.barber_id) ?? "-" : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(s.sold_at)}</p>
                  </div>
                  <span className="font-display font-semibold text-primary">
                    {money(s.total)} {t("currency")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={t("recentExpenses")}>
          {data.expenses.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-border">
              {data.expenses.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground capitalize">
                      {t((e.category as never) ?? "other") || e.category}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{e.description ?? ""}</p>
                  </div>
                  <span className="font-display font-semibold text-destructive">
                    {money(e.amount)} {t("currency")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
