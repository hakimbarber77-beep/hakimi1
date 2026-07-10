import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, FileText, FileSpreadsheet, FileDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { money } from "@/lib/format";
import { classifyService } from "@/lib/stats";
import { PageHeader, Spinner, EmptyState, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { exportCsv, exportExcel, exportPdf, type Column } from "@/lib/export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

type ReportKey =
  | "monthlyReport"
  | "annualReport"
  | "profitReport"
  | "expenseReport"
  | "bestBarber"
  | "barberReport"
  | "bestSellingService"
  | "inventoryValue";

function ReportsPage() {
  const { t, lang } = useI18n();
  const [report, setReport] = useState<ReportKey>("monthlyReport");

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "data"],
    queryFn: async () => {
      const [sales, items, expenses, barbers, inventory] = await Promise.all([
        supabase.from("sales").select("id, barber_id, total, tip, sold_at"),
        supabase.from("sale_items").select("sale_id, service_name, price, quantity"),
        supabase.from("expenses").select("category, amount, spent_at"),
        supabase.from("barbers").select("id, full_name"),
        supabase.from("inventory").select("name, quantity, purchase_price, minimum_stock"),
      ]);
      return {
        sales: sales.data ?? [],
        items: items.data ?? [],
        expenses: expenses.data ?? [],
        barbers: barbers.data ?? [],
        inventory: inventory.data ?? [],
      } as never as {
        sales: { id: string; barber_id: string | null; total: number; tip: number; sold_at: string }[];
        items: { sale_id: string; service_name: string; price: number; quantity: number }[];
        expenses: { category: string; amount: number; spent_at: string }[];
        barbers: { id: string; full_name: string }[];
        inventory: { name: string; quantity: number; purchase_price: number; minimum_stock: number }[];
      };
    },
  });


  const monthLabels =
    lang === "am"
      ? ["ጃን", "ፌብ", "ማር", "ኤፕ", "ሜይ", "ጁን", "ጁላ", "ኦገ", "ሴፕ", "ኦክ", "ኖቬ", "ዲሴ"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const { columns, rows, title } = useMemo(() => {
    const cur = t("currency");
    if (!data) return { columns: [] as Column[], rows: [] as Record<string, unknown>[], title: "" };

    if (report === "monthlyReport" || report === "annualReport") {
      const rows = monthLabels.map((label, m) => {
        const total = data.sales
          .filter((s) => new Date(s.sold_at).getMonth() === m)
          .reduce((a, s) => a + Number(s.total), 0);
        const count = data.sales.filter((s) => new Date(s.sold_at).getMonth() === m).length;
        return { month: label, count, total: `${money(total)} ${cur}` };
      });
      return {
        columns: [
          { header: t("month"), key: "month" },
          { header: t("todayCustomers"), key: "count" },
          { header: t("total"), key: "total" },
        ],
        rows,
        title: t(report),
      };
    }

    if (report === "profitReport") {
      const rows = monthLabels.map((label, m) => {
        const sales = data.sales
          .filter((s) => new Date(s.sold_at).getMonth() === m)
          .reduce((a, s) => a + Number(s.total), 0);
        const exp = data.expenses
          .filter((e) => new Date(e.spent_at).getMonth() === m)
          .reduce((a, e) => a + Number(e.amount), 0);
        return {
          month: label,
          sales: `${money(sales)} ${cur}`,
          exp: `${money(exp)} ${cur}`,
          profit: `${money(sales - exp)} ${cur}`,
        };
      });
      return {
        columns: [
          { header: t("month"), key: "month" },
          { header: t("monthlySales"), key: "sales" },
          { header: t("monthlyExpenses"), key: "exp" },
          { header: t("monthlyProfit"), key: "profit" },
        ],
        rows,
        title: t("profitReport"),
      };
    }

    if (report === "expenseReport") {
      const byCat = new Map<string, number>();
      data.expenses.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount)));
      const rows = [...byCat.entries()].map(([category, amount]) => ({
        category: t(category as never),
        amount: `${money(amount)} ${cur}`,
      }));
      return {
        columns: [
          { header: t("category"), key: "category" },
          { header: t("amount"), key: "amount" },
        ],
        rows,
        title: t("expenseReport"),
      };
    }

    if (report === "bestBarber") {
      const name = new Map(data.barbers.map((b) => [b.id, b.full_name]));
      const totals = new Map<string, { total: number; count: number; tips: number }>();
      data.sales.forEach((s) => {
        if (!s.barber_id) return;
        const cur = totals.get(s.barber_id) ?? { total: 0, count: 0, tips: 0 };
        cur.total += Number(s.total);
        cur.tips += Number(s.tip ?? 0);
        cur.count += 1;
        totals.set(s.barber_id, cur);
      });
      const rows = [...totals.entries()]
        .map(([id, v]) => ({ name: name.get(id) ?? "-", count: v.count, total: `${money(v.total)} ${cur}`, tips: `${money(v.tips)} ${cur}`, _t: v.total }))
        .sort((a, b) => b._t - a._t)
        .map(({ _t, ...r }) => r);
      return {
        columns: [
          { header: t("name"), key: "name" },
          { header: t("customersServed"), key: "count" },
          { header: t("totalSales"), key: "total" },
          { header: t("tips"), key: "tips" },
        ],
        rows,
        title: t("bestBarber"),
      };
    }

    if (report === "barberReport") {
      const name = new Map(data.barbers.map((b) => [b.id, b.full_name]));
      const saleBarber = new Map(data.sales.map((s) => [s.id, s.barber_id]));
      type Agg = { customers: number; revenue: number; tips: number; haircuts: number; washes: number; steam: number; other: number };
      const agg = new Map<string, Agg>();
      const get = (id: string) =>
        agg.get(id) ?? { customers: 0, revenue: 0, tips: 0, haircuts: 0, washes: 0, steam: 0, other: 0 };
      data.sales.forEach((s) => {
        if (!s.barber_id) return;
        const a = get(s.barber_id);
        a.customers += 1;
        a.revenue += Number(s.total);
        a.tips += Number(s.tip ?? 0);
        agg.set(s.barber_id, a);
      });
      data.items.forEach((it) => {
        const bid = saleBarber.get(it.sale_id);
        if (!bid) return;
        const a = get(bid);
        const q = Number(it.quantity);
        const cls = classifyService(it.service_name);
        if (cls === "haircut") a.haircuts += q;
        else if (cls === "wash") a.washes += q;
        else if (cls === "steam") a.steam += q;
        else a.other += q;
        agg.set(bid, a);
      });
      const rows = [...agg.entries()]
        .map(([id, a]) => ({
          name: name.get(id) ?? "-",
          customers: a.customers,
          haircuts: a.haircuts,
          washes: a.washes,
          steam: a.steam,
          other: a.other,
          revenue: `${money(a.revenue)} ${cur}`,
          tips: `${money(a.tips)} ${cur}`,
          _t: a.revenue,
        }))
        .sort((x, y) => y._t - x._t)
        .map(({ _t, ...r }) => r);
      return {
        columns: [
          { header: t("name"), key: "name" },
          { header: t("totalCustomers"), key: "customers" },
          { header: t("haircuts"), key: "haircuts" },
          { header: t("washes"), key: "washes" },
          { header: t("steamServices"), key: "steam" },
          { header: t("otherServices"), key: "other" },
          { header: t("totalSales"), key: "revenue" },
          { header: t("tips"), key: "tips" },
        ],
        rows,
        title: t("barberReport"),
      };
    }


    if (report === "bestSellingService") {
      const counts = new Map<string, { qty: number; total: number }>();
      data.items.forEach((i) => {
        const c = counts.get(i.service_name) ?? { qty: 0, total: 0 };
        c.qty += Number(i.quantity);
        c.total += Number(i.quantity) * Number(i.price);
        counts.set(i.service_name, c);
      });
      const rows = [...counts.entries()]
        .map(([name, v]) => ({ name, qty: v.qty, total: `${money(v.total)} ${cur}`, _t: v.qty }))
        .sort((a, b) => b._t - a._t)
        .map(({ _t, ...r }) => r);
      return {
        columns: [
          { header: t("serviceName"), key: "name" },
          { header: t("quantity"), key: "qty" },
          { header: t("total"), key: "total" },
        ],
        rows,
        title: t("bestSellingService"),
      };
    }

    // inventory
    const rows = data.inventory.map((p) => ({
      name: p.name,
      quantity: p.quantity,
      value: `${money(Number(p.quantity) * Number(p.purchase_price))} ${cur}`,
      low: Number(p.quantity) <= Number(p.minimum_stock) && Number(p.minimum_stock) > 0 ? t("lowStock") : "",
    }));
    return {
      columns: [
        { header: t("productName"), key: "name" },
        { header: t("quantity"), key: "quantity" },
        { header: t("inventoryValue"), key: "value" },
        { header: t("status"), key: "low" },
      ],
      rows,
      title: t("inventoryValue"),
    };
  }, [data, report, t, monthLabels]);

  const reportTypes: ReportKey[] = [
    "monthlyReport",
    "annualReport",
    "profitReport",
    "expenseReport",
    "bestBarber",
    "barberReport",
    "bestSellingService",
    "inventoryValue",
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("reports")} icon={BarChart3} />

      <div className="flex flex-wrap gap-2">
        {reportTypes.map((r) => (
          <button
            key={r}
            onClick={() => setReport(r)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
              report === r ? "gold-gradient text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {t(r)}
          </button>
        ))}
      </div>

      <SectionCard
        title={title}
        actions={
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => exportPdf(title, columns, rows)}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportExcel(title, columns, rows)}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCsv(title, columns, rows)}>
              <FileDown className="h-4 w-4" /> CSV
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-3 py-2.5">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-accent/40">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2.5">
                        {String((r as Record<string, unknown>)[c.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
