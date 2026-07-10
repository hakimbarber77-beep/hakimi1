import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Receipt, Plus, Pencil } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useList, useCrud } from "@/lib/db";
import { money, fmtDate } from "@/lib/format";
import { PageHeader, Spinner, EmptyState } from "@/components/shared";
import { FormDialog, type Field } from "@/components/FormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: ExpensesPage,
});

type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  spent_at: string;
};

const CATS = ["rent", "electricity", "water", "internet", "salaries", "cleaning", "repairs", "equipment", "other"] as const;

function ExpensesPage() {
  const { t } = useI18n();
  const { data, isLoading } = useList<Expense>("expenses", { orderBy: "spent_at" });
  const { create, update, remove } = useCrud("expenses", { saved: t("saved"), deleted: t("deleted") });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const fields: Field[] = [
    {
      name: "category",
      label: t("category"),
      type: "select",
      required: true,
      options: CATS.map((c) => ({ value: c, label: t(c) })),
    },
    { name: "amount", label: `${t("amount")} (${t("currency")})`, type: "number", required: true },
    { name: "spent_at", label: t("date"), type: "date", required: true },
    { name: "description", label: t("description"), type: "textarea" },
    { name: "receipt_url", label: t("receipt"), type: "text", full: true },
  ];

  const total = (data ?? []).reduce((a, e) => a + Number(e.amount), 0);

  const submit = (values: Record<string, unknown>) => {
    if (editing) update.mutate({ id: editing.id, values }, { onSuccess: () => setOpen(false) });
    else create.mutate(values, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("expenses")}
        subtitle={`${t("total")}: ${money(total)} ${t("currency")}`}
        icon={Receipt}
        actions={
          <Button variant="gold" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> {t("addExpense")}
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("date")}</th>
                  <th className="px-4 py-3">{t("category")}</th>
                  <th className="px-4 py-3">{t("description")}</th>
                  <th className="px-4 py-3 text-right">{t("amount")}</th>
                  <th className="px-4 py-3 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((e) => (
                  <tr key={e.id} className="hover:bg-accent/40">
                    <td className="whitespace-nowrap px-4 py-3">{fmtDate(e.spent_at)}</td>
                    <td className="px-4 py-3">{t(e.category as never)}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{e.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-destructive">
                      {money(e.amount)} {t("currency")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDelete onConfirm={() => remove.mutate(e.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? t("editExpense") : t("addExpense")}
        fields={fields}
        initial={editing ?? { category: "rent", spent_at: new Date().toISOString().slice(0, 10) }}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      />
    </div>
  );
}
