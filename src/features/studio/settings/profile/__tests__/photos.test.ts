import { describe, expect, it, vi } from "vitest";
import type { StudioContext } from "../../../core/actions";
import { getInitialStudioState } from "../../../core/initial-state";
import { seedFromAccount } from "../../../core/seed-account";
import type { StudioPatch, StudioState } from "../../../core/types";
import { getStudioSeed } from "../../../../../test/studio-seed";
import {
  addPortfolioPhoto,
  removePortfolioPhoto,
} from "../../../../../lib/studio-api/photos";
import { createStudioSync } from "../../../core/sync";
import {
  attachPhoto,
  addPortfolioPhotos,
  removePortfolioItem,
} from "../photos";

vi.mock("../../../../../lib/studio-api/photos", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../../lib/studio-api/photos")
  >()),
  removePortfolioPhoto: vi.fn().mockResolvedValue(undefined),
  removePhoto: vi.fn().mockResolvedValue(undefined),
  uploadPhotoWithCopies: vi.fn((path: string) => Promise.resolve(path)),
  addPortfolioPhoto: vi.fn().mockResolvedValue(null),
}));

const getContext = () => {
  const seeded = seedFromAccount(getInitialStudioState(), getStudioSeed());
  const [base] = seeded.services;

  if (!base) throw new Error("the seed has a service");

  let state: StudioState = {
    ...seeded,
    portfolio: [{ id: "p-1", src: "one.jpg", path: "stylist-1/p-1-full.jpg" }],
    services: [
      { ...base, id: "s-1", photoIds: ["p-1"] },
      { ...base, id: "s-2", photoIds: [] },
    ],
  };

  const setState = (patch: StudioPatch) => {
    state = {
      ...state,
      ...(typeof patch === "function" ? patch(state) : patch),
    };
  };

  const sync = createStudioSync("stylist-1", setState, vi.fn());

  const context = {
    getState: () => state,
    setState,
    sync,
  } as unknown as StudioContext;

  // the saves are queued promises: wait for the queue to run
  const settle = () =>
    new Promise<void>((resolve) => sync.save(async () => resolve(), {}));

  return { context, getState: () => state, settle };
};

const getPhotoIds = (state: StudioState) =>
  state.services.map(({ id, photoIds }) => [id, photoIds]);

describe("service photos", () => {
  it("moves a photo off its old service onto the new one", () => {
    const { context, getState } = getContext();

    attachPhoto(context, "p-1", "s-2");

    expect(getPhotoIds(getState())).toEqual([
      ["s-1", []],
      ["s-2", ["p-1"]],
    ]);
  });

  it("takes a photo off its service", () => {
    const { context, getState } = getContext();
    const [untouched] = getState().services.slice(1);

    attachPhoto(context, "p-1", null);

    expect(getPhotoIds(getState())).toEqual([
      ["s-1", []],
      ["s-2", []],
    ]);

    // only the changed service gets a new reference, so only it saves
    expect(getState().services[1]).toBe(untouched);
  });

  it("removing a portfolio photo takes it off its service too", () => {
    const { context, getState } = getContext();

    removePortfolioItem(context, "p-1");

    expect(getState().portfolio).toEqual([]);
    expect(getPhotoIds(getState())[0]).toEqual(["s-1", []]);
  });

  it("a failed delete puts the photo back on its service", async () => {
    vi.mocked(removePortfolioPhoto).mockRejectedValueOnce(new Error("offline"));
    const { context, getState, settle } = getContext();

    removePortfolioItem(context, "p-1");
    await settle();

    expect(getState().portfolio.map(({ id }) => id)).toEqual(["p-1"]);
    expect(getPhotoIds(getState())[0]).toEqual(["s-1", ["p-1"]]);
  });

  it("when an upload fails, photos that saved stay and the failed one leaves the portfolio and its service", async () => {
    vi.mocked(addPortfolioPhoto)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("offline"));

    const { context, getState, settle } = getContext();
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    addPortfolioPhotos(context, [
      { id: "new-1", file, previewUrl: "data:one" },
      { id: "new-2", file, previewUrl: "data:two" },
    ]);

    attachPhoto(context, "new-1", "s-2");
    attachPhoto(context, "new-2", "s-2");
    await settle();

    expect(getState().portfolio.map(({ id }) => id)).toEqual(["p-1", "new-1"]);
    expect(getPhotoIds(getState())[1]).toEqual(["s-2", ["new-1"]]);
  });
});
