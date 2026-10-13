// Two-step verification with an authenticator app (Supabase MFA, TOTP): log in, set up, remove, re-confirm.
import { getErrorCode } from "./auth-helpers";
import { supabase } from "./supabase";

/** How recently a code must have been entered for sensitive changes (tax details, payouts). */
const RECENT_DAYS = 30;

export interface TwoFactorDevice {
  id: string;
  name: string;
  /** Every app after the first is a backup. */
  backup: boolean;
}

export interface TwoFactorEnrolment {
  factorId: string;
  /** An SVG data URL. */
  qrCode: string;
  secret: string;
  /** otpauth:// link that opens an authenticator app on a phone. */
  uri: string;
}

/** Supabase can't rename a factor, so the names people choose live on their account. */
const getDeviceNames = async (): Promise<Record<string, string>> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const names: unknown = user?.user_metadata.mfa_names;

  return names && typeof names === "object"
    ? Object.fromEntries(
        Object.entries(names).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : {};
};

/** True when the account has 2FA set up but this session hasn't passed it yet. */
export const needsSecondFactor = async () => {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  getErrorCode(error, []);

  return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
};

/** True when this session entered an app code in the last 30 days. */
export const hasRecentSecondFactor = async () => {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  getErrorCode(error, []);

  const cutoff = Date.now() / 1000 - RECENT_DAYS * 86400;

  return (
    data?.currentLevel === "aal2" &&
    data.currentAuthenticationMethods.some(
      (entry) =>
        typeof entry !== "string" &&
        entry.method === "totp" &&
        entry.timestamp > cutoff,
    )
  );
};

/** Verifies a code from the main (or backup) authenticator app. */
export const verifySecondFactor = async (code: string, useBackup = false) => {
  const { data, error } = await supabase.auth.mfa.listFactors();

  getErrorCode(error, []);

  const factor = data?.totp[useBackup ? 1 : 0];

  if (!factor) return false;

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });

  return !getErrorCode(verifyError, ["mfa_verification_failed"]);
};

/** The account's authenticator apps, oldest (the main one) first. */
export const listTwoFactorDevices = async (): Promise<TwoFactorDevice[]> => {
  const [{ data, error }, names] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    getDeviceNames(),
  ]);

  getErrorCode(error, []);

  return [...(data?.totp ?? [])]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map(({ id, friendly_name }, index) => ({
      id,
      name: names[id] ?? friendly_name ?? "Authenticator app",
      backup: index > 0,
    }));
};

/** Starts adding an app; any set-up abandoned earlier is cleared first. */
export const startTwoFactorEnrolment =
  async (): Promise<TwoFactorEnrolment> => {
    const { data: factors } = await supabase.auth.mfa.listFactors();

    await Promise.all(
      (factors?.all ?? [])
        .filter(({ status }) => status === "unverified")
        .map(({ id }) => supabase.auth.mfa.unenroll({ factorId: id })),
    );

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: crypto.randomUUID(),
    });

    getErrorCode(error, []);

    if (!data) throw new Error("Two-step verification couldn’t start");

    const { id, totp } = data;

    return {
      factorId: id,
      qrCode: totp.qr_code,
      secret: totp.secret,
      uri: totp.uri,
    };
  };

/** Finishes adding an app with its first code; false when the code is wrong. */
export const confirmTwoFactorEnrolment = async (
  factorId: string,
  code: string,
  name: string,
) => {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (getErrorCode(error, ["mfa_verification_failed"])) return false;

  const names = await getDeviceNames();

  const { error: nameError } = await supabase.auth.updateUser({
    data: { mfa_names: { ...names, [factorId]: name } },
  });

  getErrorCode(nameError, []);

  return true;
};

/** Removes an app after a code from the main one; false when the code is wrong. */
export const removeTwoFactorApp = async (factorId: string, code: string) => {
  if (!(await verifySecondFactor(code))) return false;

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  getErrorCode(error, []);

  return true;
};
