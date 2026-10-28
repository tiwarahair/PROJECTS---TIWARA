import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as studioApi from "../../../../lib/studio-api/services";
import { useCatalogueSync } from "../catalogue-sync";
import { getInitialStudioState } from "../../core/initial-state";
import { seedFromAccount } from "../../core/seed-account";
import { getStudioSeed } from "../../../../test/studio-seed";
import { createStudioSync } from "../../core/sync";
import type { StudioState } from "../../core/types";

vi.mock("../../../../lib/studio-api/services", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../lib/studio-api/services")
  >()),
  saveCategories: vi.fn().mockResolvedValue(undefined),
  saveAddon: vi.fn().mockResolvedValue(undefined),
  saveService: vi.fn().mockResolvedValue(undefined),
  removeService: vi.fn().mockResolvedValue(undefined),
  removeAddon: vi.fn().mockResolvedValue(undefined),
  removeCategory: vi.fn().mockResolvedValue(undefined),
}));

const sync = createStudioSync("stylist-1", vi.fn(), vi.fn());

const getState = () =>
  seedFromAccount(getInitialStudioState(), getStudioSeed());

const renderSync = (state: StudioState) =>
  renderHook(({ current }) => useCatalogueSync(current, sync), {
    initialProps: { current: state },
  });

describe("useCatalogueSync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves only the service whose reference changed", async () => {
    const state = getState();
    const { rerender } = renderSync(state);
    const [first, ...rest] = state.services;

    if (!first) throw new Error("the seed has a service");

    rerender({
      current: { ...state, services: [{ ...first, name: "Renamed" }, ...rest] },
    });

    await waitFor(() => expect(studioApi.saveService).toHaveBeenCalledTimes(1));

    expect(vi.mocked(studioApi.saveService).mock.calls[0]?.[0]).toMatchObject({
      id: first.id,
      name: "Renamed",
    });

    expect(studioApi.saveAddon).not.toHaveBeenCalled();
    expect(studioApi.saveCategories).not.toHaveBeenCalled();
  });

  it("saves which photos a service shows", async () => {
    const state = getState();
    const { rerender } = renderSync(state);
    const [first, ...rest] = state.services;

    if (!first) throw new Error("the seed has a service");

    rerender({
      current: {
        ...state,
        services: [{ ...first, photoIds: ["p-1", "p-2"] }, ...rest],
      },
    });

    await waitFor(() => expect(studioApi.saveService).toHaveBeenCalledTimes(1));

    expect(vi.mocked(studioApi.saveService).mock.calls[0]?.[3]).toEqual([
      "p-1",
      "p-2",
    ]);
  });

  it("removes a deleted add-on", async () => {
    const state = getState();
    const { rerender } = renderSync(state);
    const [first, ...rest] = state.addons;

    if (!first) throw new Error("the seed has an add-on");

    rerender({ current: { ...state, addons: rest } });

    await waitFor(() =>
      expect(studioApi.removeAddon).toHaveBeenCalledWith(first.id),
    );
  });
});

describe("createStudioSync", () => {
  it("puts the change back and says so when a save fails", async () => {
    const setState = vi.fn();
    const notify = vi.fn();
    const failing = createStudioSync("stylist-1", setState, notify);

    failing.save(() => Promise.reject(new Error("offline")), { addons: [] });

    await waitFor(() => expect(setState).toHaveBeenCalledWith({ addons: [] }));

    expect(notify).toHaveBeenCalledWith(
      "That change didn’t save. Check your connection and try again.",
    );
  });
});
