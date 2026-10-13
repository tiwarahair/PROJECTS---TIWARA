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
    sessionChanged: (state, { payload }: PayloadAction<SessionUser | null>) => {
      state.user = payload;
      state.loggedIn = !!payload;
      state.ready = true;
    },
  },
});

export const { sessionChanged } = sessionSlice.actions;

export const logOut = () => (dispatch: Dispatch) => {
  dispatch(sessionChanged(null));
  void supabase.auth.signOut();
};
