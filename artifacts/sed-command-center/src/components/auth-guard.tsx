import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Blocks rendering until the Supabase session is known, then redirects when
 * there is none.
 *
 * The previous version rendered `children` immediately and only redirected
 * inside an effect, so a protected page mounted and fired its data requests
 * before the redirect landed. It also trusted a plain localStorage flag, which
 * anyone could set from the console.
 *
 * This is a convenience guard, not the security boundary. The real enforcement
 * is `requireAuth` on the API: without a valid token the server returns 401 no
 * matter what the browser does.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setResolved(true);
    });

    // Fires on sign-in, sign-out and token refresh — including in another tab,
    // so signing out once signs out everywhere.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setResolved(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!resolved) return;
    if (!session && location !== "/login") setLocation("/login");
    else if (session && location === "/login") setLocation("/");
  }, [resolved, session, location, setLocation]);

  // Render nothing until the session is known, so no protected page mounts and
  // starts fetching before we know whether the user may see it.
  if (!resolved) return null;
  if (!session && location !== "/login") return null;

  return <>{children}</>;
}
