// Which rules each onboarding screen checks.
import { z } from "zod";
import { isPostcodeValid } from "../../utils/address";
import {
  addError,
  checkPasswordField,
  email,
  formSchema,
  mobile,
  names,
  terms,
} from "./field-schemas";
import type { ValidationInput } from "./field-schemas";

/** The schema for the current screen; screens without fields accept anything. */
export const getScreenSchema = (input: ValidationInput) => {
  switch (input.screen) {
    case "cust-email":
    case "pro-email":
    case "forgot-email":
      return formSchema.extend({ email });
    case "cust-password":
    case "pro-password":
      return formSchema.extend({
        password: z.string().min(1, "Enter your password"),
      });
    case "cust-create":
      return formSchema
        .extend({ ...names, mobile, terms })
        .superRefine((form, context) =>
          checkPasswordField(input, form, context),
        );
    case "cust-social":
      return formSchema.extend({ ...names, mobile, terms });
    case "forgot-reset":
      return formSchema.superRefine((form, context) => {
        checkPasswordField(input, form, context);

        if (!form.passwordConfirm)
          addError(context, "passwordConfirm", "Confirm your new password");
        else if (form.password !== form.passwordConfirm)
          addError(context, "passwordConfirm", "Passwords don’t match");
      });
    case "w1":
      return formSchema.extend({
        type: z.string().min(1, "Choose how you work"),
      });
    case "w2":
      return formSchema.extend({
        categories: z.array(z.string()).min(1, "Choose at least one"),
      });
    case "w3":
      return formSchema
        .extend({
          businessName: z.string().trim().min(1, "Enter your business name"),
        })
        .superRefine(({ type, postcode, line1, city }, context) => {
          if (type !== "mobile") {
            if (!line1.trim() || !city.trim() || !isPostcodeValid(postcode))
              addError(context, "address", "Enter your address");
          } else if (!postcode.trim())
            addError(context, "postcode", "Enter your base postcode");
          else if (!isPostcodeValid(postcode))
            addError(
              context,
              "postcode",
              "Enter a valid UK postcode, like M14 5TQ",
            );
        });
    case "w4":
      return formSchema
        .extend({ ...names, email, mobile, terms })
        .superRefine((form, context) => {
          if (!input.isUpgrade) checkPasswordField(input, form, context);

          if (
            !form.useContact &&
            !form.businessPhone.trim() &&
            !form.businessEmail.trim()
          )
            addError(context, "businessContact", "Add at least one");
        });
    case "w5":
      return formSchema
        .extend({ referralSource: z.string().min(1, "Choose an option") })
        .superRefine(({ referralSource, referralSourceOther }, context) => {
          if (referralSource === "Other" && !referralSourceOther.trim())
            addError(context, "referralSourceOther", "Tell us where");
        });
    default:
      return formSchema;
  }
};

/** Field errors for the current screen: the first message per field. */
export const getErrors = (input: ValidationInput): Record<string, string> => {
  const result = getScreenSchema(input).safeParse(input.form);
  const errors: Record<string, string> = {};

  if (result.success) return errors;

  for (const { path, message } of result.error.issues)
    errors[String(path[0])] ??= message;

  return errors;
};
