import type { DecoratedBooking } from "../decorate";
import { parseNumber, timeToMinutes } from "../../core/format";
import { getBusy, getWorkingHours } from "../../core/model";
import type {
  BookingAddon,
  StudioAddon,
  StudioBooking,
  StudioState,
} from "../../core/types";
import type { StudioController } from "../../core/use-studio";

export type ServiceEditDraft = NonNullable<StudioState["serviceEdit"]>;

const BLANK_DRAFT: ServiceEditDraft = {
  serviceId: null,
  serviceName: "",
  taxonomyId: null,
  time: 0,
  duration: 0,
  price: "",
  originalPrice: "",
  priceOpen: false,
  priceReason: "",
  extra: null,
  addons: [],
};

export const getAddonMinutes = ({
  hours,
  min,
}: Pick<StudioAddon, "hours" | "min">) =>
  (parseInt(String(hours)) || 0) * 60 + (parseInt(String(min)) || 0);

export const getContext = (
  studio: StudioController,
  booking: DecoratedBooking,
  patchBooking: (patch: Partial<StudioBooking>) => void,
) => {
  const { state, setState, actions, serviceActions, context } = studio;
  const draft = state.serviceEdit ?? BLANK_DRAFT;

  const getAddon = (id: string | undefined) =>
    state.addons.find((addon) => addon.id === id) ?? null;

  const getLinkValues = (link: BookingAddon, fallbackName: string) => {
    const addon = getAddon(link.addonId) ?? {
      name: fallbackName,
      price: 0,
      hours: 0,
      min: 0,
    };

    return {
      addon,
      price: link.price != null ? link.price : parseNumber(addon.price),
      minutes: link.minutes != null ? link.minutes : getAddonMinutes(addon),
      quantity: link.quantity || 1,
    };
  };

  const hours = getWorkingHours(state, booking.dayOffset);
  const duration = draft.duration || booking.durationMinutes;
  const extra = draft.extra || 0;
  const busy = getBusy(state, booking.dayOffset, booking.id);

  let addonsPrice = 0;
  let addonsMinutes = 0;

  for (const link of draft.addons) {
    const { price, minutes, quantity } = getLinkValues(
      link,
      link.name || "Add-on",
    );

    addonsPrice += price * quantity;
    addonsMinutes += minutes * quantity;
  }

  const span = duration + addonsMinutes + extra;

  const clashes =
    draft.time != null
      ? busy.filter(
          ({ startMinutes, endMinutes }) =>
            startMinutes < draft.time + span && endMinutes > draft.time,
        )
      : [];

  return {
    studio,
    state,
    setState,
    actions,
    memo: context.memo,
    patchServiceEdit: serviceActions.patchServiceEdit,
    booking,
    patchBooking,
    draft,
    getAddon,
    getLinkValues,
    open: hours.on ? timeToMinutes(hours.start) : 9 * 60,
    close: hours.on ? timeToMinutes(hours.end) : 18 * 60,
    duration,
    extra,
    span,
    busy,
    clashes,
    addonsPrice,
    addonsMinutes,
  };
};

export type EditContext = ReturnType<typeof getContext>;
