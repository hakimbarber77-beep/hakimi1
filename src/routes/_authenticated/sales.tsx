import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Printer, Pencil, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { money, fmtDateTime, startOfDay, startOfWeek, startOfMonth, startOfYear } from "@/lib/format";
import { PageHeader, Spinner, EmptyState, SectionCard } from "@/components/shared";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { FormDialog, type Field } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { printReceipt } from "@/lib/receipt";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesPage,
});

type SaleItem = { id: string; service_name: string; price: number; quantity: number };
type Sale = {
  id: string;
  total: number;
  payment_method: string;
  notes: string | null;
  sold_at: string;
  barber_id: string | null;
  barbers: { full_name: string } | null;
  sale_items: SaleItem[];
};

const ranges = ["today", "yesterday", "week", "month", "year", "all"] as const;
const pm = ["all", "cash", "telebirr", "bank", "card"] as const;

function SalesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [range, setRange] = useState<(typeof ranges)[number]>("month");
  const [method, setMethod] = useState<string>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Sale | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sales", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, barbers(full_name), sale_items(*)")
        .order("sold_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Sale[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await (supabase.from("sales") as any).update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t("saved"));
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t("deleted"));
    },
  });

  const filtered = useMemo(() => {
    let start = 0;
    let end = Infinity;
    const now = new Date();
    if (range === "today") start = startOfDay(now).getTime();
    else if (range === "yesterday") {
      end = startOfDay(now).getTime();
      start = end - 86400000;
    } else if (range === "week") start = startOfWeek(now).getTime();
    else if (range === "month") start = startOfMonth(now).getTime();
    else if (range === "year") start = startOfYear(now).getTime();

    return (data ?? []).filter((s) => {
      const ts = new Date(s.sold_at).getTime();
      if (ts < start || ts >= end) return false;
      if (method !== "all" && s.payment_method !== method) return false;
      if (q) {
        const hay = `${s.barbers?.full_name ?? ""} ${s.sale_items.map((i) => i.service_name).join(" ")} ${s.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [data, range, method, q]);

  const total = filtered.reduce((a, s) => a + Number(s.total), 0);

  const editFields: Field[] = [
    {
      name: "payment_method",
      label: t("paymentMethod"),
      type: "select",
      options: [
        { value: "cash", label: t("cash") },
        { value: "telebirr", label: t("telebirr") },
        { value: "bank", label: t("bank") },
        { value: "card", label: t("card") },
      ],
    },
    { name: "total", label: `${t("total")} (${t("currency")})`, type: "number" },
    { name: "notes", label: t("notes"), type: "textarea" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("sales")}
        subtitle={`${filtered.length} · ${money(total)} ${t("currency")}`}
        icon={ShoppingBag}
      />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-2">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                range === r ? "gold-gradient text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {t(r === "all" ? "all" : r)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {pm.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-all",
                method === m ? "border-primary text-primary" : "border-border text-muted-foreground",
              )}
            >
              {t(m === "all" ? "all" : m)}
            </button>
          ))}
          <div className="relative ml-auto min-w-[180px] flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="pl-8" />
          </div>
        </div>
      </SectionCard>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="glass card-hover rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{s.barbers?.full_name ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(s.sold_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-primary">
                    {money(s.total)} {t("currency")}
                  </p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                    {t(s.payment_method as never)}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.sale_items.map((i) => (
                  <span key={i.id} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {i.service_name} ×{i.quantity}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => printReceipt(s, t)}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditing(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDelete onConfirm={() => remove.mutate(s.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={t("edit")}
        fields={editFields}
        initial={editing ?? undefined}
        onSubmit={(values) => editing && update.mutate({ id: editing.id, values })}
        submitting={update.isPending}
      />
    </div>
  );
}
