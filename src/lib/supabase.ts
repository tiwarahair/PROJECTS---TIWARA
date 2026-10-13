import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: supabaseKey,
} = import.meta.env;

if (!supabaseUrl || !supabaseKey)
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — copy .env.example to .env.local",
  );

const REMEMBER_KEY = "tw_remember";

/** Storage can throw (blocked site data, some private modes): treat that as empty. */
const attempt = <T>(task: () => T, fallback: T): T => {
  try {
    return task();
  } catch {
    return fallback;
  }
};

const isRemembered = () =>
  attempt(() => localStorage.getItem(REMEMBER_KEY) !== "0", true);

/** "Remember this device" off: the session lives in sessionStorage and ends with the browser. */
const sessionStore = {
  getItem: (key: string) =>
    attempt(
      () => sessionStorage.getItem(key) ?? localStorage.getItem(key),
      null,
    ),
  setItem: (key: string, value: string) =>
    attempt(() => {
      const [keep, drop] = isRemembered()
        ? [localStorage, sessionStorage]
        : [sessionStorage, localStorage];

      drop.removeItem(key);
      keep.setItem(key, value);
    }, undefined),
  removeItem: (key: string) =>
    attempt(() => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }, undefined),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { storage: sessionStore },
});

/** Moves the current session to the chosen storage by re-saving it. */
export const rememberDevice = async (remember: boolean) => {
  attempt(
    () => localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0"),
    undefined,
  );

  await supabase.auth.refreshSession();
};
