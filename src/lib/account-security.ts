// A signed-in account's sign-ins: where it's signed in, signing those out, and new-device alerts.
import { z } from "zod";
import { supabase } from "./supabase";

const kindSchema = z.enum(["phone", "laptop", "tablet"]);

const securitySchema = z.object({
  login_alerts: z.boolean(),
  sessions: z.array(
    z.object({
      id: z.string(),
      device: z.string(),
      kind: kindSchema,
      signed_in_at: z.string(),
      active_at: z.string(),
      is_current: z.boolean(),
    }),
  ),
});

const trustedDevicesSchema = z.array(
  z.object({
    id: z.string(),
    label: z.string(),
    kind: kindSchema,
    expires_at: z.string(),
    last_used_at: z.string().nullable(),
  }),
);

export type AccountSecurity = z.infer<typeof securitySchema> & {
  trusted_devices: z.infer<typeof trustedDevicesSchema>;
};

const throwIfFailed = ({ error }: { error: Error | null }) => {
  if (error) throw error;
};

export const fetchAccountSecurity = async () => {
  const [{ data, error }, { data: trustedDevices }] = await Promise.all([
    supabase.rpc("get_account_security"),
    supabase
      .from("trusted_devices")
      .select("id, label, kind, expires_at, last_used_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  if (error) throw error;

  return {
    ...securitySchema.parse(data),
    trusted_devices: trustedDevicesSchema.catch([]).parse(trustedDevices),
  };
};

export const signOutSession = async (id: string) =>
  throwIfFailed(await supabase.rpc("sign_out_session", { target: id }));

export const signOutOtherSessions = async () => {
  throwIfFailed(await supabase.rpc("revoke_other_trusted_devices"));
  throwIfFailed(await supabase.auth.signOut({ scope: "others" }));
};

export const removeTrustedDevice = async (id: string) =>
  throwIfFailed(await supabase.from("trusted_devices").delete().eq("id", id));

export const saveLoginAlerts = async (userId: string, isOn: boolean) =>
  throwIfFailed(
    await supabase
      .from("profiles")
      .update({ login_alerts: isOn })
      .eq("id", userId),
  );
