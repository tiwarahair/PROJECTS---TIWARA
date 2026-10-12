// The searchable add-on picker shared by Edit service, New booking and the service wizard.
import type { ChangeEvent } from "react";
import {
  formatAddon,
  getAddonCategory,
  getSortedCategories,
} from "./studio-model";
import type { StudioAddon, StudioState } from "./studio-types";
import type { StudioController } from "./use-studio";

interface AddonPickerOptions {
  /** Overrides for the wizard, which keeps its own query and category. */
  query?: string | null;
  category?: string | null;
  list?: StudioAddon[];
  hideSelected?: boolean;
  setQuery?: (value: string) => void;
  setCategory?: (value: string) => void;
}

interface AddonPickerItem {
  key: string;
  name: string;
  meta: string;
  isOn: boolean;
  pick: () => void;
}

export const getAddonPicker = (
  studio: StudioController,
  state: StudioState,
  selected: string[],
  onAdd: (addon: StudioAddon) => void,
  serviceCategory: string | null | undefined,
  onRemove?: ((addon: StudioAddon) => void) | null,
  onDone?: (() => void) | null,
  options: AddonPickerOptions = {},
) => {
  const query =
    options.query != null ? options.query : state.addAddonQuery || "";

  const categoryValue =
    options.query != null ? options.category : state.addAddonCategory;

  const lowerQuery = query.toLowerCase();

  const live = (options.list || state.addons).filter(
    (addon) =>
      (addon.status || "active") !== "archived" &&
      !(options.hideSelected && selected.includes(addon.id)),
  );

  const categories: [string, string][] = getSortedCategories(state)
    .filter(({ id }) =>
      live.some((addon) => getAddonCategory(state, addon) === id),
    )
    .map(({ id, name }) => [id, name]);

  if (live.some((addon) => getAddonCategory(state, addon) === "none"))
    categories.push(["none", "Other add-ons"]);

  const current =
    categoryValue ??
    (serviceCategory && categories.some(([id]) => id === serviceCategory)
      ? serviceCategory
      : "all");

  const toItems = (list: StudioAddon[]): AddonPickerItem[] =>
    list.map((addon) => {
      const isOn = selected.includes(addon.id);

      return {
        key: addon.id,
        name: addon.name,
        meta: formatAddon(addon),
        isOn,
        pick: () => {
          if (isOn) onRemove?.(addon);
          else onAdd(addon);
        },
      };
    });

  const isMatch = (addon: StudioAddon) =>
    !lowerQuery || addon.name.toLowerCase().includes(lowerQuery);

  const groups: {
    key: string;
    category: string;
    count: string;
    items: AddonPickerItem[];
  }[] = [];

  categories.forEach(([id, name]) => {
    if (current !== "all" && current !== id) return;

    const items = toItems(
      live.filter(
        (addon) => getAddonCategory(state, addon) === id && isMatch(addon),
      ),
    );

    if (items.length)
      groups.push({
        key: id,
        category: name,
        count: String(items.length),
        items,
      });
  });

  return {
    query,
    onQuery: (event: ChangeEvent<HTMLInputElement>) =>
      options.setQuery
        ? options.setQuery(event.target.value)
        : studio.setState({ addAddonQuery: event.target.value }),
    groups,
    isEmpty: groups.length === 0,
    hasDone: !!onDone,
    done: onDone || (() => {}),
    doneLabel: selected.length ? `Done · ${selected.length} added` : "Done",
    chips: ([["all", "All"]] as [string, string][])
      .concat(categories)
      .map(([id, label]) => ({
        key: id,
        label,
        isOn: current === id,
        onSelect: () =>
          options.setCategory
            ? options.setCategory(id)
            : studio.setState({ addAddonCategory: id }),
      })),
  };
};

export type AddonPicker = ReturnType<typeof getAddonPicker>;
