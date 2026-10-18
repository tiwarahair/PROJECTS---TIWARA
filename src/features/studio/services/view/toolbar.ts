import type { ServicesContext } from "./context";

const STATUS_LABELS: Record<string, string> = {
  all: "Any status",
  active: "Active",
  archived: "Archived",
};

const STATUS_SHORT: Record<string, string> = {
  all: "Status",
  active: "Active",
  archived: "Archived",
};

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

export const getStatusView = ({
  setState,
  query,
  statusFilter,
}: ServicesContext) => ({
  hasQuery: !!query,
  statusLabel: STATUS_LABELS[statusFilter],
  statusShort: STATUS_SHORT[statusFilter],
  statusFilters: STATUS_FILTERS.map(({ id, label }) => ({
    key: id,
    label,
    isOn: statusFilter === id,
    pick: () => setState({ serviceStatusFilter: id, serviceStatusOpen: false }),
  })),
});

export const getAddView = ({
  state,
  serviceActions,
  isAddons,
  openNewAddon,
}: ServicesContext) => ({
  addLabel: isAddons ? "Add add-on" : "Add service",
  add: () => {
    if (isAddons)
      openNewAddon(
        state.addonCategoryFilter &&
          state.addonCategoryFilter !== "all" &&
          state.addonCategoryFilter !== "none"
          ? state.addonCategoryFilter
          : null,
      );
    else serviceActions.openWizard("add");
  },
});
