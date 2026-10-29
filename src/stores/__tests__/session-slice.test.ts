import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { supabase } from "../../lib/supabase";
import { toSessionUser } from "../auth-listener";
import {
  logOut,
  logOutEverywhere,
  sessionChanged,
  signedOut,
} from "../session-slice";
import { createStore } from "../store";

const buildSession = (appMetadata: Record<string, unknown>) =>
  ({
    user: { id: "user-1", email: "ada@example.com", app_metadata: appMetadata },
  }) as unknown as Session;

describe("session slice", () => {
  it("maps a Supabase session, its capability flags and sign-in methods", () => {
    expect(
      toSessionUser(buildSession({ is_stylist: true, providers: ["email"] })),
    ).toEqual({
      id: "user-1",
      email: "ada@example.com",
      isStylist: true,
      isAdmin: false,
      providers: ["email"],
    });

    expect(toSessionUser(null)).toBeNull();
  });

  it("starts logged out until Supabase reports a session", () => {
    const store = createStore();

    expect(store.getState().session).toEqual({
      loggedIn: false,
      user: null,
      ready: false,
      hasSignedOut: false,
    });

    const user = toSessionUser(buildSession({}));

    store.dispatch(sessionChanged(user));

    expect(store.getState().session).toEqual({
      loggedIn: true,
      user,
      ready: true,
      hasSignedOut: false,
    });
  });

  it("remembers that they signed out themselves until they sign in again", () => {
    const store = createStore();
    const user = toSessionUser(buildSession({}));

    store.dispatch(sessionChanged(user));
    store.dispatch(signedOut());
    expect(store.getState().session.hasSignedOut).toBe(true);

    store.dispatch(sessionChanged(user));
    expect(store.getState().session.hasSignedOut).toBe(false);
  });

  it("ignores the old ?login=1 demo switch", () => {
    window.history.replaceState(null, "", "/?login=1");

    expect(createStore().getState().session.loggedIn).toBe(false);
  });

  it("signs this device out of Supabase and clears the session", async () => {
    const signOut = vi
      .spyOn(supabase.auth, "signOut")
      .mockResolvedValue({ error: null });

    const store = createStore();

    store.dispatch(sessionChanged(toSessionUser(buildSession({}))));
    store.dispatch(logOut());

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(store.getState().session.loggedIn).toBe(false);

    await store.dispatch(logOutEverywhere());
    expect(signOut).toHaveBeenLastCalledWith({ scope: "global" });
  });
});
