import { createSlice } from "@reduxjs/toolkit";
import {
  getSearchParams,
  isBoardView,
  readSession,
  writeSession,
} from "../utils/page-flags";

/** The demo customer account (prototype tw-fav.js ACCT). */
export const DEMO_ACCOUNT = {
  email: "nia.okafor@gmail.com",
  first: "Nia",
  name: "Nia Okafor",
} as const;

/** "NO" — the avatar initials shown in every nav (prototype acctInitials). */
export const ACCOUNT_INITIALS = DEMO_ACCOUNT.name
  .split(" ")
  .filter(Boolean)
  .map((word) => word[0])
  .slice(0, 2)
  .join("")
  .toUpperCase();

const SESSION_KEY = "tw_cust";

/** Logged in = not forced guest, and ?login=1 or sessionStorage tw_cust === '1'. */
export const readLoggedIn = (): boolean => {
  const params = getSearchParams();
  if (params.get("guest") === "1") return false;
  return params.get("login") === "1" || readSession(SESSION_KEY) === "1";
};

interface SessionState {
  loggedIn: boolean;
}

const initialState: SessionState = { loggedIn: false };

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    /** Re-read the session for the current page (runs on each page mount, like the prototype's page load). */
    syncSession: (state) => {
      const params = getSearchParams();
      if (params.get("login") === "1" && !isBoardView(params))
        writeSession(SESSION_KEY, "1");
      state.loggedIn = readLoggedIn();
    },
    logOut: (state) => {
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // storage unavailable
      }
      state.loggedIn = false;
    },
  },
});

export const { syncSession, logOut } = sessionSlice.actions;
