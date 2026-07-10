import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Minus, Check, Loader2, Banknote, Smartphone, Landmark, CreditCard } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { money } from "@/lib/format";
import { PageHeader, SectionCard, Spinner, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/new-sale")({
  component: NewSale,
});

type Barber = { id: string; full_name: string; status: string };
type Service = { id: string; name: string; name_am: string | null; price: number; enabled: boolean };

const methods = [
  { key: "cash", icon: Banknote },
  { key: "telebirr", icon: Smartphone },
  { key: "bank", icon: Landmark },
  { key: "card", icon: CreditCard },
] as const;

function NewSale() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [barberId, setBarberId] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<string>("cash");
  const [tip, setTip] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const { data: barbers } = useQuery({
    queryKey: ["barbers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("id, full_name, status").eq("status", "active").order("full_name");
      if (error) throw error;
      return (data ?? []) as Barber[];
    },
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "enabled"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("enabled", true).order("name");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });

  const total = useMemo(() => {
    if (!services) return 0;
    return services.reduce((sum, s) => sum + (cart[s.id] ?? 0) * Number(s.price), 0);
  }, [cart, services]);

  const setQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const q = (next[id] ?? 0) + delta;
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!barberId) throw new Error(t("chooseBarber"));
      const chosen = (services ?? []).filter((s) => (cart[s.id] ?? 0) > 0);
      if (chosen.length === 0) throw new Error(t("chooseService"));

      const { data: sale, error } = await supabase
        .from("sales")
        .insert({ barber_id: barberId, total, tip: Number(tip) || 0, payment_method: method, notes: notes || null })
        .select()
        .single();
      if (error) throw error;

      const items = chosen.map((s) => ({
        sale_id: sale.id,
        service_id: s.id,
        service_name: s.name,
        price: Number(s.price),
        quantity: cart[s.id],
      }));
      const { error: itemsErr } = await supabase.from("sale_items").insert(items);
      if (itemsErr) throw itemsErr;
      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success(t("saleSaved"));
      navigate({ to: "/sales" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <div className="space-y-5 pb-[calc(9rem+env(safe-area-inset-bottom))]">
      <PageHeader title={t("newSale")} subtitle={t("appName")} icon={Plus} />

      <SectionCard title={t("selectBarber")}>
        {!barbers || barbers.length === 0 ? (
          <EmptyState text={t("noData")} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {barbers.map((b) => (
              <button
                key={b.id}
                onClick={() => setBarberId(b.id)}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                  barberId === b.id
                    ? "gold-gradient border-transparent text-primary-foreground shadow-[var(--shadow-gold)]"
                    : "border-border bg-card text-foreground hover:border-primary/50",
                )}
              >
                {b.full_name}
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("selectServices")}>
        {isLoading ? (
          <Spinner />
        ) : !services || services.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const qty = cart[s.id] ?? 0;
              const label = lang === "am" && s.name_am ? s.name_am : s.name;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-2xl border p-4 transition-all",
                    qty > 0 ? "border-primary bg-primary/5" : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{label}</p>
                      <p className="text-sm text-primary">
                        {money(s.price)} {t("currency")}
                      </p>
                    </div>
                    {qty > 0 && (
                      <span className="grid h-6 w-6 place-items-center rounded-full gold-gradient text-xs font-bold text-primary-foreground">
                        {qty}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setQty(s.id, -1)} disabled={qty === 0}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{qty}</span>
                    <Button variant="outline" size="icon" onClick={() => setQty(s.id, 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("paymentMethod")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {methods.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-medium transition-all",
                  method === m.key
                    ? "gold-gradient border-transparent text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/50",
                )}
              >
                <Icon className="h-5 w-5" />
                {t(m.key)}
              </button>
            );
          })}
        </div>
        <Textarea
          className="mt-3"
          placeholder={t("notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </SectionCard>

      <SectionCard title={t("tipAmount")}>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={tip === 0 ? "" : tip}
            onChange={(e) => setTip(Math.max(0, Number(e.target.value) || 0))}
            placeholder="0"
            className="max-w-40"
          />
          <span className="text-sm text-muted-foreground">{t("currency")}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("shopIncome")}: {money(total)} {t("currency")} · {t("tip")}: {money(tip)} {t("currency")}
        </p>
      </SectionCard>

      {/* Sticky total bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 glass-strong border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:pl-72">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{t("subtotal")}: {money(total)}</span>
              <span>{t("tip")}: {money(tip)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("grandTotal")}</p>
            <p className="font-display text-2xl font-bold text-primary">
              {money(total + (Number(tip) || 0))} {t("currency")}
            </p>
          </div>
          <Button variant="gold" size="lg" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {t("saveSale")}
          </Button>
        </div>
      </div>
    </div>
  );
}
