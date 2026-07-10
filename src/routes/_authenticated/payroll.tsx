import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Wallet, Plus, Printer, CheckCircle2, Pencil, CalendarClock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useList, useCrud } from "@/lib/db";
import { money, fmtDate, startOfMonth } from "@/lib/format";
import { salaryStatus } from "@/lib/stats";
import { PageHeader, Spinner, EmptyState, SectionCard } from "@/components/shared";
import { FormDialog, type Field } from "@/components/FormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { printSlip } from "@/lib/receipt";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: PayrollPage,
});

type Barber = {
  id: string;
  full_name: string;
  salary: number;
  commission_percent: number;
  salary_day: number;
};
type Payroll = {
  id: string;
  barber_id: string;
  period: string;
  salary: number;
  commission: number;
  bonus: number;
  tips: number;
  advance: number;
  deduction: number;
  net_salary: number;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
};
type Payment = {
  id: string;
  barber_id: string;
  amount: number;
  salary: number;
  commission: number;
  bonus: number;
  tips: number;
  deduction: number;
  advance: number;
  period: string | null;
  paid_at: string;
  notes: string | null;
};

function computeNet(v: Record<string, unknown>) {
  return (
    Number(v.salary || 0) +
    Number(v.commission || 0) +
    Number(v.bonus || 0) +
    Number(v.tips || 0) -
    Number(v.advance || 0) -
    Number(v.deduction || 0)
  );
}

function PayrollPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useList<Payroll>("payroll", { orderBy: "created_at" });
  const { data: barbers } = useList<Barber>("barbers", { orderBy: "full_name", ascending: true });
  const { create, update, remove } = useCrud("payroll", { saved: t("saved"), deleted: t("deleted") });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payroll | null>(null);
  const [formInitial, setFormInitial] = useState<Record<string, unknown>>({});

  const barberName = new Map((barbers ?? []).map((b) => [b.id, b.full_name]));

  // Salary payment history
  const { data: payments } = useQuery({
    queryKey: ["salary_payments", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_payments")
        .select("*")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
  });

  // Current-month sales to auto-suggest commission & tips per barber
  const { data: monthSales } = useQuery({
    queryKey: ["payroll", "month-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("barber_id, total, tip")
        .gte("sold_at", startOfMonth().toISOString());
      if (error) throw error;
      return (data ?? []) as { barber_id: string | null; total: number; tip: number }[];
    },
  });

  const paymentsByBarber = new Map<string, { paid_at: string }[]>();
  (payments ?? []).forEach((p) => {
    const arr = paymentsByBarber.get(p.barber_id) ?? [];
    arr.push({ paid_at: p.paid_at });
    paymentsByBarber.set(p.barber_id, arr);
  });
  const dueBarbers = (barbers ?? []).filter(
    (b) => salaryStatus(b.salary_day, paymentsByBarber.get(b.id) ?? []).due,
  );

  const currentPeriod = new Date().toISOString().slice(0, 7);

  const suggestFor = (barberId: string) => {
    const b = (barbers ?? []).find((x) => x.id === barberId);
    const mine = (monthSales ?? []).filter((s) => s.barber_id === barberId);
    const salesTotal = mine.reduce((a, s) => a + Number(s.total), 0);
    const tips = mine.reduce((a, s) => a + Number(s.tip ?? 0), 0);
    const commission = b ? (salesTotal * Number(b.commission_percent)) / 100 : 0;
    return {
      barber_id: barberId,
      period: currentPeriod,
      salary: b ? Number(b.salary) : 0,
      commission: Math.round(commission),
      tips: Math.round(tips),
      bonus: 0,
      advance: 0,
      deduction: 0,
    };
  };

  const openNew = (barberId?: string) => {
    setEditing(null);
    setFormInitial(barberId ? suggestFor(barberId) : { period: currentPeriod });
    setOpen(true);
  };

  const fields: Field[] = [
    {
      name: "barber_id",
      label: t("barbers"),
      type: "select",
      required: true,
      full: true,
      options: (barbers ?? []).map((b) => ({ value: b.id, label: b.full_name })),
    },
    { name: "period", label: t("period"), type: "text", required: true, placeholder: "2026-07" },
    { name: "salary", label: t("salary"), type: "number" },
    { name: "commission", label: t("commission"), type: "number" },
    { name: "tips", label: t("tips"), type: "number" },
    { name: "bonus", label: t("bonus"), type: "number" },
    { name: "advance", label: t("advance"), type: "number" },
    { name: "deduction", label: t("deduction"), type: "number" },
    { name: "notes", label: t("notes"), type: "textarea" },
  ];

  const submit = (values: Record<string, unknown>) => {
    const withNet = { ...values, net_salary: computeNet(values) };
    if (editing) update.mutate({ id: editing.id, values: withNet }, { onSuccess: () => setOpen(false) });
    else create.mutate(withNet, { onSuccess: () => setOpen(false) });
  };

  const markPaid = useMutation({
    mutationFn: async (p: Payroll) => {
      const { error } = await (supabase.from("payroll") as any)
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq("id", p.id);
      if (error) throw error;
      await (supabase.from("salary_payments") as any).insert({
        barber_id: p.barber_id,
        payroll_id: p.id,
        amount: p.net_salary,
        salary: p.salary,
        commission: p.commission,
        bonus: p.bonus,
        tips: p.tips,
        deduction: p.deduction,
        advance: p.advance,
        period: p.period,
        notes: p.notes,
      });
      await (supabase.from("barbers") as any)
        .update({ last_salary_paid_date: new Date().toISOString().slice(0, 10) })
        .eq("id", p.barber_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll"] });
      qc.invalidateQueries({ queryKey: ["salary_payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["barber-profile"] });
      toast.success(t("saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });


  return (
    <div className="space-y-5">
      <PageHeader
        title={t("payroll")}
        icon={Wallet}
        actions={
          <Button variant="gold" onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> {t("generatePayroll")}
          </Button>
        }
      />

      {dueBarbers.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
            <CalendarClock className="h-4 w-4" /> {t("salaryDue")} · {t("unpaidSalaries")} ({dueBarbers.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {dueBarbers.map((b) => (
              <Button
                key={b.id}
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => openNew(b.id)}
              >
                <Plus className="h-3.5 w-3.5" /> {b.full_name}
              </Button>
            ))}
          </div>
        </div>
      )}


      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((p) => (
            <div key={p.id} className="glass card-hover rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{barberName.get(p.barber_id) ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">{p.period}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    p.paid ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                  )}
                >
                  {p.paid ? t("paid") : t("unpaid")}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <Cell label={t("salary")} v={p.salary} />
                <Cell label={t("commission")} v={p.commission} />
                <Cell label={t("bonus")} v={p.bonus} />
                <Cell label={t("tips")} v={p.tips} />
                <Cell label={t("advance")} v={p.advance} />
                <Cell label={t("deduction")} v={p.deduction} />
              </div>
              <div className="mt-2 rounded-lg gold-gradient px-3 py-2 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] opacity-80">{t("netSalary")}</span>
                  <span className="font-display text-lg font-bold">{money(p.net_salary)} {t("currency")}</span>
                </div>
              </div>
              {p.paid_at && <p className="mt-2 text-[11px] text-muted-foreground">{t("paid")}: {fmtDate(p.paid_at)}</p>}
              <div className="mt-2 flex justify-end gap-1">
                {!p.paid && (
                  <Button variant="outline" size="sm" onClick={() => markPaid.mutate(p)}>
                    <CheckCircle2 className="h-4 w-4" /> {t("markPaid")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => printSlip({ ...p, barber_name: barberName.get(p.barber_id) ?? "-" }, t)}
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDelete onConfirm={() => remove.mutate(p.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Salary payment history */}
      <SectionCard title={t("paymentHistory")}>
        {!payments || payments.length === 0 ? (
          <EmptyState text={t("noPayments")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">{t("paymentDate")}</th>
                  <th className="px-3 py-2.5">{t("barbers")}</th>
                  <th className="px-3 py-2.5 text-right">{t("salary")}</th>
                  <th className="px-3 py-2.5 text-right">{t("commission")}</th>
                  <th className="px-3 py-2.5 text-right">{t("bonus")}</th>
                  <th className="px-3 py-2.5 text-right">{t("tips")}</th>
                  <th className="px-3 py-2.5 text-right">{t("deduction")}</th>
                  <th className="px-3 py-2.5 text-right">{t("advance")}</th>
                  <th className="px-3 py-2.5 text-right">{t("netPaid")}</th>
                  <th className="px-3 py-2.5">{t("notes")}</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/40">
                    <td className="whitespace-nowrap px-3 py-2.5">{fmtDate(p.paid_at)}</td>
                    <td className="px-3 py-2.5">{barberName.get(p.barber_id) ?? "-"}</td>
                    <td className="px-3 py-2.5 text-right">{money(p.salary)}</td>
                    <td className="px-3 py-2.5 text-right">{money(p.commission)}</td>
                    <td className="px-3 py-2.5 text-right">{money(p.bonus)}</td>
                    <td className="px-3 py-2.5 text-right">{money(p.tips)}</td>
                    <td className="px-3 py-2.5 text-right">{money(p.deduction)}</td>
                    <td className="px-3 py-2.5 text-right">{money(p.advance)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-primary">{money(p.amount)}</td>
                    <td className="max-w-40 truncate px-3 py-2.5 text-muted-foreground">{p.notes ?? "-"}</td>
                    <td className="px-3 py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          printSlip(
                            {
                              barber_name: barberName.get(p.barber_id) ?? "-",
                              period: p.period ?? "",
                              salary: p.salary,
                              commission: p.commission,
                              bonus: p.bonus,
                              tips: p.tips,
                              advance: p.advance,
                              deduction: p.deduction,
                              net_salary: p.amount,
                            },
                            t,
                          )
                        }
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? t("edit") : t("generatePayroll")}
        fields={fields}
        initial={editing ?? formInitial}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      />
    </div>
  );
}

function Cell({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-medium">{money(v)}</p>
    </div>
  );
}
