// The password rules: the browser shows them as you type and set-password enforces them.
export const PASSWORD_MAX = 64;

// Supabase stores passwords with bcrypt, which takes at most 72 bytes; accents and emoji take 2 to 4 each
const PASSWORD_MAX_BYTES = 72;

const SITE_NAMES = ["tiwara", "tiwaras", "tiwarashouse", "tiwarasstudio", "tiwarastudio"];

const COMMON_PASSWORDS = [
  "password",
  "password1",
  "12345678",
  "123456789",
  "qwerty123",
  "iloveyou",
  "letmein1",
  "welcome1",
];

export type PasswordRole = "pro" | "client";

export const getPasswordMin = (who: PasswordRole): number => (who === "pro" ? 8 : 15);

const normaliseAccents = (value = ""): string => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export interface PasswordPerson {
  first?: string;
  last?: string;
  email?: string;
}

export type BlockKind = "" | "common" | "name" | "site";

export type PasswordProblem = "" | "short" | "long" | "bytes" | Exclude<BlockKind, "">;

const toLetters = (text?: string) => normaliseAccents(text).replace(/[^a-z]/g, "");

/** Whole-password comparison (lowercase, no spaces): names and the site name may only have digits or symbols added. */
export const getBlockKind = (password: string, { first, last, email }: PasswordPerson): BlockKind => {
  const flat = normaliseAccents(password).replace(/\s+/g, "");
  const lettersOnly = flat.replace(/[^a-z]/g, "");
  const firstLetters = toLetters(first);
  const lastLetters = toLetters(last);
  const address = (email ?? "").toLowerCase().trim();

  const names = [
    firstLetters,
    lastLetters,
    firstLetters + lastLetters,
    lastLetters + firstLetters,
    toLetters(address.split("@")[0]),
    toLetters(address),
  ].filter(Boolean);

  if (COMMON_PASSWORDS.includes(flat)) return "common";

  if (lettersOnly && names.includes(lettersOnly)) return "name";

  return SITE_NAMES.includes(lettersOnly) ? "site" : "";
};

export const getPasswordProblem = (password: string, min: number, person: PasswordPerson): PasswordProblem => {
  const length = [...password].length;

  if (length > PASSWORD_MAX) return "long";

  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return "bytes";

  const blockKind = getBlockKind(password, person);

  if (blockKind) return blockKind;

  return length < min ? "short" : "";
};
