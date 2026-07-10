import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "date" | "select" | "switch" | "email";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  fields: Field[];
  initial?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  submitting?: boolean;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (open) {
      const base: Record<string, unknown> = {};
      fields.forEach((f) => {
        base[f.name] = initial?.[f.name] ?? (f.type === "switch" ? true : f.type === "number" ? "" : "");
      });
      setValues(base);
    }
  }, [open, initial, fields]);

  const set = (name: string, v: unknown) => setValues((p) => ({ ...p, [name]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const out: Record<string, unknown> = {};
    fields.forEach((f) => {
      let v = values[f.name];
      if (f.type === "number") v = v === "" || v == null ? 0 : Number(v);
      if ((f.type === "text" || f.type === "textarea" || f.type === "email") && v === "") v = null;
      out[f.name] = v;
    });
    onSubmit(out);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.name} className={cn("space-y-1.5", f.full || f.type === "textarea" ? "col-span-2" : "col-span-2 sm:col-span-1")}>
              {f.type !== "switch" && <Label htmlFor={f.name}>{f.label}</Label>}
              {f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  value={(values[f.name] as string) ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                />
              ) : f.type === "select" ? (
                <Select value={(values[f.name] as string) ?? ""} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger id={f.name}>
                    <SelectValue placeholder={f.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "switch" ? (
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <Label htmlFor={f.name}>{f.label}</Label>
                  <Switch
                    id={f.name}
                    checked={Boolean(values[f.name])}
                    onCheckedChange={(v) => set(f.name, v)}
                  />
                </div>
              ) : (
                <Input
                  id={f.name}
                  type={f.type}
                  required={f.required}
                  value={(values[f.name] as string) ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  step={f.type === "number" ? "any" : undefined}
                />
              )}
            </div>
          ))}
          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
