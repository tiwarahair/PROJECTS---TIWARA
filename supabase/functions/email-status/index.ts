// Email-first log in: "does this email have an account, and what kind?" Turnstile + rate limits, constant-ish time.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";

const MIN_RESPONSE_MS = 600;
const IP_LIMIT = 10;
const EMAIL_LIMIT = 5;
const HOUR = 3600;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const requestSchema = z.object({
  email: z.email().max(254),
  captchaToken: z.string().min(1).max(2048),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/** Cloudflare's header can't be set by the caller; X-Forwarded-For can, so it's only the local fallback. */
const getClientIp = ({ headers }: Request) =>
  headers.get("cf-connecting-ip") ??
  headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "unknown";

const isHuman = async (token: string, ip: string) => {
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: Deno.env.get("TURNSTILE_SECRET_KEY") ?? "",
        response: token,
        remoteip: ip,
      }),
    },
  );

  const { success } = (await response.json()) as { success: boolean };

  return success;
};

const isWithinLimit = async (key: string, maxHits: number) => {
  const { data, error } = await supabase.rpc("hit_rate_limit", {
    limit_key: key,
    max_hits: maxHits,
    window_seconds: HOUR,
  });

  if (error) throw error;

  return data === true;
};

const respond = async (startedAt: number, status: number, body: object) => {
  const wait = MIN_RESPONSE_MS - (performance.now() - startedAt);

  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

  return Response.json(body, { status, headers: corsHeaders });
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = performance.now();
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(startedAt, 400, { error: "invalid_request" });

  const { email, captchaToken } = parsed.data;
  const ip = getClientIp(request);

  try {
    if (!(await isHuman(captchaToken, ip))) return respond(startedAt, 403, { error: "captcha_failed" });

    const withinLimits = await Promise.all([
      isWithinLimit(`email-status:ip:${ip}`, IP_LIMIT),
      isWithinLimit(`email-status:email:${email.toLowerCase()}`, EMAIL_LIMIT),
    ]);

    if (withinLimits.includes(false)) return respond(startedAt, 429, { error: "rate_limited" });

    const { data: kind, error } = await supabase.rpc("get_account_kind", { lookup_email: email });

    if (error) throw error;

    return respond(startedAt, 200, { kind });
  } catch (error) {
    console.error("email-status failed", error);

    return respond(startedAt, 500, { error: "server_error" });
  }
});
