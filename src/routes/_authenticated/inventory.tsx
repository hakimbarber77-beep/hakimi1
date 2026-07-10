import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes, Plus, Pencil, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useList, useCrud } from "@/lib/db";
import { money, fmtDate } from "@/lib/format";
import { PageHeader, Spinner, EmptyState, SectionCard } from "@/components/shared";
import { FormDialog, type Field } from "@/components/FormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

type Product = {
  id: string;
  name: string;
  category: string | null;
  supplier_id: string | null;
  quantity: number;
  unit: string | null;
  purchase_price: number;
  selling_price: number | null;
  minimum_stock: number;
  barcode: string | null;
  notes: string | null;
};
type Supplier = { id: string; name: string };
type Barber = { id: string; full_name: string };
type Movement = {
  id: string;
  product_name: string | null;
  quantity: number;
  created_at: string;
  notes?: string | null;
  reason?: string | null;
  invoice_number?: string | null;
  received_at?: string;
  used_at?: string;
};

function InventoryPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: products, isLoading } = useList<Product>("inventory", { orderBy: "name", ascending: true });
  const { create, update, remove } = useCrud("inventory", { saved: t("saved"), deleted: t("deleted") });
  const { data: suppliers } = useList<Supplier>("suppliers", { orderBy: "name", ascending: true });
  const { data: barbers } = useList<Barber>("barbers", { orderBy: "full_name", ascending: true });
  const { data: stockIn } = useList<Movement>("stock_in", { orderBy: "created_at" });
  const { data: stockUsage } = useList<Movement>("stock_usage", { orderBy: "created_at" });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [inOpen, setInOpen] = useState(false);
  const [useOpen, setUseOpen] = useState(false);

  const productOptions = (products ?? []).map((p) => ({ value: p.id, label: p.name }));

  const productFields: Field[] = [
    { name: "name", label: t("productName"), type: "text", required: true, full: true },
    { name: "category", label: t("category"), type: "text" },
    {
      name: "supplier_id",
      label: t("supplier"),
      type: "select",
      options: (suppliers ?? []).map((s) => ({ value: s.id, label: s.name })),
    },
    { name: "quantity", label: t("quantity"), type: "number" },
    { name: "unit", label: t("unit"), type: "text" },
    { name: "purchase_price", label: t("purchasePrice"), type: "number" },
    { name: "selling_price", label: t("sellingPrice"), type: "number" },
    { name: "minimum_stock", label: t("minimumStock"), type: "number" },
    { name: "barcode", label: t("barcode"), type: "text" },
    { name: "notes", label: t("notes"), type: "textarea" },
  ];

  const adjustStock = async (inventoryId: string, delta: number) => {
    const prod = (products ?? []).find((p) => p.id === inventoryId);
    if (!prod) return;
    const next = Number(prod.quantity) + delta;
    await (supabase.from("inventory") as any).update({ quantity: next }).eq("id", inventoryId);
  };

  const recordIn = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const prod = (products ?? []).find((p) => p.id === v.inventory_id);
      const { error } = await (supabase.from("stock_in") as any).insert({ ...v, product_name: prod?.name ?? null });
      if (error) throw error;
      await adjustStock(String(v.inventory_id), Number(v.quantity));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stock_in"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t("saved"));
      setInOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const recordUsage = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const prod = (products ?? []).find((p) => p.id === v.inventory_id);
      const { error } = await (supabase.from("stock_usage") as any).insert({ ...v, product_name: prod?.name ?? null });
      if (error) throw error;
      await adjustStock(String(v.inventory_id), -Number(v.quantity));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stock_usage"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t("saved"));
      setUseOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const inFields: Field[] = [
    { name: "inventory_id", label: t("productName"), type: "select", required: true, options: productOptions, full: true },
    { name: "supplier_id", label: t("supplier"), type: "select", options: (suppliers ?? []).map((s) => ({ value: s.id, label: s.name })) },
    { name: "invoice_number", label: t("invoiceNumber"), type: "text" },
    { name: "quantity", label: t("quantity"), type: "number", required: true },
    { name: "purchase_price", label: t("purchasePrice"), type: "number" },
    { name: "received_at", label: t("date"), type: "date" },
    { name: "notes", label: t("notes"), type: "textarea" },
  ];

  const useFields: Field[] = [
    { name: "inventory_id", label: t("productName"), type: "select", required: true, options: productOptions, full: true },
    { name: "quantity", label: t("quantityUsed"), type: "number", required: true },
    { name: "barber_id", label: t("barbers"), type: "select", options: (barbers ?? []).map((b) => ({ value: b.id, label: b.full_name })) },
    { name: "used_at", label: t("date"), type: "date" },
    { name: "reason", label: t("reason"), type: "textarea" },
  ];

  const submitProduct = (values: Record<string, unknown>) => {
    if (editing) update.mutate({ id: editing.id, values }, { onSuccess: () => setOpen(false) });
    else create.mutate(values, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("inventory")}
        icon={Boxes}
        actions={
          <Button variant="gold" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> {t("addProduct")}
          </Button>
        }
      />

      <Tabs defaultValue="products">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="products">{t("inventory")}</TabsTrigger>
          <TabsTrigger value="in">{t("stockIn")}</TabsTrigger>
          <TabsTrigger value="usage">{t("stockUsage")}</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          {isLoading ? (
            <Spinner />
          ) : !products || products.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => {
                const low = Number(p.quantity) <= Number(p.minimum_stock) && Number(p.minimum_stock) > 0;
                return (
                  <div key={p.id} className={cn("glass card-hover rounded-2xl p-4", low && "ring-1 ring-destructive/40")}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{p.name}</p>
                        {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                      </div>
                      {low && (
                        <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {t("lowStock")}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="font-display text-2xl font-bold text-foreground">
                          {money(p.quantity)} <span className="text-sm text-muted-foreground">{p.unit}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("purchasePrice")}: {money(p.purchase_price)} {t("currency")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDelete onConfirm={() => remove.mutate(p.id)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in" className="mt-4">
          <SectionCard
            title={t("stockIn")}
            actions={
              <Button variant="gold" size="sm" onClick={() => setInOpen(true)}>
                <ArrowDownToLine className="h-4 w-4" /> {t("recordStockIn")}
              </Button>
            }
          >
            <MovementList rows={stockIn} dateKey="received_at" t={t} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <SectionCard
            title={t("stockUsage")}
            actions={
              <Button variant="gold" size="sm" onClick={() => setUseOpen(true)}>
                <ArrowUpFromLine className="h-4 w-4" /> {t("recordUsage")}
              </Button>
            }
          >
            <MovementList rows={stockUsage} dateKey="used_at" t={t} />
          </SectionCard>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? t("editProduct") : t("addProduct")}
        fields={productFields}
        initial={editing ?? { unit: "pcs" }}
        onSubmit={submitProduct}
        submitting={create.isPending || update.isPending}
      />
      <FormDialog
        open={inOpen}
        onOpenChange={setInOpen}
        title={t("recordStockIn")}
        fields={inFields}
        initial={{ received_at: new Date().toISOString().slice(0, 10) }}
        onSubmit={(v) => recordIn.mutate(v)}
        submitting={recordIn.isPending}
      />
      <FormDialog
        open={useOpen}
        onOpenChange={setUseOpen}
        title={t("recordUsage")}
        fields={useFields}
        initial={{ used_at: new Date().toISOString().slice(0, 10) }}
        onSubmit={(v) => recordUsage.mutate(v)}
        submitting={recordUsage.isPending}
      />
    </div>
  );
}

function MovementList({
  rows,
  dateKey,
  t,
}: {
  rows: Movement[] | undefined;
  dateKey: "received_at" | "used_at";
  t: ReturnType<typeof useI18n>["t"];
}) {
  if (!rows || rows.length === 0) return <EmptyState />;
  return (
    <ul className="divide-y divide-border">
      {rows.map((m) => (
        <li key={m.id} className="flex items-center justify-between py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{m.product_name ?? "-"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {fmtDate(m[dateKey] ?? m.created_at)} {m.reason ? `· ${m.reason}` : ""}
              {m.invoice_number ? `· ${m.invoice_number}` : ""}
            </p>
          </div>
          <span className="font-display font-semibold text-primary">{money(m.quantity)}</span>
        </li>
      ))}
    </ul>
  );
}
