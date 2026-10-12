// Password rules for every "create / change password" field, ported from data.js (TIWARA.password).
// Strength = zxcvbn-ts (guidance only, never blocks); loaded on first use, pages re-render once it's ready.
// Real breached-password screening comes with the back end.
import { passwordBlocklist } from "../data";

export const PASSWORD_MAX = 64;

// ban site names from the password
const SITE_NAMES = [
  "tiwara",
  "tiwaras",
  "tiwarashouse",
  "tiwarasstudio",
  "tiwarastudio",
];

export const getPasswordMin = (who: "pro" | "client"): number =>
  who === "pro" ? 8 : 15;

type PasswordChecker = typeof import("./password-checker");

let scorePassword: PasswordChecker["scorePassword"] | null = null;
let checkerImport: Promise<PasswordChecker> | null = null;

export const isPasswordCheckerReady = (): boolean => scorePassword !== null;

/** Loads the checker once (every caller shares one import); a failed load is retried next time. */
export const loadPasswordChecker = async (): Promise<void> => {
  checkerImport ??= import("./password-checker");

  try {
    ({ scorePassword } = await checkerImport);
  } catch {
    checkerImport = null;
  }
};

/** Calls the listener once the checker has loaded; returns a function that cancels it. */
export const onPasswordCheckerReady = (listener: () => void): (() => void) => {
  let isCancelled = false;

  void loadPasswordChecker().then(() => {
    if (!isCancelled && scorePassword) listener();
  });

  return () => {
    isCancelled = true;
  };
};

const normaliseAccents = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export interface PasswordCheckOptions {
  min?: number;
  first?: string;
  last?: string;
  email?: string;
}

export type BlockKind = "" | "common" | "name" | "site";

export interface PasswordCheck {
  min: number;
  length: number;
  typed: boolean;
  short: boolean;
  long: boolean;
  blocked: boolean;
  blockKind: BlockKind;
  score: number | null;
  warning: string;
  level: 0 | 1 | 2;
  label: "Weak" | "Good" | "Strong";
  error: string;
  valid: boolean;
}

const BLOCK_MESSAGES: Record<Exclude<BlockKind, "">, string> = {
  common: "This is a commonly used password. Choose a different one.",
  name: "Your password can’t be your name or email address. Choose a different one.",
  site: "Your password can’t be the name of this website. Choose a different one.",
};

interface BlockKindInputs {
  length: number;
  flat: string;
  lettersOnly: string;
  names: string[];
}

const getBlockKind = ({
  length,
  flat,
  lettersOnly,
  names,
}: BlockKindInputs): BlockKind => {
  if (!length) return "";

  if (passwordBlocklist.includes(flat)) return "common";

  if (lettersOnly && names.includes(lettersOnly)) return "name";

  return SITE_NAMES.includes(lettersOnly) ? "site" : "";
};

const getLevel = (failsRules: boolean, score: number | null): 0 | 1 | 2 => {
  if (failsRules) return 0;

  if (score == null) return 1;

  if (score <= 2) return 0;

  return score === 3 ? 1 : 2;
};

interface PasswordErrorInputs {
  length: number;
  long: boolean;
  blockKind: BlockKind;
  short: boolean;
  min: number;
}

const getPasswordError = ({
  length,
  long,
  blockKind,
  short,
  min,
}: PasswordErrorInputs) => {
  if (!length) return "Enter a password";

  if (long) return `Use ${PASSWORD_MAX} characters or fewer`;

  if (blockKind) return BLOCK_MESSAGES[blockKind];

  return short ? `Use at least ${min} characters` : "";
};

export const checkPassword = (
  password: unknown,
  options: PasswordCheckOptions = {},
): PasswordCheck => {
  const value = String(password || "");
  const min = options.min || 15;
  const length = [...value].length;
  const lowered = normaliseAccents(value);
  // whole-password comparison only: lowercase, no spaces; names/site may only have digits or symbols added
  const flat = lowered.replace(/\s+/g, "");
  const lettersOnly = flat.replace(/[^a-z]/g, "");

  const toLetters = (text: unknown) =>
    normaliseAccents(text).replace(/[^a-z]/g, "");

  const first = toLetters(options.first);
  const last = toLetters(options.last);

  const email = String(options.email || "")
    .toLowerCase()
    .trim();

  const emailName = email.split("@")[0] ?? "";

  const names = [
    first,
    last,
    first + last,
    last + first,
    toLetters(emailName),
    toLetters(email),
  ].filter(Boolean);

  const blockKind = getBlockKind({ length, flat, lettersOnly, names });
  const blocked = !!blockKind;
  const short = length < min;
  const long = length > PASSWORD_MAX;

  void loadPasswordChecker();

  let score: number | null = null;
  let warning = "";

  if (length && !long && scorePassword) {
    try {
      const userInputs = [
        options.first,
        options.last,
        email,
        emailName,
        "tiwara",
        "tiwarashouse",
      ].filter((input): input is string => !!input);

      const result = scorePassword(value, userInputs);

      score = result.score;

      if (score <= 2) warning = result.feedback?.warning || "";
    } catch {
      // strength is guidance only
    }
  }

  // 0-2 Weak, 3 Good, 4 Strong; failing length or blocklist is always Weak
  const level = getLevel(!length || short || long || blocked, score);
  const error = getPasswordError({ length, long, blockKind, short, min });
  const labels = ["Weak", "Good", "Strong"] as const;

  return {
    min,
    length,
    typed: length > 0,
    short,
    long,
    blocked,
    blockKind,
    score,
    warning,
    level,
    label: labels[level],
    error,
    valid: !error,
  };
};

export interface PasswordViewOptions {
  dark?: boolean;
  /** Whether to surface the error (field blurred or form submitted). */
  show?: boolean;
  errorColour?: string;
}

export interface MeterSegment {
  key: number;
  background: string;
}

/** View-model for the strength meter under a password field. */
export const getPasswordView = (
  check: PasswordCheck,
  options: PasswordViewOptions = {},
) => {
  const palette = options.dark
    ? {
        weak: "#ff8a80",
        good: "#f2b84b",
        goodBar: "#f2b84b",
        strong: "#9fd8b0",
        empty: "rgba(255,255,255,.16)",
        mute: "rgba(255,254,251,.62)",
      }
    : {
        weak: "#b3261e",
        good: "#a15c00",
        goodBar: "#d48a1a",
        strong: "#2f7a4d",
        empty: "rgba(26,23,20,.10)",
        mute: "var(--neutral-600)",
      };

  const { typed, short, long, level, min, label, warning, error } = check;

  const labelColour = [palette.weak, palette.good, palette.strong][
    level
  ] as string;

  const barColour = [palette.weak, palette.goodBar, palette.strong][
    level
  ] as string;

  const segments: MeterSegment[] = [0, 1, 2].map((index) => ({
    key: index,
    background: typed && index <= level ? barColour : palette.empty,
  }));

  const shownError = options.show && error ? error : "";
  const lengthMet = typed && !short && !long;
  const lengthColour = !short && !long ? palette.strong : palette.weak;

  return {
    typed,
    lengthMet,
    lengthUnmet: !lengthMet,
    rule: `${min}+ characters`,
    ruleScreenReaderText: lengthMet ? "met" : "not met",
    ruleColour: typed ? lengthColour : palette.mute,
    label,
    labelColour,
    mutedColour: palette.mute,
    segments,
    bar1Colour: segments[0]?.background ?? palette.empty,
    bar2Colour: segments[1]?.background ?? palette.empty,
    bar3Colour: segments[2]?.background ?? palette.empty,
    message: shownError || `At least ${min} characters`,
    messageColour: shownError
      ? options.errorColour || palette.weak
      : palette.mute,
    messageWeight: shownError ? 600 : 400,
    hasError: !!shownError,
    showMessage: !!shownError,
    warning: warning || "",
    showWarning: !!(typed && warning && !shownError),
    ariaInvalid: shownError ? "true" : "false",
  };
};

export type PasswordView = ReturnType<typeof getPasswordView>;
