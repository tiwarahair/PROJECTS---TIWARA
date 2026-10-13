// Onboarding state and props (validation lives in onboarding-schemas.ts).

export interface OnboardingProps {
  screen?: string;
  fixture?: string;
  /** Mobile photo: full-bleed fade or a clipped card. */
  photo?: "full" | "clipped";
  layout?: "auto" | "desktop" | "mobile";
  addressLookup?: "ok" | "fail";
  theme?: "auto" | "light" | "dark";
  /** Board view: no saving/restoring and demo names. */
  board?: boolean;
  /** Stay on the last screen instead of redirecting (boards). */
  stayOnDone?: boolean;
}

const DEFAULT_PROPS: Required<
  Omit<OnboardingProps, "theme" | "board" | "stayOnDone">
> = {
  screen: "auto",
  fixture: "none",
  photo: "clipped",
  layout: "auto",
  addressLookup: "ok",
};

export type ResolvedProps = typeof DEFAULT_PROPS &
  Pick<OnboardingProps, "theme" | "board" | "stayOnDone">;

// a Map so query values like "constructor" can't match inherited object keys
const URL_BOOLEANS = new Map([
  ["true", true],
  ["false", false],
]);

/** Props overlaid with every URL query param ("true"/"false" become booleans). */
export const resolveProps = (
  props: OnboardingProps,
  search: string,
): ResolvedProps => {
  const fromUrl: Record<string, string | boolean> = {};

  new URLSearchParams(search).forEach((value, key) => {
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

type Audience = "pro" | "customer" | "newpro";

export type TermsKind = "client" | "partner" | "privacy";

interface ServerError {
  password?: string;
  noBusiness?: boolean;
  exists?: boolean;
}

export interface OnboardingState {
  screen: string | null;
  direction: "fwd" | "back";
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
  /** The current single-use Turnstile token (null until the widget passes, and after each use). */
  captchaToken: string | null;
  returnTo: string;
  toast: string | null;
  socialProvider: "google" | "apple" | null;
  mode: "light" | "dark" | null;
  benefitIndex: number;
}

/** The start state plus the form's initial values and touched fields (fixtures, saved progress). */
export interface StartState extends OnboardingState {
  form: OnboardingForm;
  touched: Partial<Record<keyof OnboardingForm, boolean>>;
  /** ?flow= the page opened with (list, pro, reset, social, social-pro). */
  flow: string | null;
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
  captchaToken: null,
  returnTo: "/",
  toast: null,
  socialProvider: null,
  mode: null,
  benefitIndex: 0,
};

export const isCodeScreen = (screen: string | null): boolean =>
  screen === "verify" || screen === "pro-2fa";

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
