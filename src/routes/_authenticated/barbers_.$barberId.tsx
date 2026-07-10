import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Phone,
  MapPin,
  CalendarDays,
  Users,
  DollarSign,
  Coins,
  Scissors,
  Droplets,
  Wind,
  TrendingUp,
  Search,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { money, fmtDate, fmtDateTime } from "@/lib/format";
import {
  barberPeriodStats,
  periodRange,
  inRange,
  salaryStatus,
  type SaleRow,
  type ItemRow,
  type BarberStat,
  type Period,
} from "@/lib/stats";
import { PageHeader, SectionCard, StatCard, MoneyStat, Spinner, EmptyState } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/barbers_/$barberId")({
  component: BarberProfile,
});

type Barber = {
  id: string;
  full_name: string;
  photo_url: string | null;
  phone: string | null;
  address: string | null;
  date_joined: string;
  status: string;
  salary: number;
  commission_percent: number;
  salary_day: number;
  last_salary_paid_date: string | null;
};

function BarberProfile() {
  const { barberId } = Route.useParams();
  const { t } = useI18n();
  const [tab, setTab] = useState<"overview" | "history">("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["barber-profile", barberId],
    queryFn: async () => {
      const [barberRes, salesRes] = await Promise.all([
        supabase.from("barbers").select("*").eq("id", barberId).maybeSingle(),
        supabase
          .from("sales")
          .select("id, barber_id, total, tip, payment_method, sold_at, notes")
          .eq("barber_id", barberId)
          .order("sold_at", { ascending: false }),
      ]);
      const sales = (salesRes.data ?? []) as SaleRow[];
      const ids = sales.map((s) => s.id);
      let items: ItemRow[] = [];
      let payments: { paid_at: string }[] = [];
      if (ids.length) {
        const itemsRes = await supabase
          .from("sale_items")
          .select("sale_id, service_name, price, quantity")
          .in("sale_id", ids);
        items = (itemsRes.data ?? []) as ItemRow[];
      }
      const payRes = await supabase
        .from("salary_payments")
        .select("paid_at")
        .eq("barber_id", barberId);
      payments = (payRes.data ?? []) as { paid_at: string }[];
      return { barber: (barberRes.data as Barber | null) ?? null, sales, items, payments };
    },
  });

  const periods = useMemo(
    () => (data ? barberPeriodStats(data.sales, data.items) : null),
    [data],
  );

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title={t("profile")} icon={Users} />
        <Spinner />
      </>
    );
  }

  if (!data.barber) {
    return (
      <>
        <PageHeader title={t("profile")} icon={Users} />
        <EmptyState text={t("noData")} />
      </>
    );
  }

  const b = data.barber;
  const status = salaryStatus(b.salary_day, data.payments);

  return (
    <div className="space-y-5">
      <Link to="/barbers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("barbers")}
      </Link>

      {/* Profile header */}
      <SectionCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 border border-primary/30">
            <AvatarImage src={b.photo_url ?? undefined} alt={b.full_name} />
            <AvatarFallback className="gold-gradient text-xl text-primary-foreground">
              {b.full_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-foreground">{b.full_name}</h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  b.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {b.status === "active" ? t("active") : t("inactive")}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              {b.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {b.phone}</span>}
              {b.address && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {b.address}</span>}
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {t("dateJoined")}: {fmtDate(b.date_joined)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <Field label={t("salary")} value={`${money(b.salary)} ${t("currency")}`} />
          <Field label={t("commission")} value={`${b.commission_percent}%`} />
          <Field label={t("salaryDay")} value={String(status.day)} />
          <Field
            label={t("currentSalaryStatus")}
            value={status.due ? t("due") : status.paidThisMonth ? t("paidThisMonth") : t("upToDate")}
            accent={status.due ? "due" : status.paidThisMonth ? "paid" : undefined}
          />
        </div>
      </SectionCard>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["overview", "history"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              tab === key ? "gold-gradient text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {key === "overview" ? t("overviewTab") : t("workHistory")}
          </button>
        ))}
      </div>

      {tab === "overview" && periods && (
        <div className="space-y-5">
          <StatBlock title={t("todayStats")} stat={periods.today} t={t} />
          <StatBlock title={t("weeklyStats")} stat={periods.week} t={t} />
          <StatBlock title={t("monthlyStats")} stat={periods.month} t={t} />
          <StatBlock title={t("yearlyStats")} stat={periods.year} t={t} />
          <StatBlock title={t("lifetimeStats")} stat={periods.lifetime} t={t} />
        </div>
      )}

      {tab === "history" && (
        <WorkHistory sales={data.sales} items={data.items} t={t} />
      )}
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: "due" | "paid" }) {
  return (
    <div
      className={cn(
        "rounded-lg px-2.5 py-1.5",
        accent === "due" ? "bg-destructive/15 text-destructive" : accent === "paid" ? "bg-success/15 text-success" : "bg-muted/50",
      )}
    >
      <p className="text-[11px] opacity-80">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function StatBlock({
  title,
  stat,
  t,
}: {
  title: string;
  stat: BarberStat;
  t: (k: never) => string;
}) {
  const tt = t as unknown as (k: string) => string;
  return (
    <SectionCard title={title}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label={tt("totalCustomers")} value={stat.customers} icon={Users} />
        <MoneyStat label={tt("totalSales")} value={stat.sales} icon={DollarSign} accent />
        <MoneyStat label={tt("tips")} value={stat.tips} icon={Coins} />
        <MoneyStat label={tt("averageSale")} value={stat.avg} icon={TrendingUp} />
        <StatCard label={tt("haircuts")} value={stat.haircuts} icon={Scissors} />
        <StatCard label={tt("washes")} value={stat.washes} icon={Droplets} />
        <StatCard label={tt("steamServices")} value={stat.steam} icon={Wind} />
        <StatCard label={tt("otherServices")} value={stat.other} icon={Users} />
      </div>
    </SectionCard>
  );
}

function WorkHistory({
  sales,
  items,
  t,
}: {
  sales: SaleRow[];
  items: ItemRow[];
  t: (k: never) => string;
}) {
  const tt = t as unknown as (k: string) => string;
  const [period, setPeriod] = useState<Period>("lifetime");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const servicesBySale = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const it of items) {
      const arr = map.get(it.sale_id) ?? [];
      arr.push(it.quantity > 1 ? `${it.service_name} ×${it.quantity}` : it.service_name);
      map.set(it.sale_id, arr);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const range = periodRange(period, from, to);
    const term = q.trim().toLowerCase();
    return sales.filter((s) => {
      if (!inRange(s.sold_at, range)) return false;
      if (!term) return true;
      const svc = (servicesBySale.get(s.id) ?? []).join(" ").toLowerCase();
      return (
        svc.includes(term) ||
        (s.notes ?? "").toLowerCase().includes(term) ||
        s.payment_method.toLowerCase().includes(term)
      );
    });
  }, [sales, period, from, to, q, servicesBySale]);

  const periodBtns: Period[] = ["today", "yesterday", "week", "month", "year", "lifetime", "custom"];
  const periodLabel: Record<Period, string> = {
    today: tt("today"),
    yesterday: tt("yesterday"),
    week: tt("thisWeek"),
    month: tt("thisMonth"),
    year: tt("thisYear"),
    lifetime: tt("lifetime"),
    custom: tt("customRange"),
  };

  return (
    <SectionCard title={tt("workHistory")}>
      <div className="mb-3 flex flex-wrap gap-2">
        {periodBtns.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              period === p ? "gold-gradient text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-40" />
          <span className="text-sm text-muted-foreground">—</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="max-w-40" />
        </div>
      )}

      <div className="relative mb-3 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={tt("search")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">{tt("date")}</th>
                <th className="px-3 py-2.5">{tt("services")}</th>
                <th className="px-3 py-2.5 text-right">{tt("total")}</th>
                <th className="px-3 py-2.5 text-right">{tt("tip")}</th>
                <th className="px-3 py-2.5">{tt("paymentMethod")}</th>
                <th className="px-3 py-2.5">{tt("notes")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-accent/40">
                  <td className="whitespace-nowrap px-3 py-2.5">{fmtDateTime(s.sold_at)}</td>
                  <td className="px-3 py-2.5">{(servicesBySale.get(s.id) ?? []).join(", ") || "-"}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{money(s.total)}</td>
                  <td className="px-3 py-2.5 text-right text-primary">{money(s.tip)}</td>
                  <td className="px-3 py-2.5 capitalize">{tt(s.payment_method)}</td>
                  <td className="max-w-40 truncate px-3 py-2.5 text-muted-foreground">{s.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
