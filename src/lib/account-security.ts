// A signed-in account's sign-ins: where it's signed in, signing those out, and new-device alerts.
import { z } from "zod";
import { supabase } from "./supabase";

const securitySchema = z.object({
  login_alerts: z.boolean(),
  sessions: z.array(
    z.object({
      id: z.string(),
      device: z.string(),
      kind: z.enum(["phone", "laptop", "tablet"]),
      signed_in_at: z.string(),
      active_at: z.string(),
      is_current: z.boolean(),
    }),
  ),
});

export type AccountSecurity = z.infer<typeof securitySchema>;

const throwIfFailed = ({ error }: { error: Error | null }) => {
  if (error) throw error;
};

export const fetchAccountSecurity = async () => {
  const { data, error } = await supabase.rpc("get_account_security");

  if (error) throw error;

  return securitySchema.parse(data);
};

export const signOutSession = async (id: string) =>
  throwIfFailed(await supabase.rpc("sign_out_session", { target: id }));

export const signOutOtherSessions = async () =>
  throwIfFailed(await supabase.auth.signOut({ scope: "others" }));

export const saveLoginAlerts = async (userId: string, isOn: boolean) =>
  throwIfFailed(
    await supabase
      .from("profiles")
      .update({ login_alerts: isOn })
      .eq("id", userId),
  );
