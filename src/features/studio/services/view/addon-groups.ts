import type { MouseEvent } from "react";
import {
  formatAddon,
  getAddonCategory,
  getSortedCategories,
} from "../../core/model";
import type { StudioAddon } from "../../core/types";
import { ARCHIVED_TONE, getAddonStatus, getCountLabel } from "./context";
import type { ListGroup, ListRow, ServicesContext } from "./context";

// ---- add-ons ----
const getAddonRow = (
  { state, serviceActions, stop, restore }: ServicesContext,
  addon: StudioAddon,
  rail: string,
  isArchived: boolean,
): ListRow => ({
  key: addon.id,
  name: addon.name,
  meta: formatAddon(addon),
  rail,
  isArchived,
  isDraft: false,
  open: () => serviceActions.openAddon(addon),
  menu: (event: MouseEvent) => {
    stop(event);
    serviceActions.openAddonActions(addon, event);
  },
  restore: restore(addon.name, () => ({
    addons: state.addons.map((item) =>
      item.id === addon.id ? { ...item, status: "active" } : item,
    ),
  })),
});

export const getAddonGroups = (context: ServicesContext) => {
  const {
    state,
    setState,
    addonCategoryFilter,
    isAddonMatch,
    openNewAddon,
    groupMenu,
  } = context;

  const addonGroups: ListGroup[] = [];

  const getCategoryItems = (categoryId: string) =>
    state.addons.filter(
      (addon) =>
        getAddonCategory(state, addon) === categoryId &&
        getAddonStatus(addon) !== "archived" &&
        isAddonMatch(addon),
    );

  const addAddonGroup = (
    category: string,
    categoryId: string,
    tone: string,
    items: StudioAddon[],
  ) => {
    if (!items.length) return;

    const countLabel = getCountLabel(items.length, "add-on");

    addonGroups.push({
      key: categoryId,
      category,
      count: countLabel,
      tone,
      hasMenu: true,
      menu: groupMenu(
        category,
        countLabel,
        categoryId,
        {
          label: "Add an add-on here",
          run: () => openNewAddon(categoryId === "none" ? null : categoryId),
        },
        addonCategoryFilter,
        () => setState({ addonCategoryFilter: categoryId }),
      ),
      items: items.map((addon) => getAddonRow(context, addon, tone, false)),
    });
  };

  getSortedCategories(state).forEach(({ id, name, colour }) =>
    addAddonGroup(name, id, colour, getCategoryItems(id)),
  );

  addAddonGroup(
    "Other add-ons",
    "none",
    ARCHIVED_TONE,
    getCategoryItems("none"),
  );

  const archivedAddons = state.addons.filter(
    (addon) => getAddonStatus(addon) === "archived" && isAddonMatch(addon),
  );

  if (archivedAddons.length)
    addonGroups.push({
      key: "archived",
      category: "Archived",
      count: getCountLabel(archivedAddons.length, "add-on"),
      tone: ARCHIVED_TONE,
      hasMenu: false,
      items: archivedAddons.map((addon) =>
        getAddonRow(context, addon, ARCHIVED_TONE, true),
      ),
    });

  return addonGroups;
};
