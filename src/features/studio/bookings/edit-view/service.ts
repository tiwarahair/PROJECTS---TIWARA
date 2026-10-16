import type { ChangeEvent } from "react";
import { TAXONOMY } from "../../core/constants";
import { parseNumber } from "../../core/format";
import type { StudioService } from "../../core/types";
import { formatDuration } from "../../../../utils/dates";
import type { EditContext, ServiceEditDraft } from "./context";

const getServiceMinutes = (service: StudioService) =>
  (service.durationHours || 0) * 60 + (service.durationMinutes || 0);

const getChangedFields = (
  draft: ServiceEditDraft,
  old: StudioService | null,
) => {
  const changed: string[] = [];

  if (old) {
    if (parseNumber(draft.price) !== parseNumber(old.price))
      changed.push("price");

    if ((draft.duration || 0) !== getServiceMinutes(old))
      changed.push("duration");

    if ((draft.extra || 0) !== (old.extra ? Number(old.extra) : 0))
      changed.push("extra time");
  }

  if (draft.addons.length)
    changed.push(
      draft.addons.length === 1 ? "1 add-on" : `${draft.addons.length} add-ons`,
    );

  return changed;
};

export const getServiceView = ({
  state,
  setState,
  booking,
  draft,
  duration,
}: EditContext) => ({
  categoryLabel:
    TAXONOMY.find((group) => group.id === draft.taxonomyId)?.name ?? "Other",
  serviceName: draft.serviceName || booking.service,
  serviceMeta: `${formatDuration(duration)} · £${parseNumber(draft.price)}`,
  openChange: () => {
    const changed = getChangedFields(
      draft,
      state.services.find((service) => service.id === draft.serviceId) ?? null,
    );

    const openChangeService = () =>
      setState({
        confirm: null,
        bookingStep: "changesvc",
        changeServiceQuery: "",
      });

    if (!changed.length) {
      openChangeService();

      return;
    }

    const changedList = changed.join(", ");

    setState({
      confirm: {
        title: "Change the service?",
        yesLabel: "Change service",
        noLabel: "Keep editing",
        body: `Picking a different service resets the ${changedList} you set here to the new service’s defaults. The start time stays as it is.`,
        yes: openChangeService,
      },
    });
  },
});

export const getChangeServiceView = ({
  state,
  setState,
  draft,
}: EditContext) => {
  const query = (state.changeServiceQuery || "").toLowerCase();

  const pickService = (service: StudioService) => {
    if (service.id === draft.serviceId) {
      setState({ bookingStep: "editsvc" });

      return;
    }

    setState({
      bookingStep: "editsvc",
      serviceEdit: {
        ...draft,
        serviceId: service.id,
        serviceName: service.name,
        taxonomyId: service.taxonomyId,
        duration: getServiceMinutes(service),
        price: String(service.price),
        extra: service.extra ? Number(service.extra) : null,
        addons: [],
      },
    });
  };

  const serviceGroups = TAXONOMY.map((group) => {
    const items = state.services
      .filter(
        (service) =>
          service.taxonomyId === group.id &&
          (service.status || "active") !== "archived" &&
          (!query || service.name.toLowerCase().includes(query)),
      )
      .map((service) => ({
        key: service.id,
        name: service.name,
        duration: service.duration,
        price: `£${service.price}`,
        isOn: service.id === draft.serviceId,
        pick: () => pickService(service),
      }));

    return {
      key: group.id,
      category: group.name,
      count: String(items.length),
      items,
    };
  }).filter(({ items }) => items.length);

  return {
    serviceQuery: state.changeServiceQuery || "",
    onServiceQuery: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ changeServiceQuery: event.target.value }),
    serviceGroups,
  };
};
