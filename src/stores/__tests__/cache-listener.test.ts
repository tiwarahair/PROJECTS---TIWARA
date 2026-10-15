import { describe, expect, it } from "vitest";
import { notifyStudioWrite } from "../../lib/studio-writes";
import type { PublicProfile } from "../../lib/public-profiles";
import { api } from "../api-slice";
import { startCacheListener } from "../cache-listener";
import { createStore } from "../store";

const PROFILE = { slug: "crown-coil" } as PublicProfile;

describe("startCacheListener", () => {
  it("a Studio save drops the cached profiles", () => {
    const store = createStore();
    const stopListening = startCacheListener(store);

    store.dispatch(
      api.util.upsertQueryEntries([
        {
          endpointName: "getStylistProfile",
          arg: "crown-coil",
          value: PROFILE,
        },
      ]),
    );

    const readCached = () =>
      api.endpoints.getStylistProfile.select("crown-coil")(store.getState())
        .data;

    expect(readCached()).toEqual(PROFILE);

    notifyStudioWrite();

    expect(readCached()).toBeUndefined();
    stopListening();
  });
});
