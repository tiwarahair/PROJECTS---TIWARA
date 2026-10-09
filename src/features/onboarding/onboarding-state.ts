// Onboarding state, props, ?fixture= board states and validation (prototype Onboarding.dc.html: state, pp,
// fixture(), errors(), backOf(), pwWho(), pwCheck()).
import { checkPassword } from "../../utils/password";
import type { PasswordCheck } from "../../utils/password";
import { isPostcodeValid } from "../../utils/address";

export interface OnboardingProps {
  screen?: string;
  fixture?: string;
  /** Mobile photo: full-bleed fade or a clipped card. */
  photo?: "full" | "clipped";
  layout?: "auto" | "desktop" | "mobile";
  network?: "online" | "offline";
  /** "accept": any password logs in (demo). */
  password?: "strict" | "accept";
  /** "accept": any 6-digit code works (demo). */
  code?: "strict" | "accept";
  addressLookup?: "ok" | "fail";
  twoFa?: "on" | "off";
  socialEmail?: "known" | "unknown";
  appleName?: "shared" | "withheld";
  turnstile?: "pass" | "challenge" | "fail";
  theme?: "auto" | "light" | "dark";
  /** Board view: no saving/restoring and demo names. */
  board?: boolean;
  /** Stay on the last screen instead of redirecting (boards). */
  stayOnDone?: boolean;
}

/** The data-props defaults. */
export const DEFAULT_PROPS: Required<
  Omit<OnboardingProps, "theme" | "board" | "stayOnDone">
> = {
  screen: "auto",
  fixture: "none",
  photo: "clipped",
  layout: "auto",
  network: "online",
  password: "strict",
  code: "accept",
  addressLookup: "ok",
  twoFa: "on",
  socialEmail: "known",
  appleName: "shared",
  turnstile: "pass",
};

export type ResolvedProps = typeof DEFAULT_PROPS &
  Pick<OnboardingProps, "theme" | "board" | "stayOnDone">;

/** Props overlaid with every URL query param ("true"/"false" become booleans), like the prototype's pp. */
export const resolveProps = (props: OnboardingProps): ResolvedProps => {
  const fromUrl: Record<string, string | boolean> = {};
  new URLSearchParams(window.location.search).forEach((value, key) => {
    fromUrl[key] = value === "true" ? true : value === "false" ? false : value;
  });
  return { ...DEFAULT_PROPS, ...props, ...fromUrl } as ResolvedProps;
};

export interface OnboardingForm {
  email: string;
  pw: string;
  pw2: string;
  first: string;
  last: string;
  mob: string;
  terms: boolean;
  mkt: boolean;
  remember: boolean;
  biz: string;
  pc: string;
  a1: string;
  a2: string;
  city: string;
  type: string;
  radius: number;
  cats: string[];
  useContact: boolean;
  bph: string;
  bem: string;
  src: string;
  srcOther: string;
}

export type Audience = "pro" | "customer" | "newpro";
export type TermsKind = "client" | "partner" | "privacy";
export type TurnstileState = "idle" | "checking" | "ok" | "fail";

export interface ServerError {
  pw?: string;
  noBiz?: boolean;
  exists?: boolean;
}

export interface OnboardingState {
  screen: string | null;
  dir: "fwd" | "back";
  f: OnboardingForm;
  touched: Record<string, boolean>;
  err: ServerError & Record<string, string | boolean | undefined>;
  busy: boolean;
  pwShow: boolean;
  code: string[];
  codeErr: string;
  shake: number;
  resendIn: number;
  codeKind: "verify" | "2fa";
  twoFaMethod: "app" | "backup";
  attempts: number;
  lockedUntil: number;
  addrOpen: boolean;
  addrSrc: string;
  afFx: string;
  geo: [number, number] | null;
  ll: [number, number] | null;
  area: string | null;
  termsOn: TermsKind | null;
  netErr: boolean;
  w: number;
  audience: Audience;
  compact: boolean;
  ts: TurnstileState;
  tsMode: "challenge" | "fail" | null;
  returnTo: string;
  toast: string | null;
  socialP: "google" | "apple" | null;
  mode: "light" | "dark" | null;
  bn: number;
}

export const EMPTY_CODE = ["", "", "", "", "", ""];

export const INITIAL_FORM: OnboardingForm = {
  email: "",
  pw: "",
  pw2: "",
  first: "",
  last: "",
  mob: "",
  terms: false,
  mkt: false,
  remember: true,
  biz: "",
  pc: "",
  a1: "",
  a2: "",
  city: "",
  type: "",
  radius: 10,
  cats: [],
  useContact: true,
  bph: "",
  bem: "",
  src: "",
  srcOther: "",
};

export const INITIAL_STATE: OnboardingState = {
  screen: null,
  dir: "fwd",
  f: INITIAL_FORM,
  touched: {},
  err: {},
  busy: false,
  pwShow: false,
  code: EMPTY_CODE,
  codeErr: "",
  shake: 0,
  resendIn: 30,
  codeKind: "verify",
  twoFaMethod: "app",
  attempts: 0,
  lockedUntil: 0,
  addrOpen: false,
  addrSrc: "",
  afFx: "",
  geo: null,
  ll: null,
  area: null,
  termsOn: null,
  netErr: false,
  w: 0,
  audience: "pro",
  compact: false,
  ts: "idle",
  tsMode: null,
  returnTo: "/",
  toast: null,
  socialP: null,
  mode: null,
  bn: 0,
};

const PASSWORD_FIXTURES: Record<string, string> = {
  "pw-empty": "",
  "pw-short": "sunflower9",
  "pw-blocked": "AmaMensah2026",
  "pw-common": "password1",
  "pw-site": "TiwarasHouse!",
  "pw-pass": "Ama Mensah 2026!kkkkkkkk",
  "pw-good": "sunflower house",
  "pw-strong": "orbit-velvet-ochre-tulip-47",
  "pw-repeat": "aaaaaaaaaaaaaaaaaaa",
};

/** ?fixture= board states (prototype fixture()). */
export const getFixturePatch = (
  key: string,
  form: OnboardingForm,
): Partial<OnboardingState> => {
  const f = { ...form };
  const withForm = (patch: Partial<OnboardingForm>) => Object.assign(f, patch);
  switch (key) {
    case "welcome":
      return { screen: "welcome", audience: "pro" };
    case "pro-2fa":
      withForm({ email: "amara@amarabeauty.co.uk" });
      return { screen: "pro-2fa", f, codeKind: "2fa" };
    case "pro-2fa-backup":
      withForm({ email: "amara@amarabeauty.co.uk" });
      return { screen: "pro-2fa", f, codeKind: "2fa", twoFaMethod: "backup" };
    case "pro-unknown":
      withForm({ email: "someone@example.com" });
      return { screen: "pro-email", f, err: { noBiz: true } };
    case "wrong-password":
      withForm({ email: "nia.okafor@gmail.com", pw: "sunflower" });
      return {
        screen: "cust-password",
        audience: "customer",
        f,
        err: { pw: "That password isn’t right. Try again or reset it." },
        shake: 1,
      };
    case "locked":
      withForm({ email: "nia.okafor@gmail.com" });
      return {
        screen: "cust-password",
        audience: "customer",
        f,
        err: { pw: "Too many attempts. Try again in 15 minutes." },
        lockedUntil: Date.now() + 9e5,
      };
    case "code-wrong":
      withForm({ email: "ama@example.com" });
      return {
        screen: "verify",
        f,
        code: ["1", "2", "3", "4", "5", "6"],
        codeErr: "That code isn’t right",
        shake: 1,
      };
    case "code-expired":
      withForm({ email: "ama@example.com" });
      return {
        screen: "verify",
        f,
        codeErr: "That code has expired. Send a new one.",
        resendIn: 0,
      };
    case "email-exists":
      withForm({
        first: "Nia",
        last: "Okafor",
        email: "amara@amarabeauty.co.uk",
        mob: "7700 900412",
        pw: "sunflower9",
        terms: true,
        type: "home",
        biz: "Nia Does Hair",
        cats: ["braids"],
      });
      return { screen: "w4", f, err: { exists: true } };
    case "w3-shop":
      withForm({
        type: "shop",
        biz: "Crown & Coil",
        pc: "M14 7NB",
        a1: "41 Claremont Road",
        city: "Manchester",
      });
      return {
        screen: "w3",
        f,
        addrOpen: true,
        geo: [53.4532, -2.2213],
        ll: null,
        area: "Rusholme, M14",
      };
    case "w3-home":
      withForm({
        type: "home",
        biz: "Nia Does Hair",
        pc: "M14 5TQ",
        a1: "12 Dickenson Road",
        city: "Manchester",
      });
      return {
        screen: "w3",
        f,
        addrOpen: true,
        geo: [53.4479, -2.2153],
        ll: null,
        area: "Rusholme, M14",
      };
    case "w3-mobile":
      withForm({
        type: "mobile",
        biz: "Braids by Kemi",
        pc: "M21 0BW",
        radius: 10,
      });
      return { screen: "w3", f };
    case "addr-notfound":
      withForm({ type: "shop", biz: "Crown & Coil", pc: "" });
      return { screen: "w3", f, addrOpen: false, afFx: "nomatch" };
    case "w3-typing":
      withForm({ type: "shop", biz: "Crown & Coil", pc: "" });
      return { screen: "w3", f, addrOpen: false, afFx: "typing" };
    case "w3-manual":
      withForm({
        type: "shop",
        biz: "Crown & Coil",
        pc: "M4 6AJ",
        a1: "14 Blossom Street",
        a2: "Unit 2",
        city: "Manchester",
      });
      return {
        screen: "w3",
        f,
        addrOpen: true,
        addrSrc: "manual",
        geo: [53.484, -2.227],
        ll: null,
      };
    case "w2":
      withForm({ type: "shop", cats: ["braids", "natural", "locs"] });
      return { screen: "w2", f };
    case "w2-empty":
      withForm({ type: "shop", cats: [] });
      return { screen: "w2", f, touched: { cats: true } };
    case "w4-bizcontact":
      withForm({
        type: "shop",
        first: "Amara",
        last: "Okonkwo",
        email: "amara@example.com",
        mob: "7700 900001",
        useContact: false,
      });
      return { screen: "w4", f };
    case "pro-pw-good":
      withForm({
        type: "shop",
        first: "Amara",
        last: "Okonkwo",
        email: "hello@amarabeauty.co.uk",
        mob: "7700 900418",
        pw: "tide2lam",
        terms: true,
        useContact: true,
      });
      return { screen: "w4", audience: "newpro", f, pwShow: true };
    case "reset-pw":
      withForm({
        email: "nia.okafor@gmail.com",
        pw: "quiet river lamp",
        pw2: "",
      });
      return { screen: "forgot-reset", audience: "customer", f, pwShow: true };
    case "errors":
      withForm({ email: "ama@example.com", mob: "12", pw: "short" });
      return {
        screen: "cust-create",
        audience: "customer",
        f,
        touched: { first: true, last: true, mob: true, pw: true, terms: true },
      };
    case "required-empty":
      withForm({ email: "" });
      return {
        screen: "cust-email",
        audience: "customer",
        f,
        touched: { email: true },
      };
    case "network":
      withForm({ email: "ama@example.com" });
      return { screen: "cust-email", audience: "customer", f, netErr: true };
    case "reset-mismatch":
      withForm({ pw: "sunflower9", pw2: "sunflower8" });
      return { screen: "forgot-reset", f, touched: { pw2: true } };
    case "pro-social-unknown":
      withForm({ email: "ama.studio@gmail.com" });
      return { screen: "pro-email", audience: "pro", f, err: { noBiz: true } };
    case "pro-2fa-off":
      return { screen: "studio", audience: "pro" };
    case "pro-done":
      withForm({ first: "Ama" });
      return { screen: "pro-done", audience: "pro", f };
    case "cust-social":
      withForm({
        first: "Ama",
        last: "Mensah",
        email: "ama.mensah@gmail.com",
        mob: "",
        terms: false,
        mkt: false,
      });
      return {
        screen: "cust-social",
        audience: "customer",
        socialP: "google",
        f,
      };
    case "cust-social-apple":
      withForm({
        first: "",
        last: "",
        email: "x7k2m9q4pd@privaterelay.appleid.com",
        mob: "",
        terms: false,
        mkt: false,
      });
      return {
        screen: "cust-social",
        audience: "customer",
        socialP: "apple",
        f,
      };
    case "cust-social-error":
      withForm({
        first: "Ama",
        last: "Mensah",
        email: "ama.mensah@gmail.com",
        mob: "7700 900123",
        terms: false,
        mkt: false,
      });
      return {
        screen: "cust-social",
        audience: "customer",
        socialP: "google",
        f,
        touched: { first: true, last: true, mob: true, terms: true },
      };
    case "cust-toast":
      withForm({ first: "Nia", email: "nia.okafor@gmail.com" });
      return {
        screen: "cust-email",
        audience: "customer",
        f,
        toast: "Welcome back, Nia",
      };
    case "w5-picked":
      withForm({ src: "Instagram" });
      return { screen: "w5", audience: "pro", f };
    case "turnstile":
      withForm({
        first: "Ama",
        last: "Mensah",
        email: "ama@example.com",
        pw: "sunflower9",
        mob: "7700 900123",
        terms: true,
      });
      return {
        screen: "cust-create",
        audience: "customer",
        f,
        tsMode: "challenge",
      };
  }
  if (key.startsWith("pw-")) {
    withForm({
      first: "Ama",
      last: "Mensah",
      email: "ama@example.com",
      mob: "7700 900123",
      terms: true,
      pw: PASSWORD_FIXTURES[key] || "",
    });
    return {
      screen: "cust-create",
      audience: "customer",
      f,
      touched: ["pw-blocked", "pw-common", "pw-site"].includes(key)
        ? { pw: true }
        : {},
      pwShow: key !== "pw-empty",
    };
  }
  return { screen: key };
};

export const isCodeScreen = (screen: string | null): boolean =>
  screen === "verify" || screen === "pro-2fa";

export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const isValidMobile = (value: string): boolean => {
  const digits = value.replace(/\D/g, "");
  return /^7\d{9}$/.test(digits) || /^07\d{9}$/.test(digits);
};

export const isValidPostcode = (value: string): boolean =>
  /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(value.trim());

/** Pros need 8+ characters, clients 15+. */
export const getPasswordWho = ({
  screen,
  audience,
}: OnboardingState): "pro" | "client" => {
  if (screen === "w4") return "pro";
  if (screen === "cust-create") return "client";
  return audience === "customer" ? "client" : "pro";
};

export const getPasswordCheck = (state: OnboardingState): PasswordCheck => {
  const { f } = state;
  const min = getPasswordWho(state) === "pro" ? 8 : 15;
  return checkPassword(f.pw, {
    min,
    first: f.first,
    last: f.last,
    email: f.email,
  });
};

const isAddressOk = ({ a1, city, pc }: OnboardingForm): boolean =>
  !!a1.trim() && !!city.trim() && isPostcodeValid(pc);

export type FormErrors = Record<string, string>;

/** Field errors for the current screen (prototype errors()). */
export const getErrors = (state: OnboardingState): FormErrors => {
  const { f, screen } = state;
  const errors: FormErrors = {};
  const checkEmail = () => {
    if (!f.email.trim()) errors.email = "Enter your email address";
    else if (!isValidEmail(f.email))
      errors.email = "Enter a valid email address, like name@example.com";
  };
  const checkPasswordField = () => {
    const { error } = getPasswordCheck(state);
    if (error) errors.pw = error;
  };
  const checkNames = () => {
    if (!f.first.trim()) errors.first = "Enter your first name";
    if (!f.last.trim()) errors.last = "Enter your last name";
  };
  const checkMobile = () => {
    if (!f.mob.trim()) errors.mob = "Enter your mobile number";
    else if (!isValidMobile(f.mob))
      errors.mob = "Enter a valid UK mobile, like 7700 900123";
  };
  const termsError = "Agree to the terms to continue";
  if (
    screen === "cust-email" ||
    screen === "pro-email" ||
    screen === "forgot-email"
  )
    checkEmail();
  if (screen === "cust-password" || screen === "pro-password")
    if (!f.pw) errors.pw = "Enter your password";
  if (screen === "cust-create") {
    checkNames();
    checkPasswordField();
    checkMobile();
    if (!f.terms) errors.terms = termsError;
  }
  if (screen === "cust-social") {
    checkNames();
    checkMobile();
    if (!f.terms) errors.terms = termsError;
  }
  if (screen === "w5") {
    if (!f.src) errors.src = "Choose an option";
    else if (f.src === "Other" && !f.srcOther.trim())
      errors.srcOther = "Tell us where";
  }
  if (screen === "forgot-reset") {
    checkPasswordField();
    if (!f.pw2) errors.pw2 = "Confirm your new password";
    else if (f.pw !== f.pw2) errors.pw2 = "Passwords don’t match";
  }
  if (screen === "w1" && !f.type) errors.type = "Choose how you work";
  if (screen === "w2" && !f.cats.length) errors.cats = "Choose at least one";
  if (screen === "w3") {
    if (!f.biz.trim()) errors.biz = "Enter your business name";
    if (f.type === "mobile") {
      if (!f.pc.trim()) errors.pc = "Enter your base postcode";
      else if (!isValidPostcode(f.pc))
        errors.pc = "Enter a valid UK postcode, like M14 5TQ";
    } else if (!isAddressOk(f)) errors.addr = "Enter your address";
  }
  if (screen === "w4") {
    checkNames();
    checkEmail();
    checkMobile();
    checkPasswordField();
    if (!f.terms) errors.terms = termsError;
    if (!f.useContact && !f.bph.trim() && !f.bem.trim())
      errors.bc = "Add at least one";
  }
  return errors;
};

/** Where Back goes from each screen (prototype backOf()). */
export const getBackScreen = ({
  screen,
  audience,
}: OnboardingState): string | undefined => {
  const isCustomer = audience === "customer";
  const map: Record<string, string> = {
    "cust-email": "chooser",
    "pro-email": "chooser",
    "cust-password": "cust-email",
    "cust-create": "cust-email",
    "cust-social": "cust-email",
    "pro-password": "pro-email",
    "pro-2fa": "pro-password",
    "forgot-email": isCustomer ? "cust-password" : "pro-password",
    "forgot-sent": "forgot-email",
    "forgot-reset": "forgot-sent",
    w1: "welcome",
    w2: "w1",
    w3: "w2",
    w4: "w3",
    w5: "w4",
    verify: isCustomer ? "cust-create" : "w5",
  };
  return screen ? map[screen] : undefined;
};
