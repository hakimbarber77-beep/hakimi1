import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Scissors,
  Users,
  ListChecks,
  ShoppingBag,
  Boxes,
  Truck,
  Receipt,
  Wallet,
  BarChart3,
  LineChart,
  Trophy,
  Settings as SettingsIcon,
  Plus,
  Menu,
  X,
  Sun,
  Moon,
  Languages,
  Download,
  Bell,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useInstallPrompt } from "@/lib/pwa";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import appIcon from "/icons/app-icon.png";
import { NotificationBell } from "@/components/NotificationBell";

type NavItem = { to: string; key: Parameters<ReturnType<typeof useI18n>["t"]>[0]; icon: typeof Scissors };

const nav: NavItem[] = [
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/new-sale", key: "newSale", icon: Plus },
  { to: "/sales", key: "sales", icon: ShoppingBag },
  { to: "/barbers", key: "barbers", icon: Users },
  { to: "/services", key: "services", icon: ListChecks },
  { to: "/inventory", key: "inventory", icon: Boxes },
  { to: "/suppliers", key: "suppliers", icon: Truck },
  { to: "/expenses", key: "expenses", icon: Receipt },
  { to: "/payroll", key: "payroll", icon: Wallet },
  { to: "/leaderboard", key: "leaderboard", icon: Trophy },
  { to: "/analytics", key: "analytics", icon: LineChart },
  { to: "/notifications", key: "notifications", icon: Bell },
  { to: "/reports", key: "reports", icon: BarChart3 },
  { to: "/settings", key: "settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { canInstall, promptInstall } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
              active
                ? "gold-gradient text-primary-foreground shadow-[var(--shadow-gold)]"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );

  const Sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-3 px-2 py-4" onClick={() => setOpen(false)}>
        <img src={appIcon} alt="" width={44} height={44} className="h-11 w-11 rounded-xl" />
        <div className="min-w-0">
          <p className="font-display text-base font-bold leading-tight text-gold-gradient">Hakimi</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">Barber Shop</p>
        </div>
      </Link>
      <div className="mt-2 flex-1 overflow-y-auto px-1">
        <NavLinks onNavigate={() => setOpen(false)} />
      </div>
      <div className="space-y-2 border-t border-sidebar-border/50 px-1 pt-3">
        {canInstall && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={promptInstall}
          >
            <Download className="h-[18px] w-[18px]" /> {t("installApp")}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-sidebar p-3 lg:block">
        {Sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="animate-float-up absolute inset-y-0 left-0 w-72 bg-sidebar p-3 shadow-2xl">
            <button
              className="absolute right-3 top-4 text-sidebar-foreground/70"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {Sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 glass flex items-center justify-between gap-3 px-4 py-3">
          <button
            className="rounded-lg p-1.5 text-foreground hover:bg-accent lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <span className="font-display truncate text-sm font-bold text-gold-gradient">
              {t("appName")}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setLang(lang === "en" ? "am" : "en")}
            >
              <Languages className="h-4 w-4" />
              {lang === "en" ? "አማ" : "EN"}
            </Button>
            <Button variant="outline" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/new-sale" className="hidden sm:block">
              <Button variant="gold" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> {t("newSale")}
              </Button>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-8">{children}</main>
      </div>

      {/* Mobile floating New Sale (hidden on the New Sale page to avoid overlapping its Save bar) */}
      {pathname !== "/new-sale" && (
        <Link
          to="/new-sale"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-30 flex items-center gap-2 rounded-full gold-gradient px-5 py-3.5 font-semibold text-primary-foreground shadow-[var(--shadow-gold)] sm:hidden"
        >
          <Plus className="h-5 w-5" /> {t("newSale")}
        </Link>
      )}
    </div>
  );
}
