import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Truck, Plus, Pencil, Mail, Phone } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useList, useCrud } from "@/lib/db";
import { PageHeader, Spinner, EmptyState } from "@/components/shared";
import { FormDialog, type Field } from "@/components/FormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/suppliers")({
  component: SuppliersPage,
});

type Supplier = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  products: string | null;
  notes: string | null;
};

function SuppliersPage() {
  const { t } = useI18n();
  const { data, isLoading } = useList<Supplier>("suppliers", { orderBy: "name", ascending: true });
  const { create, update, remove } = useCrud("suppliers", { saved: t("saved"), deleted: t("deleted") });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [q, setQ] = useState("");

  const fields: Field[] = [
    { name: "name", label: t("name"), type: "text", required: true },
    { name: "company", label: t("company"), type: "text" },
    { name: "phone", label: t("phone"), type: "text" },
    { name: "email", label: t("email2"), type: "email" },
    { name: "address", label: t("address"), type: "text", full: true },
    { name: "products", label: t("products"), type: "textarea" },
    { name: "notes", label: t("notes"), type: "textarea" },
  ];

  const list = (data ?? []).filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));

  const submit = (values: Record<string, unknown>) => {
    if (editing) update.mutate({ id: editing.id, values }, { onSuccess: () => setOpen(false) });
    else create.mutate(values, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("suppliers")}
        icon={Truck}
        actions={
          <Button variant="gold" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> {t("addSupplier")}
          </Button>
        }
      />
      <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

      {isLoading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <div key={s.id} className="glass card-hover rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{s.name}</p>
                  {s.company && <p className="truncate text-xs text-muted-foreground">{s.company}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDelete onConfirm={() => remove.mutate(s.id)} />
                </div>
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {s.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{s.phone}</p>}
                {s.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{s.email}</p>}
                {s.products && <p className="line-clamp-2">{s.products}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? t("editSupplier") : t("addSupplier")}
        fields={fields}
        initial={editing ?? undefined}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      />
    </div>
  );
}
