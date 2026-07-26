import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client, used for authentication only.
 *
 * The CRM's data never travels through this client — every read and write goes
 * to the Express API, which owns the business logic and validation. All tables
 * have row level security enabled with no permissive policies, so the
 * publishable key below grants no data access even if it is extracted from the
 * bundle. That is by design: the key is meant to be public.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set. " +
      "Copy them from Supabase → Project Settings → API into .env.",
  );
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** Access token for the current session, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
