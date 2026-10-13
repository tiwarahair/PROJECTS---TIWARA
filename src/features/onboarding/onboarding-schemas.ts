// Zod schema per onboarding screen; the single source of the form's validation rules.
import { z } from "zod";
import { isPostcodeValid } from "../../utils/address";
import { checkPassword } from "../../utils/password";
import type { PasswordCheck } from "../../utils/password";
import type { OnboardingForm, OnboardingState } from "./onboarding-state";

export type ValidationInput = Pick<OnboardingState, "screen" | "audience"> & {
  form: OnboardingForm;
};

export const isValidMobile = (value: string): boolean => {
  const digits = value.replace(/\D/g, "");

  return /^7\d{9}$/.test(digits) || /^07\d{9}$/.test(digits);
};

export const isValidPostcode = (value: string): boolean =>
  /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(value.trim());

/** Pros need 8+ characters, clients 15+. */
const getPasswordWho = ({
  screen,
  audience,
}: ValidationInput): "pro" | "client" => {
  if (screen === "w4") return "pro";

  if (screen === "cust-create") return "client";

  return audience === "customer" ? "client" : "pro";
};

export const getPasswordCheck = (input: ValidationInput): PasswordCheck => {
  const { first, last, email, password } = input.form;
  const min = getPasswordWho(input) === "pro" ? 8 : 15;

  return checkPassword(password, { min, first, last, email });
};

const termsError = "Agree to the terms to continue";

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .regex(
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    "Enter a valid email address, like name@example.com",
  );

const mobile = z
  .string()
  .trim()
  .min(1, "Enter your mobile number")
  .refine(isValidMobile, "Enter a valid UK mobile, like 7700 900123");

const names = {
  first: z.string().trim().min(1, "Enter your first name"),
  last: z.string().trim().min(1, "Enter your last name"),
};

// a refine (not z.literal) so a failure doesn't stop the screen's other checks running
const terms = z.boolean().refine(Boolean, termsError);

/** Adds the password rule's error (length, blocklist, name/email, site name). */
const refinePassword =
  (input: ValidationInput) =>
  (form: OnboardingForm, context: z.RefinementCtx) => {
    const { error } = getPasswordCheck({ ...input, form });

    if (error)
      context.addIssue({ code: "custom", path: ["password"], message: error });
  };

type FormSchema = z.ZodType<OnboardingForm, OnboardingForm>;

const fields = (shape: z.ZodRawShape) =>
  z.looseObject(shape) as unknown as FormSchema;

const getWizardDetailsSchema = () =>
  fields({
    businessName: z.string().trim().min(1, "Enter your business name"),
  }).superRefine(({ type, postcode, line1, city }, context) => {
    if (type !== "mobile") {
      if (!line1.trim() || !city.trim() || !isPostcodeValid(postcode))
        context.addIssue({
          code: "custom",
          path: ["address"],
          message: "Enter your address",
        });

      return;
    }

    if (!postcode.trim())
      context.addIssue({
        code: "custom",
        path: ["postcode"],
        message: "Enter your base postcode",
      });
    else if (!isValidPostcode(postcode))
      context.addIssue({
        code: "custom",
        path: ["postcode"],
        message: "Enter a valid UK postcode, like M14 5TQ",
      });
  });

/** The schema for the current screen; screens without fields accept anything. */
export const getScreenSchema = (input: ValidationInput): FormSchema => {
  switch (input.screen) {
    case "cust-email":
    case "pro-email":
    case "forgot-email":
      return fields({ email });
    case "cust-password":
    case "pro-password":
      return fields({ password: z.string().min(1, "Enter your password") });
    case "cust-create":
      return fields({ ...names, mobile, terms }).superRefine(
        refinePassword(input),
      );
    case "cust-social":
      return fields({ ...names, mobile, terms });
    case "forgot-reset":
      return fields({}).superRefine((form, context) => {
        refinePassword(input)(form, context);

        const message = !form.passwordConfirm
          ? "Confirm your new password"
          : form.password !== form.passwordConfirm && "Passwords don’t match";

        if (message)
          context.addIssue({
            code: "custom",
            path: ["passwordConfirm"],
            message,
          });
      });
    case "w1":
      return fields({ type: z.string().min(1, "Choose how you work") });
    case "w2":
      return fields({
        categories: z.array(z.string()).min(1, "Choose at least one"),
      });
    case "w3":
      return getWizardDetailsSchema();
    case "w4":
      return fields({ ...names, email, mobile, terms }).superRefine(
        (form, context) => {
          refinePassword(input)(form, context);

          if (
            !form.useContact &&
            !form.businessPhone.trim() &&
            !form.businessEmail.trim()
          )
            context.addIssue({
              code: "custom",
              path: ["businessContact"],
              message: "Add at least one",
            });
        },
      );
    case "w5":
      return fields({
        referralSource: z.string().min(1, "Choose an option"),
      }).superRefine(({ referralSource, referralSourceOther }, context) => {
        if (referralSource === "Other" && !referralSourceOther.trim())
          context.addIssue({
            code: "custom",
            path: ["referralSourceOther"],
            message: "Tell us where",
          });
      });
    default:
      return fields({});
  }
};

/** Field errors for the current screen: the first message per field. */
export const getErrors = (input: ValidationInput): Record<string, string> => {
  const result = getScreenSchema(input).safeParse(input.form);
  const errors: Record<string, string> = {};

  if (result.success) return errors;

  for (const { path, message } of result.error.issues) {
    const key = String(path[0]);

    errors[key] ??= message;
  }

  return errors;
};
