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

const isRemembered = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
};

/** "Remember this device" off: the session lives in sessionStorage and ends with the browser. */
const sessionStore = {
  getItem: (key: string) =>
    sessionStorage.getItem(key) ?? localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    const [keep, drop] = isRemembered()
      ? [localStorage, sessionStorage]
      : [sessionStorage, localStorage];

    drop.removeItem(key);
    keep.setItem(key, value);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { storage: sessionStore },
});

/** Moves the current session to the chosen storage by re-saving it. */
export const rememberDevice = async (remember: boolean) => {
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  await supabase.auth.refreshSession();
};
