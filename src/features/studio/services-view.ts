// Studio → Services values: service groups, add-on groups, the category rows / chips and filters.
import type { MouseEvent } from "react";
import { NO_CATEGORY_TONE } from "./studio-data";
import {
  formatAddon,
  getAddonCategory,
  getCategoryById,
  getCategoryTone,
  getSortedCategories,
  getServiceExtra,
} from "./studio-model";
import { getAnchor, getBlankAddon } from "./studio-service-actions";
import type { StudioAddon, StudioService } from "./studio-types";
import type { StudioController } from "./use-studio";

const ARCHIVED_TONE = "var(--neutral-300,#d8d2c6)";

interface ListRow {
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

export const getServicesView = (studio: StudioController) => {
  const { state, setState, actions, serviceActions } = studio;
  const { openActionSheet, showToast, openSheet } = actions;

  const {
    openWizard,
    openCategories,
    openServiceActions,
    openAddonActions,
    openAddon,
  } = serviceActions;

  const query = (state.serviceQuery || "").trim().toLowerCase();
  const statusFilter = state.serviceStatusFilter || "all";
  const serviceCategory = state.serviceCategoryFilter || "all";
  const addonCategoryFilter = state.addonCategoryFilter || "all";
  const isAddons = state.servicesTab === "addons";

  const getServiceCategory = (service: StudioService) =>
    getCategoryById(state, service.categoryId)
      ? (service.categoryId as string)
      : "none";

  const isServiceMatch = (service: StudioService) =>
    (statusFilter === "all" || service.status === statusFilter) &&
    (serviceCategory === "all" ||
      getServiceCategory(service) === serviceCategory) &&
    (!query || service.name.toLowerCase().includes(query));

  const stop = (event?: MouseEvent) => event?.stopPropagation();

  const groupMenu =
    (
      label: string,
      countLabel: string,
      categoryId: string,
      addHere: { label: string; run: () => void },
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
            iconPath: "M12 5v14M5 12h14",
            run: addHere.run,
          },
          ...(currentFilter === categoryId
            ? []
            : [
                {
                  label: "Show only this category",
                  iconPath: "M4 6h16M6 12h12M9 18h6",
                  run: showOnly,
                },
              ]),
          {
            label: "Manage categories",
            iconPath: "M4 6h16M4 12h16M4 18h10",
            run: () => openCategories(),
          },
        ],
      });
    };

  // ---- services ----
  const raw: {
    category: string;
    categoryId: string | null;
    items: StudioService[];
  }[] = [];

  getSortedCategories(state).forEach(({ id, name }) => {
    const items = state.services.filter(
      (service) =>
        service.categoryId === id &&
        service.status !== "archived" &&
        isServiceMatch(service),
    );

    if (items.length) raw.push({ category: name, categoryId: id, items });
  });

  const uncategorised = state.services.filter(
    (service) =>
      getServiceCategory(service) === "none" &&
      service.status !== "archived" &&
      isServiceMatch(service),
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

  const serviceGroups: ListGroup[] = raw.map(
    ({ category, categoryId, items }) => {
      const tone = categoryId
        ? getCategoryTone(state, categoryId)
        : NO_CATEGORY_TONE;

      const countLabel =
        items.length + (items.length === 1 ? " service" : " services");

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
              openWizard("add", null, {
                categoryId: categoryId === "none" ? null : categoryId,
              }),
          },
          serviceCategory,
          () => setState({ serviceCategoryFilter: categoryId || "all" }),
        ),
        items: items.map((service) => {
          const isArchived = service.status === "archived";
          const extra = getServiceExtra(state, service);

          return {
            key: service.id,
            name: service.name,
            meta: "",
            rail: tone,
            isArchived,
            isDraft: service.status === "draft",
            duration: service.duration,
            priceLabel: `£${service.price}`,
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
            restore: (event: MouseEvent) => {
              stop(event);

              setState({
                services: state.services.map((item) =>
                  item.id === service.id ? { ...item, status: "active" } : item,
                ),
              });

              showToast(`${service.name} restored`);
            },
          };
        }),
      };
    },
  );

  // ---- add-ons ----
  const isAddonMatch = (addon: StudioAddon) =>
    (statusFilter === "all" || (addon.status || "active") === statusFilter) &&
    (addonCategoryFilter === "all" ||
      getAddonCategory(state, addon) === addonCategoryFilter) &&
    (!query || addon.name.toLowerCase().includes(query));

  const addonRow = (
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
    open: () => openAddon(addon),
    menu: (event: MouseEvent) => {
      stop(event);
      openAddonActions(addon, event);
    },
    restore: (event: MouseEvent) => {
      stop(event);

      setState({
        addons: state.addons.map((item) =>
          item.id === addon.id ? { ...item, status: "active" } : item,
        ),
      });

      showToast(`${addon.name} restored`);
    },
  });

  const addonGroups: ListGroup[] = [];

  const addAddonGroup = (
    category: string,
    categoryId: string,
    tone: string,
    items: StudioAddon[],
  ) => {
    if (!items.length) return;

    const countLabel =
      items.length + (items.length === 1 ? " add-on" : " add-ons");

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
          run: () =>
            openSheet("addon", {
              addonDraft: {
                ...getBlankAddon(),
                categoryId: categoryId === "none" ? null : categoryId,
              },
              addonNewCategory: null,
            }),
        },
        addonCategoryFilter,
        () => setState({ addonCategoryFilter: categoryId }),
      ),
      items: items.map((addon) => addonRow(addon, tone, false)),
    });
  };

  getSortedCategories(state).forEach(({ id, name, colour }) =>
    addAddonGroup(
      name,
      id,
      colour,
      state.addons.filter(
        (addon) =>
          getAddonCategory(state, addon) === id &&
          (addon.status || "active") !== "archived" &&
          isAddonMatch(addon),
      ),
    ),
  );

  addAddonGroup(
    "Other add-ons",
    "none",
    ARCHIVED_TONE,
    state.addons.filter(
      (addon) =>
        getAddonCategory(state, addon) === "none" &&
        (addon.status || "active") !== "archived" &&
        isAddonMatch(addon),
    ),
  );

  const archivedAddons = state.addons.filter(
    (addon) => (addon.status || "active") === "archived" && isAddonMatch(addon),
  );

  if (archivedAddons.length)
    addonGroups.push({
      key: "archived",
      category: "Archived",
      count:
        archivedAddons.length +
        (archivedAddons.length === 1 ? " add-on" : " add-ons"),
      tone: ARCHIVED_TONE,
      hasMenu: false,
      items: archivedAddons.map((addon) =>
        addonRow(addon, ARCHIVED_TONE, true),
      ),
    });

  // ---- category filter rows (desk) / chips ----
  const currentFilter = isAddons ? addonCategoryFilter : serviceCategory;

  const pool = (isAddons ? state.addons : state.services)
    .filter(
      (item) =>
        statusFilter === "all" || (item.status || "active") === statusFilter,
    )
    .filter((item) => !query || item.name.toLowerCase().includes(query));

  const countIf = (test: (item: StudioAddon | StudioService) => boolean) =>
    pool.filter(test).length;

  const categoryDefs = isAddons
    ? [
        {
          id: "all",
          label: "All add-ons",
          count: pool.length,
          dot: null as string | null,
        },
      ]
        .concat(
          getSortedCategories(state).map(({ id, name, colour }) => ({
            id,
            label: name,
            count: countIf(
              (item) => getAddonCategory(state, item as StudioAddon) === id,
            ),
            dot: colour,
          })),
        )
        .concat(
          [
            {
              id: "none",
              label: "Other add-ons",
              count: countIf(
                (item) =>
                  getAddonCategory(state, item as StudioAddon) === "none",
              ),
              dot: NO_CATEGORY_TONE,
            },
          ].filter(({ count, id }) => count > 0 || currentFilter === id),
        )
        .concat(
          [
            {
              id: "unclassified",
              label: "Unclassified",
              count: countIf((item) => !item.taxonomyId),
              dot: null,
            },
          ].filter(({ count, id }) => count > 0 || currentFilter === id),
        )
    : [
        {
          id: "all",
          label: "All services",
          count: pool.length,
          dot: null as string | null,
        },
      ]
        .concat(
          getSortedCategories(state).map(({ id, name, colour }) => ({
            id,
            label: name,
            count: countIf((item) => item.categoryId === id),
            dot: colour,
          })),
        )
        .concat(
          [
            {
              id: "none",
              label: "Other services",
              count: countIf(
                (item) => !getCategoryById(state, item.categoryId),
              ),
              dot: NO_CATEGORY_TONE,
            },
          ].filter(({ count, id }) => count > 0 || currentFilter === id),
        );

  const pickCategory = (id: string) =>
    setState(
      isAddons ? { addonCategoryFilter: id } : { serviceCategoryFilter: id },
    );

  const categories = categoryDefs.map(({ id, label, count, dot }) => ({
    key: id,
    label,
    chipLabel: id === "all" ? "All categories" : label,
    count: String(count),
    dot,
    isOn: currentFilter === id,
    pick: () => pickCategory(id),
  }));

  return {
    isAddons,
    serviceGroups,
    addonGroups,
    isAddonsEmpty: state.addons.length === 0,
    isAddonResultsEmpty: state.addons.length > 0 && addonGroups.length === 0,
    isServiceResultsEmpty:
      state.services.length > 0 && serviceGroups.length === 0,
    hasQuery: !!query,
    statusLabel: (
      { all: "Any status", active: "Active", archived: "Archived" } as Record<
        string,
        string
      >
    )[statusFilter],
    statusShort: (
      { all: "Status", active: "Active", archived: "Archived" } as Record<
        string,
        string
      >
    )[statusFilter],
    statusFilters: [
      { id: "all", label: "All" },
      { id: "active", label: "Active" },
      { id: "archived", label: "Archived" },
    ].map(({ id, label }) => ({
      key: id,
      label,
      isOn: statusFilter === id,
      pick: () =>
        setState({ serviceStatusFilter: id, serviceStatusOpen: false }),
    })),
    categories,
    addLabel: isAddons ? "Add add-on" : "Add service",
    add: () => {
      if (isAddons)
        openSheet("addon", {
          addonDraft: {
            ...getBlankAddon(),
            categoryId:
              state.addonCategoryFilter &&
              state.addonCategoryFilter !== "all" &&
              state.addonCategoryFilter !== "none"
                ? state.addonCategoryFilter
                : null,
          },
          addonNewCategory: null,
        });
      else openWizard("add");
    },
  };
};

export type ServicesView = ReturnType<typeof getServicesView>;
