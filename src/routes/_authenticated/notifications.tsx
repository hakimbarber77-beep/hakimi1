import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCircle2, Package, Wallet } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/format";
import { useAlerts, useNotificationActions, type AppAlert } from "@/lib/notifications";
import { PageHeader, EmptyState, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t } = useI18n();
  const alerts = useAlerts();
  const unread = alerts.filter((alert) => !alert.read);
  const { markRead } = useNotificationActions();

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("notifications")}
        subtitle={`${unread.length} ${t("unread")}`}
        icon={Bell}
        actions={
          <Button
            variant="gold"
            disabled={unread.length === 0 || markRead.isPending}
            onClick={() => markRead.mutate(unread.map((alert) => alert.id))}
          >
            <CheckCircle2 className="h-4 w-4" /> {t("markAllRead")}
          </Button>
        }
      />

      <SectionCard title={t("activeAlerts")}>
        {alerts.length === 0 ? (
          <EmptyState text={t("noNotifications")} />
        ) : (
          <div className="divide-y divide-border/70">
            {alerts.map((alert) => (
              <NotificationRow
                key={alert.id}
                alert={alert}
                onMarkRead={() => markRead.mutate([alert.id])}
                marking={markRead.isPending}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function NotificationRow({
  alert,
  onMarkRead,
  marking,
}: {
  alert: AppAlert;
  onMarkRead: () => void;
  marking: boolean;
}) {
  const { t } = useI18n();
  const Icon = alert.type === "low_stock" ? Package : Wallet;

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            alert.type === "low_stock" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{alert.title}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                alert.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
              )}
            >
              {alert.read ? t("read") : t("unread")}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{alert.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(alert.timestamp)}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" disabled={alert.read || marking} onClick={onMarkRead}>
        <CheckCircle2 className="h-4 w-4" /> {t("markRead")}
      </Button>
    </div>
  );
}