import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ListChecks, Plus, Pencil } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useList, useCrud } from "@/lib/db";
import { money } from "@/lib/format";
import { PageHeader, Spinner, EmptyState } from "@/components/shared";
import { FormDialog, type Field } from "@/components/FormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/services")({
  component: ServicesPage,
});

type Service = { id: string; name: string; name_am: string | null; price: number; enabled: boolean };

function ServicesPage() {
  const { t, lang } = useI18n();
  const { data, isLoading } = useList<Service>("services", { orderBy: "name", ascending: true });
  const { create, update, remove } = useCrud("services", { saved: t("saved"), deleted: t("deleted") });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const fields: Field[] = [
    { name: "name", label: t("serviceName"), type: "text", required: true, full: true },
    { name: "name_am", label: t("serviceNameAm"), type: "text", full: true },
    { name: "price", label: `${t("price")} (${t("currency")})`, type: "number", required: true },
    { name: "enabled", label: t("enabled"), type: "switch" },
  ];

  const submit = (values: Record<string, unknown>) => {
    if (editing) update.mutate({ id: editing.id, values }, { onSuccess: () => setOpen(false) });
    else create.mutate(values, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("services")}
        icon={ListChecks}
        actions={
          <Button variant="gold" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> {t("addService")}
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <div key={s.id} className="glass card-hover flex items-center justify-between rounded-2xl p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {lang === "am" && s.name_am ? s.name_am : s.name}
                </p>
                <p className="text-primary">{money(s.price)} {t("currency")}</p>
                <span
                  className={cn(
                    "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                    s.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.enabled ? t("active") : t("inactive")}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDelete onConfirm={() => remove.mutate(s.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? t("editService") : t("addService")}
        fields={fields}
        initial={editing ?? { enabled: true }}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      />
    </div>
  );
}
