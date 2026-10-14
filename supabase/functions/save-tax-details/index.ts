// Saves a stylist's tax details. Needs an authenticator-app code from the last 30 days; the NI number is
// encrypted here (AES-GCM, key in TAX_ENCRYPTION_KEY) and never returned, only a masked hint.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { getRecentUser } from "../_shared/recent-user.ts";

const NI_PATTERN = /^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/;

const text = (max: number) => z.string().trim().max(max);

const requestSchema = z.object({
  kind: z.enum(["sole", "ltd"]),
  first: text(80),
  middle: text(80),
  last: text(80),
  legalName: text(160),
  day: z.string().regex(/^\d{1,2}$/).or(z.literal("")),
  month: z.string().regex(/^\d{1,2}$/).or(z.literal("")),
  year: z.string().regex(/^\d{4}$/).or(z.literal("")),
  nationalInsuranceNumber: z.string().max(16),
  companyName: text(160),
  companyNumber: z.string().max(12),
  isAddressSame: z.boolean(),
  address: z.object({
    line1: text(120),
    line2: text(120),
    city: text(80),
    postcode: text(10),
  }),
});

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

const encrypt = async (plain: string) => {
  const raw = Uint8Array.from(atob(Deno.env.get("TAX_ENCRYPTION_KEY") ?? ""), (char) => char.charCodeAt(0));

  if (raw.length !== 32) throw new Error("TAX_ENCRYPTION_KEY must be 32 bytes, base64");

  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));

  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
};

/** "QQ123456C" → "QQ •• •• 56 C". */
const getHint = (number: string) => `${number.slice(0, 2)} •• •• ${number.slice(6, 8)} ${number.slice(8)}`;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const userId = await getRecentUser(admin, request);

  if (!userId) return respond(403, { error: "second_factor_required" });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const details = parsed.data;

  const { data: stylist } = await admin
    .from("stylists")
    .select("id, stylist_tax_details(ni_ciphertext, ni_hint)")
    .eq("owner_id", userId)
    .single();

  if (!stylist) return respond(404, { error: "no_business" });

  const isSole = details.kind === "sole";
  const nationalInsurance = details.nationalInsuranceNumber.replace(/\s/g, "").toUpperCase();
  const saved = stylist.stylist_tax_details;

  // a blank NI number keeps the saved one
  if (isSole && nationalInsurance && !NI_PATTERN.test(nationalInsurance))
    return respond(400, { error: "invalid_ni_number" });

  if (isSole && !nationalInsurance && !saved?.ni_ciphertext) return respond(400, { error: "ni_number_required" });

  const pad = (value: string) => value.padStart(2, "0");

  const row = {
    stylist_id: stylist.id,
    kind: details.kind,
    first_name: isSole ? details.first : null,
    middle_name: isSole ? details.middle || null : null,
    last_name: isSole ? details.last : null,
    legal_name: isSole ? details.legalName : null,
    date_of_birth: isSole ? `${details.year}-${pad(details.month)}-${pad(details.day)}` : null,
    ni_ciphertext: isSole ? (nationalInsurance ? await encrypt(nationalInsurance) : saved?.ni_ciphertext) : null,
    ni_hint: isSole ? (nationalInsurance ? getHint(nationalInsurance) : saved?.ni_hint) : null,
    company_name: isSole ? null : details.companyName,
    company_number: isSole ? null : details.companyNumber.replace(/\s/g, "").toUpperCase(),
    is_address_same: details.isAddressSame,
    ...details.address,
    line2: details.address.line2 || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("stylist_tax_details").upsert(row);

  if (error) return respond(400, { error: "invalid_details" });

  // "Your tax details were updated" to their login email, in case it wasn't them
  const { data: owner } = await admin.auth.admin.getUserById(userId);

  if (owner.user?.email)
    await admin.rpc("queue_email", {
      to_address: owner.user.email,
      template: "tax_details_updated",
      payload: { changed_at: row.updated_at },
      user_id: userId,
    });

  return respond(200, { nationalInsuranceHint: row.ni_hint });
});
