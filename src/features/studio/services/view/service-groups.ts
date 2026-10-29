import type { MouseEvent } from "react";
import { NO_CATEGORY_TONE } from "../../core/constants";
import {
  getCategoryTone,
  getServiceExtra,
  getSortedCategories,
} from "../../core/model";
import type { StudioService } from "../../core/types";
import { getCountLabel } from "./context";
import type { ListGroup, ListRow, ServicesContext } from "./context";
import { formatMoney } from "../../../../utils/money";

interface RawGroup {
  category: string;
  categoryId: string | null;
  items: StudioService[];
}

const getRawGroups = ({
  state,
  getServiceCategory,
  isServiceMatch,
}: ServicesContext) => {
  const isShown = (service: StudioService) =>
    service.status !== "archived" && isServiceMatch(service);

  const raw: RawGroup[] = [];

  getSortedCategories(state).forEach(({ id, name }) => {
    const items = state.services.filter(
      (service) => service.categoryId === id && isShown(service),
    );

    if (items.length) raw.push({ category: name, categoryId: id, items });
  });

  const uncategorised = state.services.filter(
    (service) => getServiceCategory(service) === "none" && isShown(service),
  );

  if (uncategorised.length)
    raw.push({
      category: "Other services",
      categoryId: "none",
      items: uncategorised,
    });

  const archived = state.services.filter(
    (service) => service.status === "archived" && isServiceMatch(service),
  );

  if (archived.length)
    raw.push({ category: "Archived", categoryId: null, items: archived });

  return raw;
};

const getServiceRow = (
  { state, serviceActions, stop, restore }: ServicesContext,
  service: StudioService,
  tone: string,
): ListRow => {
  const { openWizard, openServiceActions } = serviceActions;
  const extra = getServiceExtra(state, service);

  return {
    key: service.id,
    name: service.name,
    meta: "",
    rail: tone,
    isArchived: service.status === "archived",
    isDraft: service.status === "draft",
    duration: service.duration,
    priceLabel: `${formatMoney(service.price)}`,
    extraLabel: extra ? `+${extra}m` : "",
    open: () => openWizard("edit", service),
    menu: (event: MouseEvent) => {
      stop(event);
      openServiceActions(service, event);
    },
    finish: (event: MouseEvent) => {
      stop(event);
      openWizard("edit", service);
    },
    restore: restore(service.name, () => ({
      services: state.services.map((item) =>
        item.id === service.id ? { ...item, status: "active" } : item,
      ),
    })),
  };
};

export const getServiceGroups = (context: ServicesContext): ListGroup[] => {
  const { state, setState, serviceActions, serviceCategory, groupMenu } =
    context;

  return getRawGroups(context).map(({ category, categoryId, items }) => {
    const tone = categoryId
      ? getCategoryTone(state, categoryId)
      : NO_CATEGORY_TONE;

    const countLabel = getCountLabel(items.length, "service");

    return {
      key: categoryId ?? "archived",
      category,
      count: countLabel,
      tone,
      hasMenu: !!categoryId,
      menu: groupMenu(
        category,
        countLabel,
        categoryId || "all",
        {
          label: "Add a service here",
          run: () =>
            serviceActions.openWizard("add", null, {
              categoryId: categoryId === "none" ? null : categoryId,
            }),
        },
        serviceCategory,
        () => setState({ serviceCategoryFilter: categoryId || "all" }),
      ),
      items: items.map((service) => getServiceRow(context, service, tone)),
    };
  });
};
