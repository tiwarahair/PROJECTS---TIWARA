import type { MouseEvent } from "react";
import { ListFilter, Plus, TextAlignStart } from "lucide-react";
import { getAddonCategory, getCategoryById } from "../../core/model";
import { getAnchor, getBlankAddon } from "../actions";
import type { StudioAddon, StudioPatch, StudioService } from "../../core/types";
import type { StudioController } from "../../core/use-studio";

export const ARCHIVED_TONE = "var(--neutral-300,#d8d2c6)";

export interface ListRow {
  key: string;
  name: string;
  meta: string;
  rail: string;
  isArchived: boolean;
  isDraft: boolean;
  duration?: string;
  priceLabel?: string;
  extraLabel?: string;
  open: () => void;
  menu: (event: MouseEvent) => void;
  restore?: (event: MouseEvent) => void;
  finish?: (event: MouseEvent) => void;
}

export interface ListGroup {
  key: string;
  category: string;
  count: string;
  tone: string;
  hasMenu: boolean;
  menu?: (event: MouseEvent) => void;
  items: ListRow[];
}

interface AddHere {
  label: string;
  run: () => void;
}

export const getCountLabel = (count: number, noun: string) =>
  count + (count === 1 ? ` ${noun}` : ` ${noun}s`);

export const getAddonStatus = (addon: StudioAddon) => addon.status || "active";

export const getContext = (studio: StudioController) => {
  const { state, setState, actions, serviceActions } = studio;
  const { openActionSheet, showToast, openSheet } = actions;
  const { openCategories } = serviceActions;
  const query = (state.serviceQuery || "").trim().toLowerCase();
  const statusFilter = state.serviceStatusFilter || "all";
  const serviceCategory = state.serviceCategoryFilter || "all";
  const addonCategoryFilter = state.addonCategoryFilter || "all";

  const isQueryMatch = (name: string) =>
    !query || name.toLowerCase().includes(query);

  const getServiceCategory = (service: StudioService) =>
    getCategoryById(state, service.categoryId)
      ? (service.categoryId as string)
      : "none";

  const isServiceMatch = (service: StudioService) =>
    (statusFilter === "all" || service.status === statusFilter) &&
    (serviceCategory === "all" ||
      getServiceCategory(service) === serviceCategory) &&
    isQueryMatch(service.name);

  const isAddonMatch = (addon: StudioAddon) =>
    (statusFilter === "all" || getAddonStatus(addon) === statusFilter) &&
    (addonCategoryFilter === "all" ||
      getAddonCategory(state, addon) === addonCategoryFilter) &&
    isQueryMatch(addon.name);

  const stop = (event?: MouseEvent) => event?.stopPropagation();

  const restore =
    (name: string, patch: () => StudioPatch) => (event: MouseEvent) => {
      stop(event);
      setState(patch());
      showToast(`${name} restored`);
    };

  const openNewAddon = (categoryId: string | null) =>
    openSheet("addon", {
      addonDraft: { ...getBlankAddon(), categoryId },
      addonNewCategory: null,
    });

  const groupMenu =
    (
      label: string,
      countLabel: string,
      categoryId: string,
      addHere: AddHere,
      currentFilter: string,
      showOnly: () => void,
    ) =>
    (event: MouseEvent) => {
      stop(event);

      openActionSheet({
        title: label,
        subtitle: countLabel,
        anchor: getAnchor(event),
        items: [
          {
            label: addHere.label,
            icon: Plus,
            run: addHere.run,
          },
          ...(currentFilter === categoryId
            ? []
            : [
                {
                  label: "Show only this category",
                  icon: ListFilter,
                  run: showOnly,
                },
              ]),
          {
            label: "Manage categories",
            icon: TextAlignStart,
            run: () => openCategories(),
          },
        ],
      });
    };

  return {
    state,
    setState,
    serviceActions,
    query,
    statusFilter,
    serviceCategory,
    addonCategoryFilter,
    isAddons: state.servicesTab === "addons",
    isQueryMatch,
    getServiceCategory,
    isServiceMatch,
    isAddonMatch,
    stop,
    restore,
    openNewAddon,
    groupMenu,
  };
};

export type ServicesContext = ReturnType<typeof getContext>;
