// TaxDetailsForm values and output.
import { formatPostcode } from "../../utils/address";

export type TaxKind = "sole" | "ltd";

interface TaxAddress {
  line1: string;
  line2: string;
  city: string;
  postcode: string;
}

/** The business address step's result (Studio passes it in). */
export interface TaxBusiness {
  type?: string;
  details?: Partial<TaxAddress>;
}

/** What onSubmit receives; also accepted back as `value` to prefill. */
export interface TaxDetails {
  kind: TaxKind;
  nameYes: boolean;
  first: string;
  middle: string;
  last: string;
  legalName: string;
  day: string;
  month: string;
  year: string;
  nationalInsuranceNumber: string;
  /** A saved NI number, masked ("QQ •• •• 56 C"); the form may then be left blank to keep it. */
  nationalInsuranceHint?: string;
  companyName: string;
  companyNumber: string;
  isAddressSame: boolean;
  address: TaxAddress;
}

export interface TaxAddressValues {
  same: boolean;
  fields: TaxAddress;
  src: string;
}

export interface TaxFormValues {
  kind: TaxKind;
  nameYes: boolean;
  first: string;
  middle: string;
  last: string;
  day: string;
  month: string;
  year: string;
  nationalInsuranceNumber: string;
  companyName: string;
  companyNumber: string;
  home: TaxAddressValues;
  registered: TaxAddressValues;
}

interface InitialTax {
  values: TaxFormValues;
  nationalInsuranceHint: string;
}

/** A chair rental counts as a shop. */
export const getTaxBusiness = (business?: TaxBusiness) => {
  const { type, details } = business ?? {};

  return {
    type: type === "chair" ? "shop" : type || "shop",
    details: details ?? {},
  };
};

export const getBlankAddress = (): TaxAddress => ({
  line1: "",
  line2: "",
  city: "",
  postcode: "",
});

export const getAddressKey = (kind: TaxKind): "home" | "registered" =>
  kind === "ltd" ? "registered" : "home";

export const getInitialTax = ({
  businessName,
  business,
  value,
}: {
  businessName: string;
  business?: TaxBusiness;
  value?: Partial<TaxDetails>;
}): InitialTax => {
  const { type } = getTaxBusiness(business);
  const sameOk = type === "home" || type === "shop";

  const values: TaxFormValues = {
    kind: "sole",
    nameYes: true,
    first: "",
    middle: "",
    last: "",
    day: "",
    month: "",
    year: "",
    nationalInsuranceNumber: "",
    companyName: businessName,
    companyNumber: "",
    home: { same: type === "home", fields: getBlankAddress(), src: "" },
    registered: { same: sameOk, fields: getBlankAddress(), src: "" },
  };

  if (value?.kind) {
    Object.assign(values, {
      kind: value.kind,
      nameYes: value.nameYes !== false,
      first: value.first || "",
      middle: value.middle || "",
      last: value.last || "",
      day: value.day || "",
      month: value.month || "",
      year: value.year || "",
      nationalInsuranceNumber: value.nationalInsuranceNumber || "",
      companyName: value.companyName || values.companyName,
      companyNumber: value.companyNumber || "",
    });

    const key = getAddressKey(value.kind);

    values[key] = {
      ...values[key],
      same: !!value.isAddressSame,
      src: "pick",
      fields: value.isAddressSame
        ? getBlankAddress()
        : { ...getBlankAddress(), ...value.address },
    };
  }

  return { values, nationalInsuranceHint: value?.nationalInsuranceHint || "" };
};

/** "QQ 12 34 56 C" as you type. */
export const formatNationalInsuranceNumber = (value: string): string => {
  const compact = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 9);

  return compact.replace(
    /^(.{2})(.{0,2})(.{0,2})(.{0,2})(.?)$/,
    (_match, ...groups: string[]) =>
      groups.slice(0, 5).filter(Boolean).join(" "),
  );
};

/** The submitted details. */
export const getTaxOutput = (
  state: TaxFormValues,
  legalName: string,
  business?: TaxBusiness,
): TaxDetails => {
  const { same, fields } = state[getAddressKey(state.kind)];
  const { details } = getTaxBusiness(business);

  const address = same
    ? {
        line1: details.line1 || "",
        line2: details.line2 || "",
        city: details.city || "",
        postcode: details.postcode || "",
      }
    : { ...fields, postcode: formatPostcode(fields.postcode) };

  const getName = (part: string) => (state.nameYes ? "" : part.trim());
  const first = getName(state.first);
  const middle = getName(state.middle);
  const last = getName(state.last);

  return {
    kind: state.kind,
    nameYes: state.nameYes,
    first,
    middle,
    last,
    legalName: state.nameYes
      ? legalName || ""
      : [first, middle, last].filter(Boolean).join(" "),
    day: state.day,
    month: state.month,
    year: state.year,
    nationalInsuranceNumber: state.nationalInsuranceNumber
      .replace(/\s/g, "")
      .toUpperCase(),
    companyName: state.companyName.trim(),
    companyNumber: state.companyNumber.replace(/\s/g, "").toUpperCase(),
    isAddressSame: !!same,
    address,
  };
};
