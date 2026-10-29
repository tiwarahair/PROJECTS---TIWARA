import { describe, expect, it } from "vitest";
import { getInitialStudioState } from "../../../core/initial-state";
import { seedFromAccount } from "../../../core/seed-account";
import type { StudioService, StudioState } from "../../../core/types";
import { getStudioSeed } from "../../../../../test/studio-seed";
import {
  ALL_CATEGORIES,
  getAttachView,
  getPhotoServiceName,
} from "../attach-view";

const getState = (services: Partial<StudioService>[]): StudioState => {
  const state = seedFromAccount(getInitialStudioState(), getStudioSeed());
  const [base] = state.services;

  if (!base) throw new Error("the seed has a service");

  return {
    ...state,
    categories: [
      { id: "category-1", name: "Natural", sort: 0, colour: "" },
      { id: "category-2", name: "Braids", sort: 1, colour: "" },
    ],
    services: services.map((patch, index) => ({
      ...base,
      id: `s-${index}`,
      ...patch,
    })),
  };
};

describe("getAttachView", () => {
  const state = getState([
    { name: "Silk press", categoryId: "category-1", photoIds: ["p-1"] },
    {
      name: "Knotless braids",
      categoryId: "category-2",
      photoIds: ["a", "b", "c", "d", "e"],
    },
    { name: "Box braids", categoryId: "category-2", status: "draft" },
    { name: "Old cut", categoryId: "category-1", status: "archived" },
  ]);

  it("lists services that aren't archived, with the photo's own service ticked and full ones off", () => {
    const { items, isAttached } = getAttachView(
      state,
      "p-1",
      "",
      ALL_CATEGORIES,
    );

    expect(items.map(({ name }) => name)).toEqual([
      "Silk press",
      "Knotless braids",
      "Box braids",
    ]);

    expect(isAttached).toBe(true);
    expect(items[0]).toMatchObject({ isCurrent: true, count: "1 of 5" });
    expect(items[1]).toMatchObject({ isFull: true, count: "5 of 5" });
    expect(items[2]).toMatchObject({ isDraft: true, isFull: false });
  });

  it("filters by search and category, with pills only for categories that have services", () => {
    const braids = getAttachView(state, "p-2", "", "category-2");

    expect(braids.items.map(({ name }) => name)).toEqual([
      "Knotless braids",
      "Box braids",
    ]);

    expect(braids.categoryChips.map(({ label }) => label)).toEqual([
      "All",
      "Natural",
      "Braids",
    ]);

    const searched = getAttachView(state, "p-2", " BOX ", ALL_CATEGORIES);

    expect(searched.items.map(({ name }) => name)).toEqual(["Box braids"]);

    expect(
      getAttachView(state, "p-2", "wig", ALL_CATEGORIES).hasNoResults,
    ).toBe(true);
  });

  it("has nothing to list before there are services", () => {
    const view = getAttachView(getState([]), "p-1", "", ALL_CATEGORIES);

    expect(view.hasServices).toBe(false);
    expect(view.hasNoResults).toBe(false);
  });

  it("a photo on an archived service can still be taken off it", () => {
    const archived = getState([
      { name: "Old cut", status: "archived", photoIds: ["p-9"] },
    ]);

    expect(getAttachView(archived, "p-9", "", ALL_CATEGORIES).isAttached).toBe(
      true,
    );
  });

  it("names a photo's service", () => {
    expect(getPhotoServiceName(state, "c")).toBe("Knotless braids");
    expect(getPhotoServiceName(state, "loose")).toBe("");
  });
});
