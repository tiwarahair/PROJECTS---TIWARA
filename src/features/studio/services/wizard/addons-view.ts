import type { ChangeEvent } from "react";
import { getAddonPicker } from "../addon-picker";
import { parseNumber } from "../../core/format";
import { getTaxonomy } from "../../core/model";
import {
  formatAddon,
  getCategoryById,
  getSortedCategories,
} from "../../core/model";
import type { StudioAddon, WizardState } from "../../core/types";
import type { StudioController } from "../../core/use-studio";

const makeLink = (addonId: string) => ({
  addonId,
  priceOverride: null,
  hoursOverride: null,
  minutesOverride: null,
});

const getOverride = (override: string | number | null) =>
  override != null ? String(override) : "";

/** Step 4: the add-on picker, the attached list with overrides, and New add-on. */
export const getWizardAddons = (
  studio: StudioController,
  wizard: WizardState,
) => {
  const { state, setState, actions, serviceActions } = studio;
  const { setWizard, setDraft } = serviceActions;
  const { draft } = wizard;

  const category = getCategoryById(state, draft.categoryId)
    ? draft.categoryId
    : null;

  const getAddonCategoryValue = () => {
    if (wizard.addonCategory !== undefined) return wizard.addonCategory;

    return category &&
      state.addons.some(({ categoryId }) => categoryId === category)
      ? category
      : "all";
  };

  const addonCategory = getAddonCategoryValue();

  const getCategoryName = (id: string | null) =>
    getCategoryById(state, id)?.name ?? "Other add-ons";

  const all: StudioAddon[] = state.addons.concat(wizard.pendingAddons || []);
  const { newAddon } = wizard;
  const group = getTaxonomy(state, draft.taxonomyId);

  const getNewCategoryLabel = () => {
    if (addonCategory !== "all") return getCategoryName(addonCategory);

    return group ? group.name : "Other";
  };

  return {
    picker: getAddonPicker(
      studio,
      state,
      draft.addons.map(({ addonId }) => addonId),
      (addon) =>
        setDraft({ addons: draft.addons.concat([makeLink(addon.id)]) }),
      category,
      (addon) =>
        setDraft({
          addons: draft.addons.filter(({ addonId }) => addonId !== addon.id),
        }),
      null,
      {
        hideSelected: true,
        list: all,
        query: wizard.addonQuery || "",
        category: wizard.addonCategory == null ? null : wizard.addonCategory,
        setQuery: (value) => setWizard({ addonQuery: value }),
        setCategory: (value) => setWizard({ addonCategory: value }),
      },
    ),
    toggleNew: () =>
      setWizard({
        newAddon: newAddon ? null : { name: "", price: "", hours: "", min: "" },
      }),
    newAddon,
    newCategoryLabel: getNewCategoryLabel(),
    newCategoryOptions: getSortedCategories(state)
      .map(({ id, name }) => ({ value: id, label: name }))
      .concat([{ value: "none", label: "No category" }]),
    newCategory:
      newAddon && newAddon.categoryId !== undefined
        ? newAddon.categoryId || "none"
        : category || "none",
    patchNew: (patch: Partial<NonNullable<typeof newAddon>>) =>
      newAddon && setWizard({ newAddon: { ...newAddon, ...patch } }),
    newHour: String(parseInt(newAddon?.hours ?? "") || 0),
    newMinute: String(parseInt(newAddon?.min ?? "") || 0),
    cancelNew: () => setWizard({ newAddon: null }),
    createNew: () => {
      if (!newAddon || !newAddon.name.trim()) {
        actions.showToast("Give the add-on a name first");

        return;
      }

      const addon: StudioAddon = {
        id: crypto.randomUUID(),
        categoryId:
          newAddon.categoryId !== undefined ? newAddon.categoryId : category,
        name: newAddon.name.trim(),
        price: parseNumber(newAddon.price),
        hours: parseInt(newAddon.hours) || 0,
        min: parseInt(newAddon.min) || 0,
      };

      setState({
        addons: state.addons.concat([addon]),
        wizard: {
          ...wizard,
          newAddon: null,
          draft: {
            ...draft,
            addons: draft.addons.concat([makeLink(addon.id)]),
          },
        },
      });

      actions.showToast(
        `${addon.name} created. It now lives on your Add-ons tab too`,
      );
    },
    selected: draft.addons
      .map((link) => {
        const addon = all.find(({ id }) => id === link.addonId);

        if (!addon) return null;

        const isOpen = wizard.openAddon === link.addonId;

        const pick = (
          override: string | number | null,
          fallback: string | number,
        ) => (override != null && override !== "" ? override : fallback);

        const patchLink = (patch: Partial<typeof link>) =>
          setDraft({
            addons: draft.addons.map((item) =>
              item.addonId === link.addonId ? { ...item, ...patch } : item,
            ),
          });

        return {
          key: link.addonId,
          name: addon.name,
          meta: formatAddon({
            price: pick(link.priceOverride, addon.price),
            hours: pick(link.hoursOverride, addon.hours),
            min: pick(link.minutesOverride, addon.min),
          }),
          isOpen,
          toggle: () => setWizard({ openAddon: isOpen ? null : link.addonId }),
          remove: () =>
            setDraft({
              addons: draft.addons.filter(
                ({ addonId }) => addonId !== link.addonId,
              ),
            }),
          price: getOverride(link.priceOverride),
          hours: getOverride(link.hoursOverride),
          minutes: getOverride(link.minutesOverride),
          pricePlaceholder: `${addon.price || 0}`,
          hoursPlaceholder: `${addon.hours || 0}`,
          minutesPlaceholder: `${addon.min || 0}`,
          setPrice: (event: ChangeEvent<HTMLInputElement>) =>
            patchLink({ priceOverride: event.target.value }),
          setHours: (event: ChangeEvent<HTMLInputElement>) =>
            patchLink({ hoursOverride: event.target.value }),
          setMinutes: (event: ChangeEvent<HTMLInputElement>) =>
            patchLink({ minutesOverride: event.target.value }),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
  };
};
