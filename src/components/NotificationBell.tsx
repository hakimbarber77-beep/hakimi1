import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellRing, Package, Wallet, BellOff } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useAlerts, type AppAlert } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import appIcon from "/icons/app-icon.png";

const notifiedThisSession = new Set<string>();

function pushSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function NotificationBell() {
  const { t } = useI18n();
  const alerts = useAlerts();
  const unreadAlerts = alerts.filter((a) => !a.read);
  const [permission, setPermission] = useState<NotificationPermission>(
    pushSupported() ? Notification.permission : "denied",
  );
  const firstRun = useRef(true);

  // Fire desktop notifications for new alerts while the app is open.
  useEffect(() => {
    if (!pushSupported() || permission !== "granted") return;
    // Avoid a burst of notifications on the very first render.
    if (firstRun.current) {
      unreadAlerts.forEach((a) => notifiedThisSession.add(a.id));
      firstRun.current = false;
      return;
    }
    for (const a of unreadAlerts) {
      if (notifiedThisSession.has(a.id)) continue;
      notifiedThisSession.add(a.id);
      try {
        new Notification(a.title, { body: a.body, icon: appIcon, tag: a.id });
      } catch {
        /* ignore */
      }
    }
  }, [unreadAlerts, permission]);

  const requestPermission = async () => {
    if (!pushSupported()) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const count = unreadAlerts.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label={t("notifications")}>
          {count > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full gold-gradient px-1 text-[10px] font-bold text-primary-foreground shadow">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm font-semibold">{t("notifications")}</p>
          {count > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {count}
            </span>
          )}
        </div>

        {pushSupported() && permission === "default" && (
          <button
            onClick={requestPermission}
            className="flex w-full items-center gap-2 border-b border-border bg-primary/5 px-4 py-2.5 text-left text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Bell className="h-3.5 w-3.5" /> {t("enablePush")}
          </button>
        )}
        {pushSupported() && permission === "denied" && (
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
            <BellOff className="h-3.5 w-3.5" /> {t("pushBlocked")}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto">
          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
              <Bell className="h-6 w-6 opacity-40" />
              {t("noNotifications")}
            </div>
          ) : (
            unreadAlerts.slice(0, 5).map((a) => <AlertRow key={a.id} alert={a} />)
          )}
        </div>
        <div className="border-t border-border px-4 py-3">
          <Link to="/notifications" className="text-sm font-semibold text-primary hover:underline">
            {t("viewAllNotifications")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AlertRow({ alert }: { alert: AppAlert }) {
  const Icon = alert.type === "low_stock" ? Package : Wallet;
  return (
    <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3 last:border-b-0">
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          alert.type === "low_stock"
            ? "bg-destructive/15 text-destructive"
            : "bg-primary/15 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{alert.title}</p>
        <p className="text-xs text-muted-foreground">{alert.body}</p>
      </div>
    </div>
  );
}
