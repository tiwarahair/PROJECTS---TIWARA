// BusinessDetails state, validation and display values
import { formatPostcode, isPostcodeValid } from "../../utils/address";
import type { TaxDetails } from "../tax-details-form/tax-details-logic";

export type BusinessType = "shop" | "chair" | "home" | "mobile";
export type BusinessPreset =
  BusinessType | "vatValid" | "vatInvalid" | "unsaved" | "pcError";
export type BusinessRuleKey =
  "address" | "basePostcode" | "phone" | "email" | "vat";

export interface BusinessFields {
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  basePostcode: string;
  radius: string;
  phone: string;
  email: string;
  vat: string;
}

/** What onSave receives; also accepted back as `value` to seed the form. */
export interface BusinessValue {
  type: BusinessType;
  vatOn: boolean;
  details: BusinessFields;
}

export interface BusinessState extends BusinessValue {
  saved: string;
  touched: Partial<Record<BusinessRuleKey, boolean>>;
  toast: boolean;
  addressSource?: string;
}

const getBaseBusiness = (): BusinessValue => ({
  type: "shop",
  vatOn: false,
  details: {
    line1: "118 Wilmslow Road",
    line2: "Unit 4",
    city: "Manchester",
    postcode: "M14 5AJ",
    basePostcode: "M14 5AJ",
    radius: "10",
    phone: "07700 900418",
    email: "hello@tiwarashouse.co.uk",
    vat: "",
  },
});

/** Compares saved and current details. */
export const getBusinessKey = ({
  type,
  vatOn,
  details,
}: BusinessValue): string => JSON.stringify([type, vatOn, details]);

export const getInitialBusinessState = (
  preset: BusinessPreset,
  value?: Partial<Omit<BusinessValue, "details">> & {
    details?: Partial<BusinessFields>;
  },
): BusinessState => {
  const base = getBaseBusiness();
  const touched: BusinessState["touched"] = {};

  // seeded by the host (Studio) from its saved business details
  if (value) {
    if (value.type) base.type = value.type;

    base.vatOn = !!value.vatOn;
    Object.assign(base.details, value.details ?? {});

    return { ...base, saved: getBusinessKey(base), touched, toast: false };
  }

  const setFields = (fields: Partial<BusinessFields>) =>
    Object.assign(base.details, fields);

  let addressSource: string | undefined;

  if (preset === "chair") {
    base.type = "chair";

    setFields({
      line1: "Crown & Coil Salon, chair 3",
      line2: "41 Beech Road",
      postcode: "M21 9EG",
    });
  }

  if (preset === "home") {
    base.type = "home";
    setFields({ line1: "27 Heald Place", line2: "", postcode: "M14 5TQ" });
  }

  if (preset === "mobile") {
    base.type = "mobile";
    setFields({ basePostcode: "M16 8AF", radius: "10" });
  }

  if (preset === "vatValid") {
    base.vatOn = true;
    setFields({ vat: "312 4567 89" });
  }

  if (preset === "vatInvalid") {
    base.vatOn = true;
    setFields({ vat: "312 4567" });
    touched.vat = true;
  }

  const saved = getBusinessKey(base);

  if (preset === "unsaved") setFields({ phone: "07700 900512" });

  if (preset === "pcError") {
    setFields({ postcode: "M14 5T" });
    touched.address = true;
    addressSource = "manual";
  }

  return {
    ...base,
    saved,
    touched,
    toast: false,
    ...(addressSource ? { addressSource } : {}),
  };
};

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

  return !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
    ? "Enter an email address, like name@example.co.uk."
    : "";
};

/** Every rule, scoped to the fields the current business type actually shows. */
export const getBusinessErrors = ({
  type,
  vatOn,
  details,
}: BusinessValue): Record<BusinessRuleKey, string> => {
  const vatDigits = details.vat.replace(/\s+/g, "");

  return {
    address:
      type !== "mobile" &&
      !(
        details.line1.trim() &&
        details.city.trim() &&
        isPostcodeValid(details.postcode)
      )
        ? "Enter your address."
        : "",
    basePostcode:
      type === "mobile" && !isPostcodeValid(details.basePostcode)
        ? "Enter a full UK postcode, like M16 8AF."
        : "",
    phone: getPhoneError(details.phone, details.email),
    email: getEmailError(details.email, details.phone),
    vat:
      vatOn && !/^(\d{9}|\d{12})$/.test(vatDigits)
        ? "UK VAT numbers are 9 digits, or 12 for some businesses."
        : "",
  };
};

const AREAS: Record<string, string> = {
  M13: "Longsight",
  M14: "Rusholme",
  M15: "Moss Side",
  M16: "Whalley Range",
  M19: "Levenshulme",
  M20: "Didsbury",
  M21: "Chorlton",
  M32: "Stretford",
  M33: "Sale",
  // eslint-disable-next-line id-length -- postcode outward code, looked up from user input
  M8: "Cheetham Hill",
};

/** "Rusholme, M14" — what clients see for a home-based stylist. */
export const getAreaLabel = (postcode: string): string => {
  if (!isPostcodeValid(postcode)) return "Add your postcode to see your area";

  const [outward = ""] = formatPostcode(postcode).split(" ");
  const area = AREAS[outward];

  return area ? `${area}, ${outward}` : outward;
};

/** "GB 312 4567 89" (or the 12-digit grouping). */
export const formatVatNumber = (digits: string): string => {
  const grouped =
    digits.length === 9
      ? digits.replace(/(\d{3})(\d{4})(\d{2})/, "$1 $2 $3")
      : digits.replace(/(\d{3})(\d{4})(\d{2})(\d{3})/, "$1 $2 $3 $4");

  return `GB ${grouped}`;
};

/** The legal details rows; with no `tax` prop a sole trader is shown. */
export const getLegalRows = (
  tax: Partial<TaxDetails> | null | undefined,
): { label: string; value: string }[] => {
  const details: Partial<TaxDetails> | null =
    tax === undefined ? { kind: "sole", legalName: "Amara Okonkwo" } : tax;

  if (!details) return [];

  return details.kind === "ltd"
    ? [
        { label: "Business set up as", value: "Limited company" },
        { label: "Legal name", value: details.companyName ?? "" },
        { label: "Company number", value: details.companyNumber ?? "" },
      ]
    : [
        { label: "Business set up as", value: "Sole trader" },
        { label: "Legal name", value: details.legalName ?? "" },
      ];
};
