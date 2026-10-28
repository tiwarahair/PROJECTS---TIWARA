import { z } from "zod";
import { isPostcodeValid } from "../../utils/address";
import { isValidEmail, EMAIL_ERROR } from "../../utils/validation";
import type { BusinessFieldName, BusinessFormValues } from "./types";

const getPhoneError = (phone: string, email: string): string => {
  if (!phone.trim())
    return !email.trim() ? "Enter a phone number or an email address." : "";

  return !/^(?:\+44|0)\d{9,10}$/.test(phone.replace(/[\s()-]/g, ""))
    ? "Enter a UK phone number, like 07700 900418."
    : "";
};

const getEmailError = (email: string, phone: string): string => {
  if (!email.trim())
    return !phone.trim() ? "Enter a phone number or an email address." : "";

  return !isValidEmail(email) ? EMAIL_ERROR : "";
};

export const getVatError = (vatOn: boolean, vat: string) =>
  vatOn && !/^(\d{9}|\d{12})$/.test(vat.replace(/\s+/g, ""))
    ? "UK VAT numbers are 9 digits, or 12 for some businesses."
    : "";

/** Every rule, scoped to the fields the current business type actually shows. */
export const getBusinessErrors = ({
  type,
  vatOn,
  address,
  basePostcode,
  phone,
  email,
  vat,
}: BusinessFormValues): Record<BusinessFieldName, string> => ({
  address:
    type !== "mobile" &&
    !(
      address.line1.trim() &&
      address.city.trim() &&
      isPostcodeValid(address.postcode)
    )
      ? "Enter your address."
      : "",
  basePostcode:
    type === "mobile" && !isPostcodeValid(basePostcode)
      ? "Enter a full UK postcode, like M16 8AF."
      : "",
  phone: getPhoneError(phone, email),
  email: getEmailError(email, phone),
  vat: getVatError(vatOn, vat),
});

export const businessSchema = z
  .custom<BusinessFormValues>()
  .superRefine((values, context) => {
    Object.entries(getBusinessErrors(values)).forEach(([path, message]) => {
      if (message) context.addIssue({ code: "custom", path: [path], message });
    });
  });
