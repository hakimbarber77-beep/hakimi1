import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, Sun, Moon, Languages } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useSettings } from "@/lib/db";
import { PageHeader, SectionCard, Spinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const { data, isLoading } = useSettings();
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      setForm({
        shop_name: data.shop_name ?? "",
        logo_url: data.logo_url ?? "",
        address: data.address ?? "",
        phone: data.phone ?? "",
        currency: data.currency ?? "ETB",
        daily_target: String(data.daily_target ?? 0),
        business_info: data.business_info ?? "",
      });
    }
  }, [data]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const values = { ...form, daily_target: Number(form.daily_target || 0), language: lang };
      if (data?.id) {
        const { error } = await (supabase.from("settings") as any).update(values).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("settings") as any).insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success(t("saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title={t("settings")} icon={SettingsIcon} />
        <Spinner />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("settings")} icon={SettingsIcon} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t("businessInfo")}>
          <div className="grid gap-3">
            <Field label={t("shopName")} value={form.shop_name} onChange={(v) => set("shop_name", v)} />
            <Field label={t("logo")} value={form.logo_url} onChange={(v) => set("logo_url", v)} />
            <Field label={t("phone")} value={form.phone} onChange={(v) => set("phone", v)} />
            <Field label={t("address")} value={form.address} onChange={(v) => set("address", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("currency")} value={form.currency} onChange={(v) => set("currency", v)} />
              <Field
                label={t("dailyTarget")}
                value={form.daily_target}
                onChange={(v) => set("daily_target", v)}
                type="number"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("businessInfo")}</Label>
              <Textarea value={form.business_info} onChange={(e) => set("business_info", e.target.value)} />
            </div>
            <Button variant="gold" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-4 w-4" /> {t("save")}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={t("settings")}>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t("language")}</Label>
              <div className="flex gap-2">
                <Button variant={lang === "en" ? "gold" : "outline"} onClick={() => setLang("en")}>
                  <Languages className="h-4 w-4" /> English
                </Button>
                <Button variant={lang === "am" ? "gold" : "outline"} onClick={() => setLang("am")}>
                  <Languages className="h-4 w-4" /> አማርኛ
                </Button>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">{t("theme")}</Label>
              <div className="flex gap-2">
                <Button variant={theme === "dark" ? "gold" : "outline"} onClick={() => setTheme("dark")}>
                  <Moon className="h-4 w-4" /> {t("dark")}
                </Button>
                <Button variant={theme === "light" ? "gold" : "outline"} onClick={() => setTheme("light")}>
                  <Sun className="h-4 w-4" /> {t("light")}
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
