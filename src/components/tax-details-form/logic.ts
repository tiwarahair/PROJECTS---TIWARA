// TaxDetailsForm values, fixtures and output.
import { formatPostcode } from "../../utils/address";

export type TaxKind = "sole" | "ltd";
export type TaxFixture =
  | ""
  | "name-no"
  | "ltd"
  | "err-empty"
  | "err-initials"
  | "err-dob"
  | "err-under18"
  | "err-ni"
  | "err-conum"
  | "err-pc";

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

export type TaxFieldName =
  | "first"
  | "last"
  | "day"
  | "nationalInsuranceNumber"
  | "companyName"
  | "companyNumber"
  | "home.fields"
  | "registered.fields";

interface InitialTax {
  values: TaxFormValues;
  nationalInsuranceHint: string;
  showNationalInsurance: boolean;
  shownErrors: TaxFieldName[];
}

const ALL_FIELDS: TaxFieldName[] = [
  "first",
  "last",
  "day",
  "nationalInsuranceNumber",
  "companyName",
  "companyNumber",
  "home.fields",
  "registered.fields",
];

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
  fixture = "",
  businessName = "",
  business,
  value,
}: {
  fixture?: string;
  businessName?: string;
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

  const initial: InitialTax = {
    values,
    nationalInsuranceHint: value?.nationalInsuranceHint || "",
    showNationalInsurance: false,
    shownErrors: [],
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

  if (fixture === "name-no") values.nameYes = false;

  if (fixture === "ltd") values.kind = "ltd";

  if (fixture === "err-empty") initial.shownErrors = ALL_FIELDS;

  if (fixture === "err-initials") {
    Object.assign(values, { nameYes: false, first: "A", last: "Okonkwo" });
    initial.shownErrors = ["first", "last"];
  }

  if (fixture === "err-dob") {
    Object.assign(values, { day: "31", month: "02", year: "1994" });
    initial.shownErrors = ["day"];
  }

  if (fixture === "err-under18") {
    Object.assign(values, {
      day: "14",
      month: "03",
      year: String(new Date().getFullYear() - 16),
    });

    initial.shownErrors = ["day"];
  }

  if (fixture === "err-ni") {
    values.nationalInsuranceNumber = "QQ 12 34 5";
    initial.showNationalInsurance = true;
    initial.shownErrors = ["nationalInsuranceNumber"];
  }

  if (fixture === "err-conum") {
    Object.assign(values, { kind: "ltd", companyNumber: "1482930" });
    initial.shownErrors = ["companyNumber"];
  }

  if (fixture === "err-pc") {
    values.home = {
      same: false,
      src: "manual",
      fields: {
        line1: "12 Dickenson Road",
        line2: "",
        city: "Manchester",
        postcode: "ZZ1",
      },
    };

    initial.shownErrors = ["home.fields"];
  }

  return initial;
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
