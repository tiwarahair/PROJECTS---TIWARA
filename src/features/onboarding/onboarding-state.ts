// Onboarding state, props, ?fixture= board states and validation.
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

// a Map so query values like "constructor" can't match inherited object keys
const URL_BOOLEANS = new Map([
  ["true", true],
  ["false", false],
]);

/** Props overlaid with every URL query param ("true"/"false" become booleans). */
export const resolveProps = (props: OnboardingProps): ResolvedProps => {
  const fromUrl: Record<string, string | boolean> = {};

  new URLSearchParams(window.location.search).forEach((value, key) => {
    fromUrl[key] = URL_BOOLEANS.get(value) ?? value;
  });

  return { ...DEFAULT_PROPS, ...props, ...fromUrl } as ResolvedProps;
};

export interface OnboardingForm {
  email: string;
  password: string;
  passwordConfirm: string;
  first: string;
  last: string;
  mobile: string;
  terms: boolean;
  marketing: boolean;
  remember: boolean;
  businessName: string;
  postcode: string;
  line1: string;
  line2: string;
  city: string;
  type: string;
  radius: number;
  categories: string[];
  useContact: boolean;
  businessPhone: string;
  businessEmail: string;
  referralSource: string;
  referralSourceOther: string;
}

export type Audience = "pro" | "customer" | "newpro";
export type TermsKind = "client" | "partner" | "privacy";
export type TurnstileState = "idle" | "checking" | "passed" | "fail";

export interface ServerError {
  password?: string;
  noBusiness?: boolean;
  exists?: boolean;
}

export interface OnboardingState {
  screen: string | null;
  direction: "fwd" | "back";
  form: OnboardingForm;
  touched: Record<string, boolean>;
  serverErrors: ServerError & Record<string, string | boolean | undefined>;
  busy: boolean;
  passwordShown: boolean;
  code: string[];
  codeError: string;
  shake: number;
  resendIn: number;
  codeKind: "verify" | "2fa";
  twoFaMethod: "app" | "backup";
  attempts: number;
  lockedUntil: number;
  addressOpen: boolean;
  addressSource: string;
  addressFinderFixture: string;
  geocodedLatLng: [number, number] | null;
  pinLatLng: [number, number] | null;
  area: string | null;
  termsOn: TermsKind | null;
  networkError: boolean;
  width: number;
  audience: Audience;
  compact: boolean;
  turnstile: TurnstileState;
  turnstileMode: "challenge" | "fail" | null;
  returnTo: string;
  toast: string | null;
  socialProvider: "google" | "apple" | null;
  mode: "light" | "dark" | null;
  benefitIndex: number;
}

export const EMPTY_CODE = ["", "", "", "", "", ""];

export const INITIAL_FORM: OnboardingForm = {
  email: "",
  password: "",
  passwordConfirm: "",
  first: "",
  last: "",
  mobile: "",
  terms: false,
  marketing: false,
  remember: true,
  businessName: "",
  postcode: "",
  line1: "",
  line2: "",
  city: "",
  type: "",
  radius: 10,
  categories: [],
  useContact: true,
  businessPhone: "",
  businessEmail: "",
  referralSource: "",
  referralSourceOther: "",
};

export const INITIAL_STATE: OnboardingState = {
  screen: null,
  direction: "fwd",
  form: INITIAL_FORM,
  touched: {},
  serverErrors: {},
  busy: false,
  passwordShown: false,
  code: EMPTY_CODE,
  codeError: "",
  shake: 0,
  resendIn: 30,
  codeKind: "verify",
  twoFaMethod: "app",
  attempts: 0,
  lockedUntil: 0,
  addressOpen: false,
  addressSource: "",
  addressFinderFixture: "",
  geocodedLatLng: null,
  pinLatLng: null,
  area: null,
  termsOn: null,
  networkError: false,
  width: 0,
  audience: "pro",
  compact: false,
  turnstile: "idle",
  turnstileMode: null,
  returnTo: "/",
  toast: null,
  socialProvider: null,
  mode: null,
  benefitIndex: 0,
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

/** ?fixture= board states. */
export const getFixturePatch = (
  key: string,
  baseForm: OnboardingForm,
): Partial<OnboardingState> => {
  const form = { ...baseForm };

  const withForm = (patch: Partial<OnboardingForm>) =>
    Object.assign(form, patch);

  switch (key) {
    case "welcome":
      return { screen: "welcome", audience: "pro" };
    case "pro-2fa":
      withForm({ email: "amara@tiwarashouse.co.uk" });

      return { screen: "pro-2fa", form, codeKind: "2fa" };
    case "pro-2fa-backup":
      withForm({ email: "amara@tiwarashouse.co.uk" });

      return {
        screen: "pro-2fa",
        form,
        codeKind: "2fa",
        twoFaMethod: "backup",
      };
    case "pro-unknown":
      withForm({ email: "someone@example.com" });

      return { screen: "pro-email", form, serverErrors: { noBusiness: true } };
    case "wrong-password":
      withForm({ email: "nia.okafor@gmail.com", password: "sunflower" });

      return {
        screen: "cust-password",
        audience: "customer",
        form,
        serverErrors: {
          password: "That password isn’t right. Try again or reset it.",
        },
        shake: 1,
      };
    case "locked":
      withForm({ email: "nia.okafor@gmail.com" });

      return {
        screen: "cust-password",
        audience: "customer",
        form,
        serverErrors: {
          password: "Too many attempts. Try again in 15 minutes.",
        },
        lockedUntil: Date.now() + 9e5,
      };
    case "code-wrong":
      withForm({ email: "ama@example.com" });

      return {
        screen: "verify",
        form,
        code: ["1", "2", "3", "4", "5", "6"],
        codeError: "That code isn’t right",
        shake: 1,
      };
    case "code-expired":
      withForm({ email: "ama@example.com" });

      return {
        screen: "verify",
        form,
        codeError: "That code has expired. Send a new one.",
        resendIn: 0,
      };
    case "email-exists":
      withForm({
        first: "Nia",
        last: "Okafor",
        email: "amara@tiwarashouse.co.uk",
        mobile: "7700 900412",
        password: "sunflower9",
        terms: true,
        type: "home",
        businessName: "Nia Does Hair",
        categories: ["braids"],
      });

      return { screen: "w4", form, serverErrors: { exists: true } };
    case "w3-shop":
      withForm({
        type: "shop",
        businessName: "Crown & Coil",
        postcode: "M14 7NB",
        line1: "41 Claremont Road",
        city: "Manchester",
      });

      return {
        screen: "w3",
        form,
        addressOpen: true,
        geocodedLatLng: [53.4532, -2.2213],
        pinLatLng: null,
        area: "Rusholme, M14",
      };
    case "w3-home":
      withForm({
        type: "home",
        businessName: "Nia Does Hair",
        postcode: "M14 5TQ",
        line1: "12 Dickenson Road",
        city: "Manchester",
      });

      return {
        screen: "w3",
        form,
        addressOpen: true,
        geocodedLatLng: [53.4479, -2.2153],
        pinLatLng: null,
        area: "Rusholme, M14",
      };
    case "w3-mobile":
      withForm({
        type: "mobile",
        businessName: "Braids by Kemi",
        postcode: "M21 0BW",
        radius: 10,
      });

      return { screen: "w3", form };
    case "addr-notfound":
      withForm({ type: "shop", businessName: "Crown & Coil", postcode: "" });

      return {
        screen: "w3",
        form,
        addressOpen: false,
        addressFinderFixture: "nomatch",
      };
    case "w3-typing":
      withForm({ type: "shop", businessName: "Crown & Coil", postcode: "" });

      return {
        screen: "w3",
        form,
        addressOpen: false,
        addressFinderFixture: "typing",
      };
    case "w3-manual":
      withForm({
        type: "shop",
        businessName: "Crown & Coil",
        postcode: "M4 6AJ",
        line1: "14 Blossom Street",
        line2: "Unit 2",
        city: "Manchester",
      });

      return {
        screen: "w3",
        form,
        addressOpen: true,
        addressSource: "manual",
        geocodedLatLng: [53.484, -2.227],
        pinLatLng: null,
      };
    case "w2":
      withForm({ type: "shop", categories: ["braids", "natural", "locs"] });

      return { screen: "w2", form };
    case "w2-empty":
      withForm({ type: "shop", categories: [] });

      return { screen: "w2", form, touched: { categories: true } };
    case "w4-bizcontact":
      withForm({
        type: "shop",
        first: "Amara",
        last: "Okonkwo",
        email: "amara@example.com",
        mobile: "7700 900001",
        useContact: false,
      });

      return { screen: "w4", form };
    case "pro-pw-good":
      withForm({
        type: "shop",
        first: "Amara",
        last: "Okonkwo",
        email: "hello@tiwarashouse.co.uk",
        mobile: "7700 900418",
        password: "tide2lam",
        terms: true,
        useContact: true,
      });

      return { screen: "w4", audience: "newpro", form, passwordShown: true };
    case "reset-pw":
      withForm({
        email: "nia.okafor@gmail.com",
        password: "quiet river lamp",
        passwordConfirm: "",
      });

      return {
        screen: "forgot-reset",
        audience: "customer",
        form,
        passwordShown: true,
      };
    case "errors":
      withForm({ email: "ama@example.com", mobile: "12", password: "short" });

      return {
        screen: "cust-create",
        audience: "customer",
        form,
        touched: {
          first: true,
          last: true,
          mobile: true,
          password: true,
          terms: true,
        },
      };
    case "required-empty":
      withForm({ email: "" });

      return {
        screen: "cust-email",
        audience: "customer",
        form,
        touched: { email: true },
      };
    case "network":
      withForm({ email: "ama@example.com" });

      return {
        screen: "cust-email",
        audience: "customer",
        form,
        networkError: true,
      };
    case "reset-mismatch":
      withForm({ password: "sunflower9", passwordConfirm: "sunflower8" });

      return {
        screen: "forgot-reset",
        form,
        touched: { passwordConfirm: true },
      };
    case "pro-social-unknown":
      withForm({ email: "ama.studio@gmail.com" });

      return {
        screen: "pro-email",
        audience: "pro",
        form,
        serverErrors: { noBusiness: true },
      };
    case "pro-2fa-off":
      return { screen: "studio", audience: "pro" };
    case "pro-done":
      withForm({ first: "Ama" });

      return { screen: "pro-done", audience: "pro", form };
    case "cust-social":
      withForm({
        first: "Ama",
        last: "Mensah",
        email: "ama.mensah@gmail.com",
        mobile: "",
        terms: false,
        marketing: false,
      });

      return {
        screen: "cust-social",
        audience: "customer",
        socialProvider: "google",
        form,
      };
    case "cust-social-apple":
      withForm({
        first: "",
        last: "",
        email: "x7k2m9q4pd@privaterelay.appleid.com",
        mobile: "",
        terms: false,
        marketing: false,
      });

      return {
        screen: "cust-social",
        audience: "customer",
        socialProvider: "apple",
        form,
      };
    case "cust-social-error":
      withForm({
        first: "Ama",
        last: "Mensah",
        email: "ama.mensah@gmail.com",
        mobile: "7700 900123",
        terms: false,
        marketing: false,
      });

      return {
        screen: "cust-social",
        audience: "customer",
        socialProvider: "google",
        form,
        touched: { first: true, last: true, mobile: true, terms: true },
      };
    case "cust-toast":
      withForm({ first: "Nia", email: "nia.okafor@gmail.com" });

      return {
        screen: "cust-email",
        audience: "customer",
        form,
        toast: "Welcome back, Nia",
      };
    case "w5-picked":
      withForm({ referralSource: "Instagram" });

      return { screen: "w5", audience: "pro", form };
    case "turnstile":
      withForm({
        first: "Ama",
        last: "Mensah",
        email: "ama@example.com",
        password: "sunflower9",
        mobile: "7700 900123",
        terms: true,
      });

      return {
        screen: "cust-create",
        audience: "customer",
        form,
        turnstileMode: "challenge",
      };
  }

  if (key.startsWith("pw-")) {
    withForm({
      first: "Ama",
      last: "Mensah",
      email: "ama@example.com",
      mobile: "7700 900123",
      terms: true,
      password: PASSWORD_FIXTURES[key] || "",
    });

    return {
      screen: "cust-create",
      audience: "customer",
      form,
      touched: ["pw-blocked", "pw-common", "pw-site"].includes(key)
        ? { password: true }
        : {},
      passwordShown: key !== "pw-empty",
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
  const { form } = state;
  const min = getPasswordWho(state) === "pro" ? 8 : 15;

  return checkPassword(form.password, {
    min,
    first: form.first,
    last: form.last,
    email: form.email,
  });
};

const isAddressOk = ({ line1, city, postcode }: OnboardingForm): boolean =>
  !!line1.trim() && !!city.trim() && isPostcodeValid(postcode);

export type FormErrors = Record<string, string>;

/** Field errors for the current screen. */
export const getErrors = (state: OnboardingState): FormErrors => {
  const { form, screen } = state;
  const errors: FormErrors = {};

  const checkEmail = () => {
    if (!form.email.trim()) errors.email = "Enter your email address";
    else if (!isValidEmail(form.email))
      errors.email = "Enter a valid email address, like name@example.com";
  };

  const checkPasswordField = () => {
    const { error } = getPasswordCheck(state);

    if (error) errors.password = error;
  };

  const checkNames = () => {
    if (!form.first.trim()) errors.first = "Enter your first name";

    if (!form.last.trim()) errors.last = "Enter your last name";
  };

  const checkMobile = () => {
    if (!form.mobile.trim()) errors.mobile = "Enter your mobile number";
    else if (!isValidMobile(form.mobile))
      errors.mobile = "Enter a valid UK mobile, like 7700 900123";
  };

  const termsError = "Agree to the terms to continue";

  if (
    screen === "cust-email" ||
    screen === "pro-email" ||
    screen === "forgot-email"
  )
    checkEmail();

  if (screen === "cust-password" || screen === "pro-password")
    if (!form.password) errors.password = "Enter your password";

  if (screen === "cust-create") {
    checkNames();
    checkPasswordField();
    checkMobile();

    if (!form.terms) errors.terms = termsError;
  }

  if (screen === "cust-social") {
    checkNames();
    checkMobile();

    if (!form.terms) errors.terms = termsError;
  }

  if (screen === "w5") {
    if (!form.referralSource) errors.referralSource = "Choose an option";
    else if (
      form.referralSource === "Other" &&
      !form.referralSourceOther.trim()
    )
      errors.referralSourceOther = "Tell us where";
  }

  if (screen === "forgot-reset") {
    checkPasswordField();

    if (!form.passwordConfirm)
      errors.passwordConfirm = "Confirm your new password";
    else if (form.password !== form.passwordConfirm)
      errors.passwordConfirm = "Passwords don’t match";
  }

  if (screen === "w1" && !form.type) errors.type = "Choose how you work";

  if (screen === "w2" && !form.categories.length)
    errors.categories = "Choose at least one";

  if (screen === "w3") {
    if (!form.businessName.trim())
      errors.businessName = "Enter your business name";

    if (form.type === "mobile") {
      if (!form.postcode.trim()) errors.postcode = "Enter your base postcode";
      else if (!isValidPostcode(form.postcode))
        errors.postcode = "Enter a valid UK postcode, like M14 5TQ";
    } else if (!isAddressOk(form)) errors.address = "Enter your address";
  }

  if (screen === "w4") {
    checkNames();
    checkEmail();
    checkMobile();
    checkPasswordField();

    if (!form.terms) errors.terms = termsError;

    if (
      !form.useContact &&
      !form.businessPhone.trim() &&
      !form.businessEmail.trim()
    )
      errors.businessContact = "Add at least one";
  }

  return errors;
};

/** Where Back goes from each screen. */
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
