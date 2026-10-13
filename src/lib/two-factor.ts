// Two-factor checks at log in (enrolment comes with Phase 2b).
import { getErrorCode } from "./auth-helpers";
import { supabase } from "./supabase";

/** True when the account has 2FA set up but this session hasn't passed it yet. */
export const needsSecondFactor = async () => {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  getErrorCode(error, []);

  return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
};

/** Verifies a code from the main (or backup) authenticator app. */
export const verifySecondFactor = async (code: string, useBackup: boolean) => {
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
