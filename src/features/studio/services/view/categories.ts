import { NO_CATEGORY_TONE } from "../../core/constants";
import {
  getAddonCategory,
  getCategoryById,
  getSortedCategories,
} from "../../core/model";
import type { StudioAddon, StudioService } from "../../core/types";
import type { ServicesContext } from "./context";

interface CategoryDefinition {
  id: string;
  label: string;
  count: number;
  dot: string | null;
}

export const getCategories = ({
  state,
  setState,
  statusFilter,
  serviceCategory,
  addonCategoryFilter,
  isAddons,
  isQueryMatch,
}: ServicesContext) => {
  const currentFilter = isAddons ? addonCategoryFilter : serviceCategory;

  const pool = (isAddons ? state.addons : state.services)
    .filter(
      (item) =>
        statusFilter === "all" || (item.status || "active") === statusFilter,
    )
    .filter((item) => isQueryMatch(item.name));

  const countIf = (test: (item: StudioAddon | StudioService) => boolean) =>
    pool.filter(test).length;

  const keepIfUsed = (definitions: CategoryDefinition[]) =>
    definitions.filter(({ count, id }) => count > 0 || currentFilter === id);

  const getAddonCount = (id: string) =>
    countIf((item) => getAddonCategory(state, item as StudioAddon) === id);

  const sorted = getSortedCategories(state);

  const categoryDefinitions: CategoryDefinition[] = isAddons
    ? [
        { id: "all", label: "All add-ons", count: pool.length, dot: null },
        ...sorted.map(({ id, name, colour }) => ({
          id,
          label: name,
          count: getAddonCount(id),
          dot: colour,
        })),
        ...keepIfUsed([
          {
            id: "none",
            label: "Other add-ons",
            count: getAddonCount("none"),
            dot: NO_CATEGORY_TONE,
          },
          {
            id: "unclassified",
            label: "Unclassified",
            count: countIf((item) => !item.taxonomyId),
            dot: null,
          },
        ]),
      ]
    : [
        { id: "all", label: "All services", count: pool.length, dot: null },
        ...sorted.map(({ id, name, colour }) => ({
          id,
          label: name,
          count: countIf((item) => item.categoryId === id),
          dot: colour,
        })),
        ...keepIfUsed([
          {
            id: "none",
            label: "Other services",
            count: countIf((item) => !getCategoryById(state, item.categoryId)),
            dot: NO_CATEGORY_TONE,
          },
        ]),
      ];

  const pickCategory = (id: string) =>
    setState(
      isAddons ? { addonCategoryFilter: id } : { serviceCategoryFilter: id },
    );

  return categoryDefinitions.map(({ id, label, count, dot }) => ({
    key: id,
    label,
    chipLabel: id === "all" ? "All categories" : label,
    count: String(count),
    dot,
    isOn: currentFilter === id,
    pick: () => pickCategory(id),
  }));
};
