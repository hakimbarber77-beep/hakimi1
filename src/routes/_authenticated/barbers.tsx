import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Plus, Pencil, Phone, ChevronRight } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useList, useCrud } from "@/lib/db";
import { money, fmtDate } from "@/lib/format";
import { PageHeader, Spinner, EmptyState } from "@/components/shared";
import { FormDialog, type Field } from "@/components/FormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/barbers")({
  component: BarbersPage,
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
  notes: string | null;
};

function BarbersPage() {
  const { t } = useI18n();
  const { data, isLoading } = useList<Barber>("barbers", { orderBy: "full_name", ascending: true });
  const { create, update, remove } = useCrud("barbers", { saved: t("saved"), deleted: t("deleted") });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [q, setQ] = useState("");

  const fields: Field[] = [
    { name: "full_name", label: t("fullName"), type: "text", required: true, full: true },
    { name: "phone", label: t("phone"), type: "text" },
    { name: "photo_url", label: t("photo"), type: "text" },
    { name: "address", label: t("address"), type: "text", full: true },
    { name: "date_joined", label: t("dateJoined"), type: "date" },
    {
      name: "status",
      label: t("status"),
      type: "select",
      options: [
        { value: "active", label: t("active") },
        { value: "inactive", label: t("inactive") },
      ],
    },
    { name: "salary", label: `${t("salary")} (${t("currency")})`, type: "number" },
    { name: "commission_percent", label: t("commission"), type: "number" },
    { name: "salary_day", label: t("salaryDay"), type: "number", placeholder: "1-28" },
    { name: "notes", label: t("notes"), type: "textarea" },
  ];

  const list = (data ?? []).filter((b) =>
    b.full_name.toLowerCase().includes(q.toLowerCase()) || (b.phone ?? "").includes(q),
  );

  const submit = (values: Record<string, unknown>) => {
    if (editing) update.mutate({ id: editing.id, values }, { onSuccess: () => setOpen(false) });
    else create.mutate(values, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("barbers")}
        subtitle={`${list.length}`}
        icon={Users}
        actions={
          <Button
            variant="gold"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> {t("addBarber")}
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
          {list.map((b) => (
            <div key={b.id} className="glass card-hover rounded-2xl p-4">
              <Link
                to="/barbers/$barberId"
                params={{ barberId: b.id }}
                className="flex items-center gap-3"
              >
                <Avatar className="h-14 w-14 border border-primary/30">
                  <AvatarImage src={b.photo_url ?? undefined} alt={b.full_name} />
                  <AvatarFallback className="gold-gradient text-primary-foreground">
                    {b.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground hover:text-primary">{b.full_name}</p>
                  {b.phone && (
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {b.phone}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    b.status === "active"
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {b.status === "active" ? t("active") : t("inactive")}
                </span>
              </Link>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                  <p className="text-[11px] text-muted-foreground">{t("salary")}</p>
                  <p className="font-medium">{money(b.salary)} {t("currency")}</p>
                </div>
                <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                  <p className="text-[11px] text-muted-foreground">{t("commission")}</p>
                  <p className="font-medium">{b.commission_percent}%</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("dateJoined")}: {fmtDate(b.date_joined)}
              </p>
              <div className="mt-2 flex items-center justify-between gap-1">
                <Link
                  to="/barbers/$barberId"
                  params={{ barberId: b.id }}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {t("viewProfile")} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(b);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDelete onConfirm={() => remove.mutate(b.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? t("editBarber") : t("addBarber")}
        fields={fields}
        initial={editing ?? { status: "active", salary_day: 1, date_joined: new Date().toISOString().slice(0, 10) }}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      />
    </div>
  );
}
