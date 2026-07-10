import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { ensureSession } from "@/lib/auth.functions";
import { AppShell } from "@/components/AppShell";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Login is disabled — silently provision a session so RLS-protected
    // data access keeps working, then go straight to the app.
    let { data } = await supabase.auth.getUser();
    if (!data.user) {
      const session = await ensureSession();
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      data = (await supabase.auth.getUser()).data;
    }
    return { user: data.user };
  },


  component: LayoutComponent,
  errorComponent: LayoutError,
});


function LayoutComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function LayoutError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "authenticated_layout" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <Link to="/" className="rounded-md border border-input px-4 py-2 text-sm">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
