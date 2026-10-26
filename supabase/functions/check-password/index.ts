// checks a new password before the browser saves it through Supabase
import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { isWithinLimit } from "../_shared/rate-limit.ts";
import { getSignedInUser } from "../_shared/recent-user.ts";
import { findPasswordProblem } from "./check.ts";

const HOUR = 3600;

const requestSchema = z.object({
  password: z.string().max(256),
  who: z.enum(["pro", "client"]).default("client"),
  first: z.string().max(100).default(""),
  last: z.string().max(100).default(""),
  email: z.string().max(254).default(""),
});

type CheckRequest = z.infer<typeof requestSchema>;

const getAccountDetails = async (userId: string) => {
  const [{ data: account }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("profiles").select("first_name, last_name").eq("id", userId).single(),
  ]);

  const { email = "", app_metadata: appMetadata } = account?.user ?? {};

  return {
    who: appMetadata?.is_stylist === true ? ("pro" as const) : ("client" as const),
    first: profile?.first_name ?? "",
    last: profile?.last_name ?? "",
    email,
  };
};

const checkPassword = async (request: Request, { password, ...details }: CheckRequest) => {
  const userId = await getSignedInUser(admin, request);

  if (!(await isWithinLimit(`check-password:${userId ?? getClientIp(request)}`, 30, HOUR))) {
    return respond(429, { error: "rate_limited" });
  }

  const { who, ...person } = userId ? await getAccountDetails(userId) : details;

  return respond(200, {
    problem: await findPasswordProblem(password, who, person),
  });
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  try {
    return await checkPassword(request, parsed.data);
  } catch (error) {
    console.error("check-password failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
