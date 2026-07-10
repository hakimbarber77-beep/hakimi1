import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { money } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl gold-gradient text-primary-foreground sm:grid">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display truncate text-2xl font-bold text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "card-hover animate-float-up rounded-2xl border p-4",
        accent ? "gold-gradient border-transparent text-primary-foreground" : "glass",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-xs font-medium",
              accent ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
          <p className="mt-1.5 truncate font-display text-2xl font-bold">{value}</p>
          {hint && (
            <p className={cn("mt-0.5 text-[11px]", accent ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {hint}
            </p>
          )}
        </div>
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            accent ? "bg-black/15" : "bg-primary/12 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function MoneyStat({ label, value, icon, accent }: { label: string; value: number; icon: LucideIcon; accent?: boolean }) {
  const { t } = useI18n();
  return <StatCard label={label} value={`${money(value)} ${t("currency")}`} icon={icon} accent={accent} />;
}

export function SectionCard({
  title,
  children,
  actions,
  className,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-2xl p-4", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
      <Inbox className="h-10 w-10 opacity-40" />
      <p className="text-sm">{text ?? t("noData")}</p>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
