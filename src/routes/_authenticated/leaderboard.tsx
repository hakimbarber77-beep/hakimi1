import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Trophy, Crown, Medal, Users, DollarSign, Coins, Scissors, Droplets, Wind, TrendingUp } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { money } from "@/lib/format";
import { statsFor, periodRange, inRange, type SaleRow, type ItemRow } from "@/lib/stats";
import { PageHeader, SectionCard, Spinner, EmptyState } from "@/components/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
});

type Barber = { id: string; full_name: string };

function LeaderboardPage() {
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const [salesRes, itemsRes, barbersRes] = await Promise.all([
        supabase.from("sales").select("id, barber_id, total, tip, payment_method, sold_at, notes"),
        supabase.from("sale_items").select("sale_id, service_name, price, quantity"),
        supabase.from("barbers").select("id, full_name"),
      ]);
      return {
        sales: (salesRes.data ?? []) as SaleRow[],
        items: (itemsRes.data ?? []) as ItemRow[],
        barbers: (barbersRes.data ?? []) as Barber[],
      };
    },
  });

  const computed = useMemo(() => {
    if (!data) return null;
    const monthR = periodRange("month");
    const yearR = periodRange("year");

    const rows = data.barbers.map((b) => {
      const mine = data.sales.filter((s) => s.barber_id === b.id);
      const lifetime = statsFor(mine, data.items);
      const monthSales = mine.filter((s) => inRange(s.sold_at, monthR)).reduce((a, s) => a + Number(s.total), 0);
      const yearSales = mine.filter((s) => inRange(s.sold_at, yearR)).reduce((a, s) => a + Number(s.total), 0);
      return { id: b.id, name: b.full_name, stat: lifetime, monthSales, yearSales };
    });

    const top = (get: (r: (typeof rows)[number]) => number) =>
      [...rows].filter((r) => get(r) > 0).sort((a, b) => get(b) - get(a));

    return {
      rows,
      barberOfMonth: [...rows].sort((a, b) => b.monthSales - a.monthSales)[0],
      topOfYear: [...rows].sort((a, b) => b.yearSales - a.yearSales)[0],
      boards: [
        { key: "mostCustomers", icon: Users, fmt: (n: number) => String(n), list: top((r) => r.stat.customers).map((r) => ({ id: r.id, name: r.name, v: r.stat.customers })) },
        { key: "highestSales", icon: DollarSign, fmt: money, list: top((r) => r.stat.sales).map((r) => ({ id: r.id, name: r.name, v: r.stat.sales })) },
        { key: "highestTips", icon: Coins, fmt: money, list: top((r) => r.stat.tips).map((r) => ({ id: r.id, name: r.name, v: r.stat.tips })) },
        { key: "mostHaircuts", icon: Scissors, fmt: (n: number) => String(n), list: top((r) => r.stat.haircuts).map((r) => ({ id: r.id, name: r.name, v: r.stat.haircuts })) },
        { key: "mostWashes", icon: Droplets, fmt: (n: number) => String(n), list: top((r) => r.stat.washes).map((r) => ({ id: r.id, name: r.name, v: r.stat.washes })) },
        { key: "mostSteam", icon: Wind, fmt: (n: number) => String(n), list: top((r) => r.stat.steam).map((r) => ({ id: r.id, name: r.name, v: r.stat.steam })) },
        { key: "highestAvgSale", icon: TrendingUp, fmt: money, list: top((r) => r.stat.avg).map((r) => ({ id: r.id, name: r.name, v: r.stat.avg })) },
      ] as const,
    };
  }, [data]);

  if (isLoading || !computed) {
    return (
      <>
        <PageHeader title={t("leaderboard")} icon={Trophy} />
        <Spinner />
      </>
    );
  }

  if (computed.rows.length === 0) {
    return (
      <>
        <PageHeader title={t("leaderboard")} icon={Trophy} />
        <EmptyState />
      </>
    );
  }

  const tt = t as unknown as (k: string) => string;

  return (
    <div className="space-y-5">
      <PageHeader title={t("leaderboard")} icon={Trophy} />

      <div className="grid gap-4 sm:grid-cols-2">
        <HeroCard
          title={t("barberOfMonth")}
          icon={Crown}
          name={computed.barberOfMonth?.monthSales ? computed.barberOfMonth.name : "-"}
          value={computed.barberOfMonth?.monthSales ? `${money(computed.barberOfMonth.monthSales)} ${t("currency")}` : "-"}
          id={computed.barberOfMonth?.monthSales ? computed.barberOfMonth.id : undefined}
        />
        <HeroCard
          title={t("topPerformerYear")}
          icon={Trophy}
          name={computed.topOfYear?.yearSales ? computed.topOfYear.name : "-"}
          value={computed.topOfYear?.yearSales ? `${money(computed.topOfYear.yearSales)} ${t("currency")}` : "-"}
          id={computed.topOfYear?.yearSales ? computed.topOfYear.id : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {computed.boards.map((board) => {
          const Icon = board.icon;
          return (
            <SectionCard key={board.key} title={tt(board.key)}>
              {board.list.length === 0 ? (
                <EmptyState />
              ) : (
                <ol className="space-y-1.5">
                  {board.list.slice(0, 5).map((r, i) => (
                    <li key={r.id}>
                      <Link
                        to="/barbers/$barberId"
                        params={{ barberId: r.id }}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent/50"
                      >
                        <span
                          className={cn(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                            i === 0 ? "gold-gradient text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {i + 1}
                        </span>
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{r.name}</span>
                        <span className="shrink-0 font-display font-semibold text-primary">{board.fmt(r.v)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}

function HeroCard({
  title,
  icon: Icon,
  name,
  value,
  id,
}: {
  title: string;
  icon: typeof Crown;
  name: string;
  value: string;
  id?: string;
}) {
  const inner = (
    <div className="gold-gradient card-hover flex items-center gap-4 rounded-2xl p-5 text-primary-foreground">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-black/15">
        <Icon className="h-7 w-7" />
      </div>
      <div className="min-w-0">
        <p className="text-xs opacity-80">{title}</p>
        <p className="truncate font-display text-xl font-bold">{name}</p>
        <p className="text-sm opacity-90">{value}</p>
      </div>
      <Medal className="ml-auto hidden h-8 w-8 opacity-40 sm:block" />
    </div>
  );
  return id ? (
    <Link to="/barbers/$barberId" params={{ barberId: id }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
