import { z } from "zod";
import { checkPassword } from "../../utils/password";
import type { PasswordCheck } from "../../utils/password";
import { isValidEmail, isValidMobile } from "../../utils/validation";
import type { OnboardingForm, OnboardingState } from "./state";

export type ValidationInput = Pick<OnboardingState, "screen" | "audience"> & {
  form: OnboardingForm;
  /** A signed-in account becoming a stylist: no new password. */
  isUpgrade?: boolean;
};

/** Every field with no rules; each screen extends it with its own. */
export const formSchema = z.object({
  email: z.string(),
  password: z.string(),
  passwordConfirm: z.string(),
  first: z.string(),
  last: z.string(),
  mobile: z.string(),
  terms: z.boolean(),
  marketing: z.boolean(),
  trustDevice: z.boolean(),
  businessName: z.string(),
  postcode: z.string(),
  line1: z.string(),
  line2: z.string(),
  city: z.string(),
  type: z.string(),
  radius: z.number(),
  categories: z.array(z.string()),
  useContact: z.boolean(),
  businessPhone: z.string(),
  businessEmail: z.string(),
  referralSource: z.string(),
  referralSourceOther: z.string(),
}) satisfies z.ZodType<OnboardingForm>;

/** Reports an error on a field (or a group key like "address"). */
export const addError = (
  context: z.RefinementCtx,
  field: string,
  message: string,
) => context.addIssue({ code: "custom", path: [field], message });

export const email = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .refine(isValidEmail, "Enter a valid email address");

export const mobile = z
  .string()
  .trim()
  .min(1, "Enter your mobile number")
  .refine(isValidMobile, "Enter a valid UK mobile, like 7700 900123");

export const names = {
  first: z.string().trim().min(1, "Enter your first name"),
  last: z.string().trim().min(1, "Enter your last name"),
};

// a refine (not z.literal) so a failure doesn't stop the screen's other checks running
export const terms = z
  .boolean()
  .refine(Boolean, "Agree to the terms to continue");

/** Pros need 8+ characters, clients 15+. */
const getPasswordWho = ({ screen, audience }: ValidationInput) => {
  if (screen === "w4") return "pro";

  if (screen === "cust-create") return "client";

  return audience === "customer" ? "client" : "pro";
};

export const getPasswordCheck = (input: ValidationInput): PasswordCheck => {
  const { first, last, email: address, password } = input.form;
  const min = getPasswordWho(input) === "pro" ? 8 : 15;

  return checkPassword(password, { min, first, last, email: address });
};

/** The password rule (length, blocklist, name/email, site name) as a check on the whole form. */
export const checkPasswordField = (
  input: ValidationInput,
  form: OnboardingForm,
  context: z.RefinementCtx,
) => {
  const { error } = getPasswordCheck({ ...input, form });

  if (error) addError(context, "password", error);
};
