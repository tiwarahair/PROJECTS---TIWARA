import type { TwoFactorDevice } from "../../../lib/two-factor";
import type { StylistStudio } from "../../../lib/studio-api";
import { CATEGORY_COLOURS, TAXONOMY } from "./constants";
import { toStudioPatch } from "./records";
import type { StudioCategory, StudioState } from "./types";

/** The signed-in stylist and their business, loaded before Studio opens. */
export interface StudioSeed {
  owner: StudioState["owner"];
  studio: StylistStudio;
  devices: TwoFactorDevice[];
}

const getCategoryColour = (sort: number) =>
  CATEGORY_COLOURS[sort % CATEGORY_COLOURS.length]?.value ?? "";

/** A real account: everything from the database; nothing booked yet. */
export const seedFromAccount = (
  state: StudioState,
  { owner, studio, devices }: StudioSeed,
): StudioState => {
  const patch = toStudioPatch(studio, state);

  return {
    ...state,
    ...patch,
    owner,
    account: {
      stylistId: studio.id,
      slug: studio.slug,
      slugChangedAt: studio.slug_changed_at,
    },
    notifications: [],
    twoFactorSettings: { devices },
    categories: (patch.categories ?? []).map((category) => ({
      ...category,
      colour: category.colour || getCategoryColour(category.sort),
    })),
  };
};

/** Demo boards (?account=new): a new account picked braids at sign-up. */
export const seedNewAccount = (state: StudioState): StudioState => {
  const picked = ["braids"];

  const categories: StudioCategory[] = [];

  picked.forEach((groupId) => {
    const group = TAXONOMY.find(({ id }) => id === groupId);

    if (group)
      categories.push({
        id: `c${categories.length + 1}`,
        name: group.name,
        sort: categories.length,
        colour: getCategoryColour(categories.length),
      });
  });

  const primary = TAXONOMY.find(({ id }) => id === picked[0]) ?? TAXONOMY[0];
  const isBraids = !primary || primary.id === "braids";

  const drafts = state.services.slice(0, 2).map((service) => ({
    ...service,
    status: "draft",
    categoryId: categories[0] ? categories[0].id : null,
    ...(isBraids
      ? {}
      : {
          taxonomyId: primary.id,
          subcategory: primary.subcategories[0] ?? "",
          typeId: null,
          name: primary.subcategories[0] ?? "",
          sizes: [],
          lengths: [],
          own: [],
          addons: [],
        }),
  }));

  if (!isBraids && drafts[1]) {
    const name = primary.subcategories[1] || primary.subcategories[0] || "";

    drafts[1] = {
      ...drafts[1],
      id: `${drafts[1].id}2`,
      subcategory: name,
      name,
    };
  }

  return {
    ...state,
    policy: { ...state.policy, mode: "none" },
    twoFactorSettings: { devices: [] },
    categories,
    services: drafts,
  };
};
