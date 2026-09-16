// Server-only database client helper.
//
// Lovable Cloud injects SUPABASE_SERVICE_ROLE_KEY, so the privileged client is
// normally available. On a self-hosted deploy (e.g. Vercel) where only the
// public key was copied across, importing the admin client throws
// "Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY".
// These helpers degrade gracefully instead of crashing the page.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function supabaseUrl(): string | undefined {
  return process.env["SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"];
}

function supabasePublishableKey(): string | undefined {
  return process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
}

function supabaseServiceRoleKey(): string | undefined {
  return process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_SERVICE_ROLE_SECRET"] ||
    process.env["SUPABASE_SECRET_KEY"];
}

export function hasServiceRole(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
}

/** Publishable-key server client: RLS applies as the anonymous role. */
export function publicServerDb() {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) throw new Error("Database is not configured on this deployment.");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Privileged client when the service role key is configured, otherwise the
 * publishable client so read paths guarded by RLS keep working.
 */
export async function serverDb(): Promise<any> {
  if (hasServiceRole()) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin as any;
  }
  return publicServerDb() as any;
}

/**
 * Best client for an already-authenticated admin request: privileged client
 * when available, else the signed-in admin's own client (admin RLS policies
 * already allow reading every profile, payment and role).
 */
export async function adminServerDb(context: { supabase: any }): Promise<any> {
  if (hasServiceRole()) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin as any;
  }
  return context.supabase as any;
}
