/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://<project-ref>.supabase.co */
  readonly VITE_SUPABASE_URL: string;
  /** Publishable (anon) key. Public by design — it ships in the bundle. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
