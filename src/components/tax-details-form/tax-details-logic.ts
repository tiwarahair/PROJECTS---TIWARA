// TaxDetailsForm state, validation and output.
import { formatPostcode, isPostcodeValid } from "../../utils/address";

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
  companyName: string;
  companyNumber: string;
  isAddressSame: boolean;
  address: TaxAddress;
}

export interface TaxAddressState {
  same: boolean;
  fields: TaxAddress;
  src: string;
}

export type TaxErrorKey =
  | "first"
  | "last"
  | "dob"
  | "address"
  | "nationalInsuranceNumber"
  | "companyName"
  | "companyNumber";

export interface TaxState {
  kind: TaxKind;
  nameYes: boolean;
  first: string;
  middle: string;
  last: string;
  day: string;
  month: string;
  year: string;
  nationalInsuranceNumber: string;
  showNationalInsurance: boolean;
  companyName: string;
  companyNumber: string;
  home: TaxAddressState;
  registered: TaxAddressState;
  /** Fields blurred or submitted ("middle" is also marked, though it has no error). */
  touched: Partial<Record<TaxErrorKey | "middle", 1>>;
}

const ALL_TOUCHED: TaxState["touched"] = {
  first: 1,
  last: 1,
  dob: 1,
  address: 1,
  nationalInsuranceNumber: 1,
  companyName: 1,
  companyNumber: 1,
};

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

export const getInitialTaxState = ({
  fixture = "",
  businessName = "",
  business,
  value,
}: {
  fixture?: string;
  businessName?: string;
  business?: TaxBusiness;
  value?: Partial<TaxDetails>;
}): TaxState => {
  const { type } = getTaxBusiness(business);
  const sameOk = type === "home" || type === "shop";

  const state: TaxState = {
    kind: "sole",
    nameYes: true,
    first: "",
    middle: "",
    last: "",
    day: "",
    month: "",
    year: "",
    nationalInsuranceNumber: "",
    showNationalInsurance: false,
    companyName: businessName,
    companyNumber: "",
    home: { same: type === "home", fields: getBlankAddress(), src: "" },
    registered: { same: sameOk, fields: getBlankAddress(), src: "" },
    touched: {},
  };

  if (value?.kind) {
    Object.assign(state, {
      kind: value.kind,
      nameYes: value.nameYes !== false,
      first: value.first || "",
      middle: value.middle || "",
      last: value.last || "",
      day: value.day || "",
      month: value.month || "",
      year: value.year || "",
      nationalInsuranceNumber: value.nationalInsuranceNumber || "",
      companyName: value.companyName || state.companyName,
      companyNumber: value.companyNumber || "",
    });

    const key = getAddressKey(value.kind);

    state[key] = {
      ...state[key],
      same: !!value.isAddressSame,
      src: "pick",
      fields: value.isAddressSame
        ? getBlankAddress()
        : { ...getBlankAddress(), ...value.address },
    };
  }

  if (fixture === "name-no") state.nameYes = false;

  if (fixture === "ltd") state.kind = "ltd";

  if (fixture === "err-empty") state.touched = ALL_TOUCHED;

  if (fixture === "err-initials")
    Object.assign(state, {
      nameYes: false,
      first: "A",
      last: "Okonkwo",
      touched: { first: 1, last: 1 },
    });

  if (fixture === "err-dob")
    Object.assign(state, {
      day: "31",
      month: "02",
      year: "1994",
      touched: { dob: 1 },
    });

  if (fixture === "err-under18")
    Object.assign(state, {
      day: "14",
      month: "03",
      year: String(new Date().getFullYear() - 16),
      touched: { dob: 1 },
    });

  if (fixture === "err-ni")
    Object.assign(state, {
      nationalInsuranceNumber: "QQ 12 34 5",
      showNationalInsurance: true,
      touched: { nationalInsuranceNumber: 1 },
    });

  if (fixture === "err-conum")
    Object.assign(state, {
      kind: "ltd",
      companyNumber: "1482930",
      touched: { companyNumber: 1 },
    });

  if (fixture === "err-pc") {
    state.home = {
      ...state.home,
      same: false,
      src: "manual",
      fields: {
        line1: "12 Dickenson Road",
        line2: "",
        city: "Manchester",
        postcode: "ZZ1",
      },
    };

    state.touched = { address: 1 };
  }

  return state;
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

const isNameBad = (value: string) =>
  !/^[A-Za-zÀ-ÿ' -]+$/.test(value.trim()) ||
  value.trim().replace(/[^A-Za-zÀ-ÿ]/g, "").length < 2;

export const getTaxErrors = (
  state: TaxState,
): Partial<Record<TaxErrorKey, string>> => {
  const errors: Partial<Record<TaxErrorKey, string>> = {};
  const isSole = state.kind === "sole";

  if (isSole && !state.nameYes) {
    if (!state.first.trim()) errors.first = "Enter your legal first name";
    else if (isNameBad(state.first))
      errors.first = "Enter your full name, not initials.";

    if (!state.last.trim()) errors.last = "Enter your legal last name";
    else if (isNameBad(state.last))
      errors.last = "Enter your full name, not initials.";
  }

  if (isSole) {
    if (!state.day || !state.month || !state.year)
      errors.dob = "Enter your date of birth";
    else {
      const day = +state.day;
      const month = +state.month;
      const year = +state.year;
      const date = new Date(year, month - 1, day);
      const now = new Date();

      if (
        state.year.length < 4 ||
        year < 1900 ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date > now
      )
        errors.dob = "Enter a real date of birth.";
      else if (new Date(year + 18, month - 1, day) > now)
        errors.dob = "You must be 18 or over to receive payouts.";
    }

    const nationalInsuranceNumber = state.nationalInsuranceNumber
      .replace(/\s/g, "")
      .toUpperCase();

    if (!nationalInsuranceNumber)
      errors.nationalInsuranceNumber = "Enter your National Insurance number";
    else if (
      !/^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(
        nationalInsuranceNumber,
      )
    )
      errors.nationalInsuranceNumber =
        "Enter a National Insurance number like QQ 12 34 56 C.";
  } else {
    if (!state.companyName.trim())
      errors.companyName = "Enter your company name";

    const companyNumber = state.companyNumber.replace(/\s/g, "").toUpperCase();

    if (!companyNumber)
      errors.companyNumber = "Enter your company registration number";
    else if (!/^([0-9]{8}|[A-Z]{2}[0-9]{6})$/.test(companyNumber))
      errors.companyNumber =
        "Enter your 8-character company registration number.";
  }

  const { same, fields } = state[getAddressKey(state.kind)];

  if (
    !same &&
    !(
      fields.line1.trim() &&
      fields.city.trim() &&
      isPostcodeValid(fields.postcode)
    )
  )
    errors.address = isSole
      ? "Enter your home address"
      : "Enter your registered office address";

  return errors;
};

export const getTouchedAll = (): TaxState["touched"] => ({ ...ALL_TOUCHED });

/** The submitted details. */
export const getTaxOutput = (
  state: TaxState,
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

  return {
    kind: state.kind,
    nameYes: state.nameYes,
    first: state.first.trim(),
    middle: state.middle.trim(),
    last: state.last.trim(),
    legalName: state.nameYes
      ? legalName || ""
      : [state.first, state.middle, state.last]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" "),
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
