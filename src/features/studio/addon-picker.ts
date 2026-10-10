// The searchable add-on picker shared by Edit service, New booking and the service wizard (prototype aaBuild).
import type { ChangeEvent } from "react";
import { formatAddon, getAddonCat, getCatsSorted } from "./studio-model";
import type { StudioAddon, StudioState } from "./studio-types";
import type { StudioController } from "./use-studio";

export interface AddonPickerOptions {
  /** Overrides for the wizard, which keeps its own query and category. */
  q?: string | null;
  cat?: string | null;
  list?: StudioAddon[];
  hideSelected?: boolean;
  setQuery?: (value: string) => void;
  setCat?: (value: string) => void;
}

export interface AddonPickerItem {
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
  serviceCat: string | null | undefined,
  onRemove?: ((addon: StudioAddon) => void) | null,
  onDone?: (() => void) | null,
  options: AddonPickerOptions = {},
) => {
  const query = options.q != null ? options.q : state.aaQ || "";
  const catValue = options.q != null ? options.cat : state.aaCat;
  const lowerQuery = query.toLowerCase();
  const live = (options.list || state.addons).filter(
    (addon) =>
      (addon.st || "active") !== "archived" &&
      !(options.hideSelected && selected.includes(addon.id)),
  );
  const cats: [string, string][] = getCatsSorted(state)
    .filter(({ id }) => live.some((addon) => getAddonCat(state, addon) === id))
    .map(({ id, name }) => [id, name]);
  if (live.some((addon) => getAddonCat(state, addon) === "none"))
    cats.push(["none", "Other add-ons"]);
  const current =
    catValue != null
      ? catValue
      : serviceCat && cats.some(([id]) => id === serviceCat)
        ? serviceCat
        : "all";
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
    cat: string;
    n: string;
    items: AddonPickerItem[];
  }[] = [];
  cats.forEach(([id, name]) => {
    if (current !== "all" && current !== id) return;
    const items = toItems(
      live.filter(
        (addon) => getAddonCat(state, addon) === id && isMatch(addon),
      ),
    );
    if (items.length)
      groups.push({ key: id, cat: name, n: String(items.length), items });
  });
  return {
    q: query,
    onQ: (event: ChangeEvent<HTMLInputElement>) =>
      options.setQuery
        ? options.setQuery(event.target.value)
        : studio.setState({ aaQ: event.target.value }),
    groups,
    isEmpty: groups.length === 0,
    hasDone: !!onDone,
    done: onDone || (() => {}),
    doneLabel: selected.length
      ? "Done · " + selected.length + " added"
      : "Done",
    chips: ([["all", "All"]] as [string, string][])
      .concat(cats)
      .map(([id, label]) => ({
        key: id,
        label,
        isOn: current === id,
        go: () =>
          options.setCat ? options.setCat(id) : studio.setState({ aaCat: id }),
      })),
  };
};

export type AddonPicker = ReturnType<typeof getAddonPicker>;
