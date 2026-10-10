// TaxDetailsForm state, validation and output (prototype TaxDetailsForm.dc.html: biz, blankAddr, init, fmtNi, fmtPc,
// pcOk, akey, errors, submit).
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

export interface TaxAddress {
  line1: string;
  line2: string;
  city: string;
  pc: string;
}

/** The business address step's result (Studio passes it in). */
export interface TaxBusiness {
  type?: string;
  v?: Partial<TaxAddress>;
}

/** What onSubmit receives; also accepted back as `value` to prefill. */
export interface TaxDetails {
  kind: TaxKind;
  nameYes: boolean;
  first: string;
  middle: string;
  last: string;
  legalName: string;
  d: string;
  m: string;
  y: string;
  ni: string;
  coName: string;
  coNum: string;
  addrSame: boolean;
  addr: TaxAddress;
}

export interface TaxAddressState {
  same: boolean;
  a: TaxAddress;
  src: string;
}

export type TaxErrorKey =
  "first" | "last" | "dob" | "addr" | "ni" | "coName" | "coNum";

export interface TaxState {
  kind: TaxKind;
  nameYes: boolean;
  first: string;
  middle: string;
  last: string;
  d: string;
  m: string;
  y: string;
  ni: string;
  niShow: boolean;
  coName: string;
  coNum: string;
  home: TaxAddressState;
  reg: TaxAddressState;
  /** Fields blurred or submitted (the prototype also marks "middle", which has no error). */
  touched: Partial<Record<TaxErrorKey | "middle", 1>>;
}

const ALL_TOUCHED: TaxState["touched"] = {
  first: 1,
  last: 1,
  dob: 1,
  addr: 1,
  ni: 1,
  coName: 1,
  coNum: 1,
};

/** A chair rental counts as a shop. */
export const getTaxBusiness = (business?: TaxBusiness) => {
  const { type, v } = business ?? {};
  return { type: type === "chair" ? "shop" : type || "shop", v: v ?? {} };
};

export const getBlankAddress = (): TaxAddress => ({
  line1: "",
  line2: "",
  city: "",
  pc: "",
});

export const getAddressKey = (kind: TaxKind): "home" | "reg" =>
  kind === "ltd" ? "reg" : "home";

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
    d: "",
    m: "",
    y: "",
    ni: "",
    niShow: false,
    coName: businessName,
    coNum: "",
    home: { same: type === "home", a: getBlankAddress(), src: "" },
    reg: { same: sameOk, a: getBlankAddress(), src: "" },
    touched: {},
  };
  if (value?.kind) {
    Object.assign(state, {
      kind: value.kind,
      nameYes: value.nameYes !== false,
      first: value.first || "",
      middle: value.middle || "",
      last: value.last || "",
      d: value.d || "",
      m: value.m || "",
      y: value.y || "",
      ni: value.ni || "",
      coName: value.coName || state.coName,
      coNum: value.coNum || "",
    });
    const key = getAddressKey(value.kind);
    state[key] = {
      ...state[key],
      same: !!value.addrSame,
      src: "pick",
      a: value.addrSame
        ? getBlankAddress()
        : { ...getBlankAddress(), ...value.addr },
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
    Object.assign(state, { d: "31", m: "02", y: "1994", touched: { dob: 1 } });
  if (fixture === "err-under18")
    Object.assign(state, {
      d: "14",
      m: "03",
      y: String(new Date().getFullYear() - 16),
      touched: { dob: 1 },
    });
  if (fixture === "err-ni")
    Object.assign(state, {
      ni: "QQ 12 34 5",
      niShow: true,
      touched: { ni: 1 },
    });
  if (fixture === "err-conum")
    Object.assign(state, {
      kind: "ltd",
      coNum: "1482930",
      touched: { coNum: 1 },
    });
  if (fixture === "err-pc") {
    state.home = {
      ...state.home,
      same: false,
      src: "manual",
      a: {
        line1: "12 Dickenson Road",
        line2: "",
        city: "Manchester",
        pc: "ZZ1",
      },
    };
    state.touched = { addr: 1 };
  }
  return state;
};

/** "QQ 12 34 56 C" as you type. */
export const formatNiNumber = (value: string): string => {
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
    if (!state.d || !state.m || !state.y)
      errors.dob = "Enter your date of birth";
    else {
      const day = +state.d;
      const month = +state.m;
      const year = +state.y;
      const date = new Date(year, month - 1, day);
      const now = new Date();
      if (
        state.y.length < 4 ||
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
    const ni = state.ni.replace(/\s/g, "").toUpperCase();
    if (!ni) errors.ni = "Enter your National Insurance number";
    else if (
      !/^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(
        ni,
      )
    )
      errors.ni = "Enter a National Insurance number like QQ 12 34 56 C.";
  } else {
    if (!state.coName.trim()) errors.coName = "Enter your company name";
    const companyNumber = state.coNum.replace(/\s/g, "").toUpperCase();
    if (!companyNumber) errors.coNum = "Enter your company registration number";
    else if (!/^([0-9]{8}|[A-Z]{2}[0-9]{6})$/.test(companyNumber))
      errors.coNum = "Enter your 8-character company registration number.";
  }
  const { same, a } = state[getAddressKey(state.kind)];
  if (!same && !(a.line1.trim() && a.city.trim() && isPostcodeValid(a.pc)))
    errors.addr = isSole
      ? "Enter your home address"
      : "Enter your registered office address";
  return errors;
};

export const getTouchedAll = (): TaxState["touched"] => ({ ...ALL_TOUCHED });

/** The submitted details (prototype submit()'s `out`). */
export const getTaxOutput = (
  state: TaxState,
  legalName: string,
  business?: TaxBusiness,
): TaxDetails => {
  const { same, a } = state[getAddressKey(state.kind)];
  const { v } = getTaxBusiness(business);
  const addr = same
    ? {
        line1: v.line1 || "",
        line2: v.line2 || "",
        city: v.city || "",
        pc: v.pc || "",
      }
    : { ...a, pc: formatPostcode(a.pc) };
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
    d: state.d,
    m: state.m,
    y: state.y,
    ni: state.ni.replace(/\s/g, "").toUpperCase(),
    coName: state.coName.trim(),
    coNum: state.coNum.replace(/\s/g, "").toUpperCase(),
    addrSame: !!same,
    addr,
  };
};
