// Stripe Connect (Express) for a stylist: "onboard" creates their account if needed and returns Stripe's
// onboarding link; "dashboard" returns a link to their Express dashboard; "refresh" re-reads the account
// (for when they come back from Stripe before the webhook lands). Payout actions need a recent 2FA code.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { getRecentUser } from "../_shared/recent-user.ts";
import { getAccountState, stripe, syncAccount } from "../_shared/stripe.ts";

const SITES = ["https://dev.tiwarashouse.com", "https://tiwarashouse.com", "https://www.tiwarashouse.com"];

/** Stripe only sends people back to https addresses, so local development returns over https too. */
const getReturnSite = (origin: string) => {
  if (SITES.includes(origin)) return origin;

  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    ? origin.replace("http:", "https:")
    : "https://www.tiwarashouse.com";
};

const requestSchema = z.object({ action: z.enum(["onboard", "dashboard", "refresh"]) });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const getOwnerId = async (request: Request) => {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  const { data } = await admin.auth.getClaims(token);

  return data?.claims.sub ?? null;
};

type TaxRow = {
  kind: string;
  first_name: string | null;
  last_name: string | null;
  legal_name: string | null;
  date_of_birth: string | null;
  company_name: string | null;
  company_number: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  postcode: string | null;
} | null;

/** The embedded one-to-one row arrives as an object, or as a list when nothing matches. */
const toTaxRow = (value: unknown): TaxRow =>
  (Array.isArray(value) ? (value[0] ?? null) : value) as TaxRow;

/** What we already know, so Stripe asks for less. */
const getIdentity = (tax: TaxRow) => {
  if (!tax) return { country: "gb" };

  const address = {
    line1: tax.line1 ?? undefined,
    line2: tax.line2 ?? undefined,
    city: tax.city ?? undefined,
    postal_code: tax.postcode ?? undefined,
    country: "gb",
  };

  if (tax.kind === "ltd")
    return {
      country: "gb",
      entity_type: "company" as const,
      business_details: {
        registered_name: tax.company_name ?? undefined,
        id_numbers: tax.company_number ? [{ type: "gb_crn" as const, value: tax.company_number }] : undefined,
        address,
      },
    };

  const [first = "", ...rest] = (tax.legal_name ?? "").split(" ");
  const [year, month, day] = (tax.date_of_birth ?? "").split("-").map(Number);

  return {
    country: "gb",
    entity_type: "individual" as const,
    individual: {
      given_name: tax.first_name || first || undefined,
      surname: tax.last_name || rest.join(" ") || undefined,
      date_of_birth: year && month && day ? { day, month, year } : undefined,
      address,
    },
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const { action } = parsed.data;
  const ownerId = action === "refresh" ? await getOwnerId(request) : await getRecentUser(admin, request);

  if (!ownerId) return respond(403, { error: action === "refresh" ? "sign_in_required" : "second_factor_required" });

  const { data: stylist } = await admin
    .from("stylists")
    .select("id, slug, business_name, contact_email, stripe_account_id, stylist_tax_details(*)")
    .eq("owner_id", ownerId)
    .single();

  if (!stylist) return respond(404, { error: "no_business" });

  let accountId = stylist.stripe_account_id;

  if (action === "refresh") {
    if (!accountId) return respond(200, { connected: false });

    const { saved } = await syncAccount(admin, accountId);

    return respond(200, { connected: true, ...saved });
  }

  if (action === "dashboard") {
    if (!accountId) return respond(400, { error: "not_connected" });

    const { url } = await stripe.accounts.createLoginLink(accountId);

    return respond(200, { url });
  }

  if (!accountId) {
    const syncedAt = new Date().toISOString();

    const account = await stripe.v2.core.accounts.create({
      contact_email: stylist.contact_email ?? undefined,
      display_name: stylist.business_name,
      dashboard: "express",
      defaults: {
        currency: "gbp",
        responsibilities: { fees_collector: "application", losses_collector: "application" },
      },
      identity: getIdentity(toTaxRow(stylist.stylist_tax_details)),
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
      metadata: { stylist_id: stylist.id },
      include: ["configuration.recipient", "requirements"],
    }, { idempotencyKey: `onboard-${stylist.id}` });

    const { data: saved, error } = await admin
      .from("stylists")
      .update({ stripe_account_id: account.id, stripe_synced_at: syncedAt, ...(await getAccountState(account)) })
      .eq("id", stylist.id)
      .is("stripe_account_id", null)
      .select("stripe_account_id");

    if (error) return respond(500, { error: "not_saved" });

    const { data: current } = saved.length
      ? { data: saved[0] }
      : await admin.from("stylists").select("stripe_account_id").eq("id", stylist.id).single();

    accountId = current?.stripe_account_id;

    if (!accountId) return respond(500, { error: "not_saved" });
  }

  const site = getReturnSite(request.headers.get("Origin") ?? "");

  const { url } = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        collection_options: { fields: "eventually_due" },
        refresh_url: `${site}/studio?stripe=refresh`,
        return_url: `${site}/studio?stripe=return`,
      },
    },
  });

  return respond(200, { url });
});
