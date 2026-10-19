import { durationToMinutes, parseNumber } from "../../core/format";
import {
  findDuplicate,
  isDuplicateBlocking,
  getBookingBuffer,
  getClient,
  getConflicts,
  getSlots,
} from "../../core/model";
import type { StudioAddon, StudioState } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import { toStartsAt } from "../records";

const isNewClientReady = (
  addNew: StudioState["addNew"],
  hasDuplicate: boolean,
) =>
  !!(
    addNew &&
    !hasDuplicate &&
    addNew.name.trim() &&
    (addNew.contact.trim() || (addNew.email || "").trim())
  );

export const getContext = (studio: StudioController) => {
  const { state, setState, actions, context } = studio;
  const { addNew, addStep } = state;
  const client = state.addClient ? getClient(state, state.addClient) : null;

  const service = state.addService
    ? (state.services.find(({ id }) => id === state.addService) ?? null)
    : null;

  const duration =
    state.addDuration ?? (service ? durationToMinutes(service.duration) : 60);

  const conflicts =
    addStep === 3 && service
      ? getConflicts(
          state,
          state.addDay,
          state.addTime,
          duration + (state.addExtra || 0),
          null,
        )
      : [];

  const duplicate = addNew
    ? findDuplicate(state, addNew.contact, addNew.email, null)
    : null;

  const selected = state.addAddons || [];

  const msToStart =
    state.addDay != null && state.addTime
      ? Date.parse(toStartsAt(state.addDay, state.addTime)) - Date.now()
      : null;

  const hasStarted = msToStart != null && msToStart <= 0;

  const readyByStep: Record<number, boolean> = {
    1:
      !!state.addClient ||
      state.addWalkIn ||
      isNewClientReady(addNew, isDuplicateBlocking(duplicate)),
    2: !!state.addService,
    3:
      state.addDay != null &&
      !!state.addTime &&
      (conflicts.length === 0 || state.addOverlapAllowed),
  };

  return {
    studio,
    state,
    setState,
    actions,
    memo: context.memo,
    now: new Date(),
    client,
    clientFirst: client ? (client.name.split(" ")[0] ?? "") : "",
    service,
    duration,
    conflicts,
    addNew,
    duplicate,
    hasStarted,
    isProtectionSkipped:
      state.policy.mode === "none" || state.addWalkIn || hasStarted,
    // the client needs until 2 hours before the start to confirm
    isLinkTooLate: msToStart != null && msToStart <= 2 * 3600000,
    isDisabled: readyByStep[addStep] === false,
    price: parseNumber(state.addPrice ?? (service ? service.price : 0)),
    priceLabel: state.addPrice != null ? state.addPrice : service?.price,
    selected,
    selectedAddons: selected
      .map((id) => state.addons.find((addon) => addon.id === id))
      .filter((addon): addon is StudioAddon => !!addon),
    overrides: state.addAddonOverrides || {},
    slots: getSlots(
      state,
      state.addDay,
      duration,
      service ? getBookingBuffer(state, service.name) : 0,
      null,
    ),
  };
};

export type AddContext = ReturnType<typeof getContext>;
