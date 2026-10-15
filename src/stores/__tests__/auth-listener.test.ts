import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { supabase } from "../../lib/supabase";
import type { PublicProfile } from "../../lib/public-profiles";
import { api } from "../api-slice";
import { startAuthListener } from "../auth-listener";
import { logOut } from "../session-slice";
import { createStore } from "../store";

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;

const toSession = (id: string) =>
  ({ user: { id, email: "", app_metadata: {}, created_at: "" } }) as Session;

describe("startAuthListener", () => {
  it("signing out with logOut() clears the cache", () => {
    let emit: AuthCallback = () => undefined;

    vi.spyOn(supabase.auth, "onAuthStateChange").mockImplementation(
      (callback) => {
        emit = callback as AuthCallback;

        return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
      },
    );

    vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null });

    const store = createStore();

    startAuthListener(store);
    emit("INITIAL_SESSION", toSession("user-1"));

    store.dispatch(
      api.util.upsertQueryEntries([
        {
          endpointName: "getStylistProfile",
          arg: "crown-coil",
          value: { slug: "crown-coil" } as PublicProfile,
        },
      ]),
    );

    // logOut() empties the session slice before Supabase reports the sign-out
    store.dispatch(logOut());
    emit("SIGNED_OUT", null);

    expect(
      api.endpoints.getStylistProfile.select("crown-coil")(store.getState())
        .data,
    ).toBeUndefined();

    vi.restoreAllMocks();
  });
});
