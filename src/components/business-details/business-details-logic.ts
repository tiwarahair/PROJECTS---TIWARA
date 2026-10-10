// BusinessDetails state, validation and display values (prototype BusinessDetails.dc.html: base, key, init, rules,
// AREAS, legalRows, vatPretty).
import { formatPostcode, isPostcodeValid } from "../../utils/address";
import type { TaxDetails } from "../tax-details-form/tax-details-logic";

export type BusinessType = "shop" | "chair" | "home" | "mobile";
export type BusinessPreset =
  BusinessType | "vatValid" | "vatInvalid" | "unsaved" | "pcError";
export type BusinessRuleKey = "addr" | "basePc" | "phone" | "email" | "vat";

export interface BusinessFields {
  line1: string;
  line2: string;
  city: string;
  pc: string;
  basePc: string;
  radius: string;
  phone: string;
  email: string;
  vat: string;
}

/** What onSave receives; also accepted back as `value` to seed the form. */
export interface BusinessValue {
  type: BusinessType;
  vatOn: boolean;
  v: BusinessFields;
}

export interface BusinessState extends BusinessValue {
  saved: string;
  touched: Partial<Record<BusinessRuleKey, boolean>>;
  toast: boolean;
  addrSrc?: string;
}

const getBaseBusiness = (): BusinessValue => ({
  type: "shop",
  vatOn: false,
  v: {
    line1: "118 Wilmslow Road",
    line2: "Unit 4",
    city: "Manchester",
    pc: "M14 5AJ",
    basePc: "M14 5AJ",
    radius: "10",
    phone: "07700 900418",
    email: "hello@amarabeauty.co.uk",
    vat: "",
  },
});

/** Compares saved and current details (prototype key()). */
export const getBusinessKey = ({ type, vatOn, v }: BusinessValue): string =>
  JSON.stringify([type, vatOn, v]);

export const getInitialBusinessState = (
  preset: BusinessPreset,
  value?: Partial<Omit<BusinessValue, "v">> & { v?: Partial<BusinessFields> },
): BusinessState => {
  const base = getBaseBusiness();
  const touched: BusinessState["touched"] = {};
  // seeded by the host (Studio) from its saved business details
  if (value) {
    if (value.type) base.type = value.type;
    base.vatOn = !!value.vatOn;
    Object.assign(base.v, value.v ?? {});
    return { ...base, saved: getBusinessKey(base), touched, toast: false };
  }
  const setFields = (fields: Partial<BusinessFields>) =>
    Object.assign(base.v, fields);
  let addrSrc: string | undefined;
  if (preset === "chair") {
    base.type = "chair";
    setFields({
      line1: "Crown & Coil Salon, chair 3",
      line2: "41 Beech Road",
      pc: "M21 9EG",
    });
  }
  if (preset === "home") {
    base.type = "home";
    setFields({ line1: "27 Heald Place", line2: "", pc: "M14 5TQ" });
  }
  if (preset === "mobile") {
    base.type = "mobile";
    setFields({ basePc: "M16 8AF", radius: "10" });
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
    setFields({ pc: "M14 5T" });
    touched.addr = true;
    addrSrc = "manual";
  }
  return {
    ...base,
    saved,
    touched,
    toast: false,
    ...(addrSrc ? { addrSrc } : {}),
  };
};

/** Every rule, scoped to the fields the current business type actually shows. */
export const getBusinessErrors = ({
  type,
  vatOn,
  v,
}: BusinessValue): Record<BusinessRuleKey, string> => {
  const vatDigits = v.vat.replace(/\s+/g, "");
  return {
    addr:
      type !== "mobile" &&
      !(v.line1.trim() && v.city.trim() && isPostcodeValid(v.pc))
        ? "Enter your address."
        : "",
    basePc:
      type === "mobile" && !isPostcodeValid(v.basePc)
        ? "Enter a full UK postcode, like M16 8AF."
        : "",
    phone: !v.phone.trim()
      ? !v.email.trim()
        ? "Enter a phone number or an email address."
        : ""
      : !/^(?:\+44|0)\d{9,10}$/.test(v.phone.replace(/[\s()-]/g, ""))
        ? "Enter a UK phone number, like 07700 900418."
        : "",
    email: !v.email.trim()
      ? !v.phone.trim()
        ? "Enter a phone number or an email address."
        : ""
      : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())
        ? "Enter an email address, like name@example.co.uk."
        : "",
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
  M8: "Cheetham Hill",
};

/** "Rusholme, M14" — what clients see for a home-based stylist. */
export const getAreaLabel = (postcode: string): string => {
  if (!isPostcodeValid(postcode)) return "Add your postcode to see your area";
  const [outward = ""] = formatPostcode(postcode).split(" ");
  const area = AREAS[outward];
  return area ? area + ", " + outward : outward;
};

/** "GB 312 4567 89" (or the 12-digit grouping). */
export const formatVatNumber = (digits: string): string =>
  "GB " +
  (digits.length === 9
    ? digits.replace(/(\d{3})(\d{4})(\d{2})/, "$1 $2 $3")
    : digits.replace(/(\d{3})(\d{4})(\d{2})(\d{3})/, "$1 $2 $3 $4"));

/** The legal details rows; with no `tax` prop the prototype shows a sole trader. */
export const getLegalRows = (
  tax: Partial<TaxDetails> | null | undefined,
): { label: string; value: string }[] => {
  const details: Partial<TaxDetails> | null =
    tax === undefined ? { kind: "sole", legalName: "Amara Okonkwo" } : tax;
  if (!details) return [];
  return details.kind === "ltd"
    ? [
        { label: "Business set up as", value: "Limited company" },
        { label: "Legal name", value: details.coName ?? "" },
        { label: "Company number", value: details.coNum ?? "" },
      ]
    : [
        { label: "Business set up as", value: "Sole trader" },
        { label: "Legal name", value: details.legalName ?? "" },
      ];
};
