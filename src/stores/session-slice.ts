import {
  createSlice,
  type Dispatch,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../lib/supabase";
import type { SessionUser } from "../types/session";
import {
  getSearchParams,
  isBoardView,
  readSession,
  writeSession,
} from "../utils/page-flags";

/** The demo customer account. */
export const DEMO_ACCOUNT = {
  email: "nia.okafor@gmail.com",
  first: "Nia",
  name: "Nia Okafor",
} as const;

/** "NO" — the avatar initials shown in every nav. */
export const ACCOUNT_INITIALS = DEMO_ACCOUNT.name
  .split(" ")
  .filter(Boolean)
  .map((word) => word[0])
  .slice(0, 2)
  .join("")
  .toUpperCase();

const SESSION_KEY = "tw_cust";

/**
 * DEV-only demo login (removed in Phase 1): not forced guest, and ?login=1 or
 * sessionStorage tw_cust === '1'. ?login=1 is remembered outside board views.
 */
export const readDemoLogin = (): boolean => {
  if (!import.meta.env.DEV) return false;

  const params = getSearchParams();

  if (params.get("guest") === "1") return false;

  if (params.get("login") === "1") {
    if (!isBoardView(params)) writeSession(SESSION_KEY, "1");

    return true;
  }

  return readSession(SESSION_KEY) === "1";
};

interface SessionState {
  loggedIn: boolean;
  user: SessionUser | null;
  /** True once Supabase has reported the initial session. */
  ready: boolean;
}

const initialState: SessionState = {
  loggedIn: false,
  user: null,
  ready: false,
};

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    /** Re-read the session for the current page (runs on each page mount). */
    syncSession: (state) => {
      state.loggedIn = !!state.user || readDemoLogin();
    },
    sessionChanged: (state, { payload }: PayloadAction<SessionUser | null>) => {
      state.user = payload;
      state.loggedIn = !!payload || readDemoLogin();
      state.ready = true;
    },
  },
});

export const { syncSession, sessionChanged } = sessionSlice.actions;

export const logOut = () => (dispatch: Dispatch) => {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable
  }

  dispatch(sessionChanged(null));
  void supabase.auth.signOut();
};
