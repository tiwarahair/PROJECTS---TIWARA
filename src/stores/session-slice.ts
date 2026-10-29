import {
  createSlice,
  type Dispatch,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../lib/supabase";
import { revokeTrustedDevices } from "../lib/trusted-devices";
import type { SessionUser } from "../types/session";

interface SessionState {
  loggedIn: boolean;
  user: SessionUser | null;
  ready: boolean;
  hasSignedOut: boolean;
}

const initialState: SessionState = {
  loggedIn: false,
  user: null,
  ready: false,
  hasSignedOut: false,
};

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    sessionChanged: (state, { payload }: PayloadAction<SessionUser | null>) => {
      state.user = payload;
      state.loggedIn = !!payload;
      state.ready = true;

      if (payload) state.hasSignedOut = false;
    },
    signedOut: (state) => {
      state.user = null;
      state.loggedIn = false;
      state.hasSignedOut = true;
    },
  },
});

export const { sessionChanged, signedOut } = sessionSlice.actions;

/** logs out this device only */
export const logOut = () => (dispatch: Dispatch) => {
  dispatch(signedOut());
  void supabase.auth.signOut({ scope: "local" });
};

/** Ends every session and trusted device; this device stays signed in if the server didn't confirm it. */
export const logOutEverywhere = () => async (dispatch: Dispatch) => {
  const revoking = revokeTrustedDevices().catch(() => undefined);

  const waiting = new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });

  await Promise.race([revoking, waiting]);

  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) throw error;

  dispatch(signedOut());
};
