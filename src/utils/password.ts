// Password rules for every "create / change password" field.
// Strength = zxcvbn-ts (guidance only, never blocks); loaded on first use, pages re-render once it's ready.
// set-password checks the same rules again, plus breached passwords.
import {
  getBlockKind,
  getPasswordProblem,
  PASSWORD_MAX,
} from "../../supabase/functions/_shared/password-rules";
import type {
  BlockKind,
  PasswordProblem,
} from "../../supabase/functions/_shared/password-rules";

export { getPasswordMin } from "../../supabase/functions/_shared/password-rules";

type PasswordChecker = typeof import("./password-checker");

let scorePassword: PasswordChecker["scorePassword"] | null = null;
let checkerImport: Promise<PasswordChecker> | null = null;

export const isPasswordCheckerReady = (): boolean => scorePassword !== null;

const readyListeners = new Set<() => void>();

/** Loads the checker once (every caller shares one import); a failed load is retried next time. */
const loadPasswordChecker = async (): Promise<void> => {
  checkerImport ??= import("./password-checker");

  try {
    const checker = await checkerImport;

    if (scorePassword) return;

    scorePassword = checker.scorePassword;
    readyListeners.forEach((listener) => listener());
  } catch {
    checkerImport = null;
  }
};

/** Calls the listener when the checker finishes loading (it loads on the first typed password); returns a function that cancels it. */
export const onPasswordCheckerReady = (listener: () => void): (() => void) => {
  readyListeners.add(listener);

  return () => {
    readyListeners.delete(listener);
  };
};

export interface PasswordCheckOptions {
  min?: number;
  first?: string;
  last?: string;
  email?: string;
}

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

const getLevel = (failsRules: boolean, score: number | null): 0 | 1 | 2 => {
  if (failsRules) return 0;

  if (score == null) return 1;

  if (score <= 2) return 0;

  return score === 3 ? 1 : 2;
};

export const getPasswordProblemMessage = (
  problem: PasswordProblem | "pwned",
  min: number,
) => {
  if (!problem) return "";

  if (problem === "pwned")
    return "This password has appeared in a data breach. Choose a different one.";

  if (problem === "long") return `Use ${PASSWORD_MAX} characters or fewer`;

  return problem === "short"
    ? `Use at least ${min} characters`
    : BLOCK_MESSAGES[problem];
};

export const checkPassword = (
  value: string,
  options: PasswordCheckOptions = {},
): PasswordCheck => {
  const min = options.min || 15;
  const length = [...value].length;
  const email = (options.email || "").toLowerCase().trim();
  const emailName = email.split("@")[0] ?? "";
  const blockKind = getBlockKind(value, options);
  const blocked = !!blockKind;
  const short = length < min;
  const long = length > PASSWORD_MAX;

  if (length) void loadPasswordChecker();

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
  const labels = ["Weak", "Good", "Strong"] as const;

  const error = length
    ? getPasswordProblemMessage(getPasswordProblem(value, min, options), min)
    : "Enter a password";

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

interface PasswordViewOptions {
  dark?: boolean;
  /** Whether to surface the error (field blurred or form submitted). */
  show?: boolean;
  errorColour?: string;
}

interface MeterSegment {
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
