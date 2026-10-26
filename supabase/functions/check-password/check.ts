import { getPasswordMin, getPasswordProblem } from "../_shared/password-rules.ts";
import type { PasswordPerson, PasswordRole } from "../_shared/password-rules.ts";
import { isPwnedPassword } from "../_shared/pwned-password.ts";

/** Our own rules first, then breached passwords; "" when the password can be used. */
export const findPasswordProblem = async (password: string, who: PasswordRole, person: PasswordPerson) => {
  const problem = getPasswordProblem(password, getPasswordMin(who), person);

  if (problem) return problem;

  return (await isPwnedPassword(password)) ? "pwned" : "";
};
