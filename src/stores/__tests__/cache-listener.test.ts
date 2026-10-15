import { describe, expect, it } from "vitest";
import { notifyStudioWrite } from "../../lib/studio-writes";
import type { PublicProfile } from "../../lib/public-profiles";
import type { StylistStudio } from "../../lib/studio-api";
import { api } from "../api-slice";
import { startCacheListener, trackOpenStudio } from "../cache-listener";
import { createStore } from "../store";

const PROFILE = { slug: "crown-coil" } as PublicProfile;
const STUDIO = { id: "s1" } as StylistStudio;

const setUp = () => {
  const store = createStore();
  const stopListening = startCacheListener(store);

  store.dispatch(
    api.util.upsertQueryEntries([
      { endpointName: "getStylistProfile", arg: "crown-coil", value: PROFILE },
      { endpointName: "getStylistStudio", arg: "owner", value: STUDIO },
    ]),
  );

  const readProfile = () =>
    api.endpoints.getStylistProfile.select("crown-coil")(store.getState()).data;

  const readStudio = () =>
    api.endpoints.getStylistStudio.select("owner")(store.getState()).data;

  return { store, stopListening, readProfile, readStudio };
};

describe("startCacheListener", () => {
  it("a Studio save drops the cached profiles", () => {
    const { stopListening, readProfile } = setUp();

    expect(readProfile()).toEqual(PROFILE);

    notifyStudioWrite();

    expect(readProfile()).toBeUndefined();
    stopListening();
  });

  it("keeps Studio's own data while Studio is open, and drops it when it closes", () => {
    const { store, stopListening, readStudio } = setUp();
    const closeStudio = trackOpenStudio(store.dispatch);

    notifyStudioWrite();

    expect(readStudio()).toEqual(STUDIO);

    closeStudio();

    expect(readStudio()).toBeUndefined();
    stopListening();
  });

  it("a save that lands after Studio closed still drops its data", () => {
    const { store, stopListening, readStudio } = setUp();

    trackOpenStudio(store.dispatch)();
    notifyStudioWrite();

    expect(readStudio()).toBeUndefined();
    stopListening();
  });
});
