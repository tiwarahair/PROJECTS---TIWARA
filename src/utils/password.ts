// Password rules for every "create / change password" field, ported from data.js (TIWARA.password).
// Strength = zxcvbn-ts (guidance only, never blocks); loaded on first use, pages re-render on 'tw-pw-ready'.
// Real breached-password screening comes with the back end.
import type { zxcvbn as ZxcvbnFn } from "@zxcvbn-ts/core";
import { passwordBlocklist } from "../data";

export const PASSWORD_MAX = 64;
export const PASSWORD_READY_EVENT = "tw-pw-ready";
const SITE_NAMES = [
  "tiwara",
  "tiwaras",
  "tiwarashouse",
  "tiwarasstudio",
  "tiwarastudio",
];

export const getPasswordMin = (who: "pro" | "client"): number =>
  who === "pro" ? 8 : 15;

let zxcvbnScore: typeof ZxcvbnFn | null = null;
let isLoading = false;

export const isPasswordCheckerReady = (): boolean => zxcvbnScore !== null;

export const loadPasswordChecker = (): void => {
  if (zxcvbnScore || isLoading || typeof document === "undefined") return;
  isLoading = true;
  Promise.all([
    import("@zxcvbn-ts/core"),
    import("@zxcvbn-ts/language-common"),
    import("@zxcvbn-ts/language-en"),
  ])
    .then(([core, common, english]) => {
      core.zxcvbnOptions.setOptions({
        translations: english.translations,
        graphs: common.adjacencyGraphs,
        dictionary: { ...common.dictionary, ...english.dictionary },
      });
      zxcvbnScore = core.zxcvbn;
      window.dispatchEvent(new Event(PASSWORD_READY_EVENT));
    })
    .catch(() => {
      isLoading = false;
    });
};

/** Subscribe to the checker finishing loading; returns an unsubscribe function. */
export const onPasswordCheckerReady = (listener: () => void): (() => void) => {
  loadPasswordChecker();
  if (zxcvbnScore) return () => {};
  window.addEventListener(PASSWORD_READY_EVENT, listener);
  return () => window.removeEventListener(PASSWORD_READY_EVENT, listener);
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
  len: number;
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
  ok: boolean;
}

const BLOCK_MESSAGES: Record<Exclude<BlockKind, "">, string> = {
  common: "This is a commonly used password. Choose a different one.",
  name: "Your password can’t be your name or email address. Choose a different one.",
  site: "Your password can’t be the name of this website. Choose a different one.",
};

export const checkPassword = (
  password: unknown,
  options: PasswordCheckOptions = {},
): PasswordCheck => {
  const value = String(password || "");
  const min = options.min || 15;
  const len = [...value].length;
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
  const blockKind: BlockKind = !len
    ? ""
    : passwordBlocklist.includes(flat)
      ? "common"
      : lettersOnly && names.includes(lettersOnly)
        ? "name"
        : SITE_NAMES.includes(lettersOnly)
          ? "site"
          : "";
  const blocked = !!blockKind;
  const short = len < min;
  const long = len > PASSWORD_MAX;
  loadPasswordChecker();

  let score: number | null = null;
  let warning = "";
  if (len && !long && zxcvbnScore) {
    try {
      const userInputs = [
        options.first,
        options.last,
        email,
        emailName,
        "tiwara",
        "tiwarashouse",
      ].filter((input): input is string => !!input);
      const result = zxcvbnScore(value, userInputs);
      score = result.score;
      if (score <= 2) warning = result.feedback?.warning || "";
    } catch {
      // strength is guidance only
    }
  }
  // 0-2 Weak, 3 Good, 4 Strong; failing length or blocklist is always Weak
  const level: 0 | 1 | 2 =
    !len || short || long || blocked
      ? 0
      : score == null
        ? 1
        : score <= 2
          ? 0
          : score === 3
            ? 1
            : 2;
  const error = !len
    ? "Enter a password"
    : long
      ? "Use " + PASSWORD_MAX + " characters or fewer"
      : blockKind
        ? BLOCK_MESSAGES[blockKind]
        : short
          ? "Use at least " + min + " characters"
          : "";
  const labels = ["Weak", "Good", "Strong"] as const;
  return {
    min,
    len,
    typed: len > 0,
    short,
    long,
    blocked,
    blockKind,
    score,
    warning,
    level,
    label: labels[level],
    error,
    ok: !error,
  };
};

export interface PasswordViewOptions {
  dark?: boolean;
  /** Whether to surface the error (field blurred or form submitted). */
  show?: boolean;
  errColor?: string;
}

export interface MeterSegment {
  key: number;
  bg: string;
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
  const segs: MeterSegment[] = [0, 1, 2].map((index) => ({
    key: index,
    bg: typed && index <= level ? barColour : palette.empty,
  }));
  const shownError = options.show && error ? error : "";
  const lengthOk = typed && !short && !long;
  return {
    typed,
    okLen: lengthOk,
    noLen: !lengthOk,
    rule: min + "+ characters",
    ruleSr: lengthOk ? "met" : "not met",
    ruleC: !typed
      ? palette.mute
      : !short && !long
        ? palette.strong
        : palette.weak,
    label,
    labelC: labelColour,
    muteC: palette.mute,
    segs,
    s1: segs[0]?.bg ?? palette.empty,
    s2: segs[1]?.bg ?? palette.empty,
    s3: segs[2]?.bg ?? palette.empty,
    msg: shownError || "At least " + min + " characters",
    msgC: shownError ? options.errColor || palette.weak : palette.mute,
    msgW: shownError ? 600 : 400,
    hasErr: !!shownError,
    msgOn: !!shownError,
    warn: warning || "",
    warnOn: !!(typed && warning && !shownError),
    inv: shownError ? "true" : "false",
  };
};

export type PasswordView = ReturnType<typeof getPasswordView>;
