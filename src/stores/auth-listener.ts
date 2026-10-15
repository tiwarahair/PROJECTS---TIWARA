import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { SessionUser } from "../types/session";
import { api } from "./api-slice";
import { sessionChanged } from "./session-slice";
import type { AppStore } from "./store";

export const toSessionUser = (session: Session | null): SessionUser | null => {
  if (!session) return null;

  const {
    id,
    email = "",
    app_metadata: appMetadata,
    created_at: createdAt,
  } = session.user;

  return {
    id,
    email,
    isStylist: appMetadata.is_stylist === true,
    isAdmin: appMetadata.is_admin === true,
    providers: appMetadata.providers ?? [],
    createdAt,
  };
};

/** Keeps the session slice in step with Supabase Auth; fires once on start with the stored session. */
export const startAuthListener = ({ dispatch }: AppStore) => {
  // its own record: logOut() clears the session slice before Supabase reports the sign-out
  let lastUserId: string | undefined;

  return supabase.auth.onAuthStateChange((_event, session) => {
    const user = toSessionUser(session);

    // signed out or switched account: nothing cached for the last one may show
    if (lastUserId && lastUserId !== user?.id)
      dispatch(api.util.resetApiState());

    lastUserId = user?.id;
    dispatch(sessionChanged(user));
  });
};
