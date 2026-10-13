import type { Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../../lib/supabase";
import { toSessionUser } from "../auth-listener";
import { logOut, sessionChanged, syncSession } from "../session-slice";
import { createStore } from "../store";

const buildSession = (appMetadata: Record<string, unknown>) =>
  ({
    user: { id: "user-1", email: "ada@example.com", app_metadata: appMetadata },
  }) as unknown as Session;

describe("session slice", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("maps a Supabase session and its capability flags", () => {
    expect(toSessionUser(buildSession({ is_stylist: true }))).toEqual({
      id: "user-1",
      email: "ada@example.com",
      isStylist: true,
      isAdmin: false,
    });

    expect(toSessionUser(null)).toBeNull();
  });

  it("logs in from a Supabase session", () => {
    const store = createStore();
    const user = toSessionUser(buildSession({}));

    store.dispatch(sessionChanged(user));

    expect(store.getState().session).toEqual({
      loggedIn: true,
      user,
      ready: true,
    });
  });

  it("honours the ?login=1 demo login in development", () => {
    window.history.replaceState(null, "", "/?login=1");

    expect(createStore().getState().session.loggedIn).toBe(true);
  });

  it("ignores the demo login outside development", () => {
    vi.stubEnv("DEV", false);
    window.history.replaceState(null, "", "/?login=1");
    const store = createStore();

    store.dispatch(syncSession());

    expect(store.getState().session.loggedIn).toBe(false);
  });

  it("signs out of Supabase and clears the session", () => {
    const signOut = vi
      .spyOn(supabase.auth, "signOut")
      .mockResolvedValue({ error: null });

    const store = createStore();

    store.dispatch(sessionChanged(toSessionUser(buildSession({}))));
    store.dispatch(logOut());

    expect(signOut).toHaveBeenCalled();
    expect(store.getState().session.loggedIn).toBe(false);
  });
});
