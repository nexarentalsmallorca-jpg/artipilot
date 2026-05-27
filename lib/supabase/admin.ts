import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let cachedUrl = "";
let cachedServiceRoleKey = "";

function cleanEnv(value: string | undefined) {
  return String(value || "").trim();
}

export function isSupabaseConfigured() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return Boolean(url && serviceRoleKey);
}

export function getSupabaseConfig() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return {
    url,
    serviceRoleKey,
    configured: Boolean(url && serviceRoleKey),
    urlPreview: url ? `${url.slice(0, 28)}...` : null,
    hasServiceRoleKey: Boolean(serviceRoleKey),
  };
}

export function getSupabaseAdmin(): SupabaseClient {
  const { url, serviceRoleKey, configured } = getSupabaseConfig();

  if (!configured) {
    throw new Error(
      "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables."
    );
  }

  const configChanged =
    adminClient && (cachedUrl !== url || cachedServiceRoleKey !== serviceRoleKey);

  if (!adminClient || configChanged) {
    cachedUrl = url;
    cachedServiceRoleKey = serviceRoleKey;

    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "X-Client-Info": "artipilot-private-whatsapp-dashboard",
        },
      },
    });
  }

  return adminClient;
}

export function resetSupabaseAdminClientForTests() {
  adminClient = null;
  cachedUrl = "";
  cachedServiceRoleKey = "";
}