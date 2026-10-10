// Studio → Services values (prototype renderVals: serviceGroups, addonGroups, the category rows / chips and filters).
import type { MouseEvent } from "react";
import { NO_CAT_TONE } from "./studio-data";
import {
  formatAddon,
  getAddonCat,
  getCatById,
  getCatTone,
  getCatsSorted,
  getServiceExtra,
} from "./studio-model";
import { getAnchor, getBlankAddon } from "./studio-service-actions";
import type { StudioAddon, StudioService } from "./studio-types";
import type { StudioController } from "./use-studio";

const ARCHIVED_TONE = "var(--neutral-300,#d8d2c6)";

export interface ListRow {
  key: string;
  name: string;
  meta: string;
  rail: string;
  isArchived: boolean;
  isDraft: boolean;
  dur?: string;
  priceLabel?: string;
  extraLabel?: string;
  open: () => void;
  menu: (event: MouseEvent) => void;
  restore?: (event: MouseEvent) => void;
  finish?: (event: MouseEvent) => void;
}

export interface ListGroup {
  key: string;
  cat: string;
  count: string;
  tone: string;
  hasMenu: boolean;
  menu?: (event: MouseEvent) => void;
  items: ListRow[];
}

export const getServicesView = (studio: StudioController) => {
  const { state, setState, actions, serviceActions } = studio;
  const { openActs, toastMsg, openSheet } = actions;
  const { openWiz, openCats, svcActions, addonActions, openAddon } =
    serviceActions;
  const query = (state.svcQuery || "").trim().toLowerCase();
  const statusFilter = state.svcStatusFilter || "all";
  const serviceCat = state.svcCat || "all";
  const addonCatFilter = state.addonCat || "all";
  const isAddons = state.svcTab === "addons";
  const getServiceCat = (service: StudioService) =>
    getCatById(state, service.categoryId)
      ? (service.categoryId as string)
      : "none";
  const isServiceMatch = (service: StudioService) =>
    (statusFilter === "all" || service.st === statusFilter) &&
    (serviceCat === "all" || getServiceCat(service) === serviceCat) &&
    (!query || service.name.toLowerCase().includes(query));
  const stop = (event?: MouseEvent) => event?.stopPropagation();

  const groupMenu =
    (
      label: string,
      countLabel: string,
      catId: string,
      addHere: { label: string; run: () => void },
      currentFilter: string,
      showOnly: () => void,
    ) =>
    (event: MouseEvent) => {
      stop(event);
      openActs({
        title: label,
        sub: countLabel,
        anchor: getAnchor(event),
        items: [
          { label: addHere.label, d: "M12 5v14M5 12h14", run: addHere.run },
          ...(currentFilter === catId
            ? []
            : [
                {
                  label: "Show only this category",
                  d: "M4 6h16M6 12h12M9 18h6",
                  run: showOnly,
                },
              ]),
          {
            label: "Manage categories",
            d: "M4 6h16M4 12h16M4 18h10",
            run: () => openCats(),
          },
        ],
      });
    };

  // ---- services ----
  const raw: { cat: string; catId: string | null; items: StudioService[] }[] =
    [];
  getCatsSorted(state).forEach(({ id, name }) => {
    const items = state.services.filter(
      (service) =>
        service.categoryId === id &&
        service.st !== "archived" &&
        isServiceMatch(service),
    );
    if (items.length) raw.push({ cat: name, catId: id, items });
  });
  const uncategorised = state.services.filter(
    (service) =>
      getServiceCat(service) === "none" &&
      service.st !== "archived" &&
      isServiceMatch(service),
  );
  if (uncategorised.length)
    raw.push({ cat: "Other services", catId: "none", items: uncategorised });
  const archived = state.services.filter(
    (service) => service.st === "archived" && isServiceMatch(service),
  );
  if (archived.length)
    raw.push({ cat: "Archived", catId: null, items: archived });
  const serviceGroups: ListGroup[] = raw.map(({ cat, catId, items }) => {
    const tone = catId ? getCatTone(state, catId) : NO_CAT_TONE;
    const countLabel =
      items.length + (items.length === 1 ? " service" : " services");
    return {
      key: catId ?? "archived",
      cat,
      count: countLabel,
      tone,
      hasMenu: !!catId,
      menu: groupMenu(
        cat,
        countLabel,
        catId || "all",
        {
          label: "Add a service here",
          run: () =>
            openWiz("add", null, {
              categoryId: catId === "none" ? null : catId,
            }),
        },
        serviceCat,
        () => setState({ svcCat: catId || "all" }),
      ),
      items: items.map((service) => {
        const isArchived = service.st === "archived";
        const extra = getServiceExtra(state, service);
        return {
          key: service.id,
          name: service.name,
          meta: "",
          rail: tone,
          isArchived,
          isDraft: service.st === "draft",
          dur: service.dur,
          priceLabel: "£" + service.price,
          extraLabel: extra ? "+" + extra + "m" : "",
          open: () => openWiz("edit", service),
          menu: (event: MouseEvent) => {
            stop(event);
            svcActions(service, event);
          },
          finish: (event: MouseEvent) => {
            stop(event);
            openWiz("edit", service);
          },
          restore: (event: MouseEvent) => {
            stop(event);
            setState({
              services: state.services.map((item) =>
                item.id === service.id ? { ...item, st: "active" } : item,
              ),
            });
            toastMsg(service.name + " restored");
          },
        };
      }),
    };
  });

  // ---- add-ons ----
  const isAddonMatch = (addon: StudioAddon) =>
    (statusFilter === "all" || (addon.st || "active") === statusFilter) &&
    (addonCatFilter === "all" ||
      getAddonCat(state, addon) === addonCatFilter) &&
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
      addonActions(addon, event);
    },
    restore: (event: MouseEvent) => {
      stop(event);
      setState({
        addons: state.addons.map((item) =>
          item.id === addon.id ? { ...item, st: "active" } : item,
        ),
      });
      toastMsg(addon.name + " restored");
    },
  });
  const addonGroups: ListGroup[] = [];
  const addAddonGroup = (
    cat: string,
    catId: string,
    tone: string,
    items: StudioAddon[],
  ) => {
    if (!items.length) return;
    const countLabel =
      items.length + (items.length === 1 ? " add-on" : " add-ons");
    addonGroups.push({
      key: catId,
      cat,
      count: countLabel,
      tone,
      hasMenu: true,
      menu: groupMenu(
        cat,
        countLabel,
        catId,
        {
          label: "Add an add-on here",
          run: () =>
            openSheet("addon", {
              addonDraft: {
                ...getBlankAddon(),
                categoryId: catId === "none" ? null : catId,
              },
              adNewCat: null,
            }),
        },
        addonCatFilter,
        () => setState({ addonCat: catId }),
      ),
      items: items.map((addon) => addonRow(addon, tone, false)),
    });
  };
  getCatsSorted(state).forEach(({ id, name, colour }) =>
    addAddonGroup(
      name,
      id,
      colour,
      state.addons.filter(
        (addon) =>
          getAddonCat(state, addon) === id &&
          (addon.st || "active") !== "archived" &&
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
        getAddonCat(state, addon) === "none" &&
        (addon.st || "active") !== "archived" &&
        isAddonMatch(addon),
    ),
  );
  const archivedAddons = state.addons.filter(
    (addon) => (addon.st || "active") === "archived" && isAddonMatch(addon),
  );
  if (archivedAddons.length)
    addonGroups.push({
      key: "archived",
      cat: "Archived",
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
  const currentFilter = isAddons ? addonCatFilter : serviceCat;
  const pool = (isAddons ? state.addons : state.services)
    .filter(
      (item) =>
        statusFilter === "all" || (item.st || "active") === statusFilter,
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
          getCatsSorted(state).map(({ id, name, colour }) => ({
            id,
            label: name,
            count: countIf(
              (item) => getAddonCat(state, item as StudioAddon) === id,
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
                (item) => getAddonCat(state, item as StudioAddon) === "none",
              ),
              dot: NO_CAT_TONE,
            },
          ].filter(({ count, id }) => count > 0 || currentFilter === id),
        )
        .concat(
          [
            {
              id: "unclassified",
              label: "Unclassified",
              count: countIf((item) => !item.cat),
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
          getCatsSorted(state).map(({ id, name, colour }) => ({
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
              count: countIf((item) => !getCatById(state, item.categoryId)),
              dot: NO_CAT_TONE,
            },
          ].filter(({ count, id }) => count > 0 || currentFilter === id),
        );
  const pickCategory = (id: string) =>
    setState(isAddons ? { addonCat: id } : { svcCat: id });
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
      pick: () => setState({ svcStatusFilter: id, svcStatOpen: false }),
    })),
    categories,
    addLabel: isAddons ? "Add add-on" : "Add service",
    add: () => {
      if (isAddons)
        openSheet("addon", {
          addonDraft: {
            ...getBlankAddon(),
            categoryId:
              state.addonCat &&
              state.addonCat !== "all" &&
              state.addonCat !== "none"
                ? state.addonCat
                : null,
          },
          adNewCat: null,
        });
      else openWiz("add");
    },
  };
};

export type ServicesView = ReturnType<typeof getServicesView>;
