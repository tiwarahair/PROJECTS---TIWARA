import { z } from "zod";
import { isPostcodeValid } from "../../utils/address";
import { getAddressKey } from "./tax-details-logic";
import type { TaxFormValues } from "./tax-details-logic";

const addressSchema = z.object({
  same: z.boolean(),
  fields: z.object({
    line1: z.string(),
    line2: z.string(),
    city: z.string(),
    postcode: z.string(),
  }),
  src: z.string(),
});

const isNameBad = (value: string) =>
  !/^[A-Za-zÀ-ÿ' -]+$/.test(value.trim()) ||
  value.trim().replace(/[^A-Za-zÀ-ÿ]/g, "").length < 2;

const getNameError = (value: string, empty: string) => {
  if (!value.trim()) return empty;

  return isNameBad(value) ? "Enter your full name, not initials." : "";
};

const getDateOfBirthError = ({ day, month, year }: TaxFormValues) => {
  if (!day || !month || !year) return "Enter your date of birth";

  const date = new Date(+year, +month - 1, +day);
  const now = new Date();

  if (
    year.length < 4 ||
    +year < 1900 ||
    date.getFullYear() !== +year ||
    date.getMonth() !== +month - 1 ||
    date.getDate() !== +day ||
    date > now
  )
    return "Enter a real date of birth.";

  return new Date(+year + 18, +month - 1, +day) > now
    ? "You must be 18 or over to receive payouts."
    : "";
};

const getNationalInsuranceError = (value: string, hint: string) => {
  const compact = value.replace(/\s/g, "").toUpperCase();

  if (!compact) return hint ? "" : "Enter your National Insurance number";

  return /^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(
    compact,
  )
    ? ""
    : "Enter a National Insurance number like QQ 12 34 56 C.";
};

const getCompanyNumberError = (value: string) => {
  const compact = value.replace(/\s/g, "").toUpperCase();

  if (!compact) return "Enter your company registration number";

  return /^([0-9]{8}|[A-Z]{2}[0-9]{6})$/.test(compact)
    ? ""
    : "Enter your 8-character company registration number.";
};

/** A saved NI number (`nationalInsuranceHint`) lets the NI field be left blank. */
export const getTaxSchema = (nationalInsuranceHint: string) =>
  z
    .object({
      kind: z.enum(["sole", "ltd"]),
      nameYes: z.boolean(),
      first: z.string(),
      middle: z.string(),
      last: z.string(),
      day: z.string(),
      month: z.string(),
      year: z.string(),
      nationalInsuranceNumber: z.string(),
      companyName: z.string(),
      companyNumber: z.string(),
      home: addressSchema,
      registered: addressSchema,
    })
    .superRefine((values, context) => {
      const isSole = values.kind === "sole";

      const flag = (path: string[], message: string) => {
        if (message) context.addIssue({ code: "custom", path, message });
      };

      if (isSole && !values.nameYes) {
        flag(
          ["first"],
          getNameError(values.first, "Enter your legal first name"),
        );

        flag(["last"], getNameError(values.last, "Enter your legal last name"));
      }

      if (isSole) {
        flag(["day"], getDateOfBirthError(values));

        flag(
          ["nationalInsuranceNumber"],
          getNationalInsuranceError(
            values.nationalInsuranceNumber,
            nationalInsuranceHint,
          ),
        );
      } else {
        if (!values.companyName.trim())
          flag(["companyName"], "Enter your company name");

        flag(["companyNumber"], getCompanyNumberError(values.companyNumber));
      }

      const key = getAddressKey(values.kind);
      const { same, fields } = values[key];

      if (
        !same &&
        !(
          fields.line1.trim() &&
          fields.city.trim() &&
          isPostcodeValid(fields.postcode)
        )
      )
        flag(
          [key, "fields"],
          isSole
            ? "Enter your home address"
            : "Enter your registered office address",
        );
    }) satisfies z.ZodType<TaxFormValues>;
