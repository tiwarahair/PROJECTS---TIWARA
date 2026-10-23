// The signed-in caller, if their session passed 2FA with an authenticator-app code in the last 30 days.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const RECENT_SECONDS = 30 * 86400;

const getClaims = async (admin: SupabaseClient, request: Request) => {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  const { data } = await admin.auth.getClaims(token);

  return data?.claims;
};

/** The signed-in caller, with or without 2FA. */
export const getSignedInUser = async (admin: SupabaseClient, request: Request) =>
  (await getClaims(admin, request))?.sub ?? null;

export const getRecentUser = async (admin: SupabaseClient, request: Request) => {
  const claims = await getClaims(admin, request);

  if (!claims?.sub || claims.aal !== "aal2") return null;

  const cutoff = Date.now() / 1000 - RECENT_SECONDS;

  const isRecent = (claims.amr ?? []).some(
    (entry) => typeof entry === "object" && entry.method === "totp" && entry.timestamp > cutoff,
  );

  return isRecent ? claims.sub : null;
};
