import {
  createSlice,
  type Dispatch,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "../lib/supabase";
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

/** logs out this device only; "global" logs out every device */
export const logOut =
  (scope: "local" | "global" = "local") =>
  (dispatch: Dispatch) => {
    dispatch(signedOut());
    void supabase.auth.signOut({ scope });
  };
