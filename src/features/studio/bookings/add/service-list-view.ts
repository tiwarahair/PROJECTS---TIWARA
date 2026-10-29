import type { ChangeEvent } from "react";
import { getTaxonomies } from "../../core/model";
import type { StudioService } from "../../core/types";
import type { AddContext } from "./context";
import { formatMoney } from "../../../../utils/money";

// ---- step 2: services ----
export const getServiceListView = ({ state, setState }: AddContext) => {
  const serviceQuery = (state.addServiceQuery || "").toLowerCase();

  const services = state.services.filter(
    ({ status, name }) =>
      status !== "archived" &&
      status !== "draft" &&
      (!serviceQuery || name.toLowerCase().includes(serviceQuery)),
  );

  const toItems = (list: StudioService[]) =>
    list.map(({ id, name, duration, price }) => ({
      key: id,
      name,
      duration,
      priceLabel: `${formatMoney(price)}`,
      isOn: state.addService === id,
      pick: () =>
        setState({
          addService: id,
          addDuration: null,
          addPrice: null,
          addOverlapAllowed: false,
          addAddons: [],
          addExtra: 0,
        }),
    }));

  const groups = getTaxonomies(state)
    .map(({ id, name }) => ({
      key: id,
      category: name,
      items: toItems(services.filter((item) => item.taxonomyId === id)),
    }))
    .concat({
      key: "other",
      category: "Other",
      items: toItems(
        services.filter(
          (item) =>
            !state.catalogue.groups.some(({ id }) => id === item.taxonomyId),
        ),
      ),
    });

  const serviceGroups = groups
    .filter(({ items }) => items.length)
    .map(({ key, category, items }) => ({
      key,
      category,
      count: String(items.length),
      items,
    }));

  return {
    isServiceList: state.addStep === 2 && !state.addEditService,
    serviceQuery: state.addServiceQuery || "",
    onServiceQuery: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addServiceQuery: event.target.value }),
    serviceGroups,
    isServiceEmpty: serviceGroups.length === 0,
  };
};
