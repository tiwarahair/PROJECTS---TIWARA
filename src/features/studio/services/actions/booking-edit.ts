import type { StudioContext } from "../../core/actions";
import { timeToMinutes } from "../../core/format";
import type { StudioBooking, StudioState } from "../../core/types";

export const createBookingEditActions = ({
  getState,
  setState,
}: StudioContext) => {
  const getBookingAddons = (booking: { id: number }) =>
    getState().bookings.find(({ id }) => id === booking.id)?.addons || [];

  /** Opens the booking's "Edit service" step with a draft of its service. */
  const openAddonEdit = (
    booking: StudioBooking & { durationMinutes: number },
  ) => {
    const { services } = getState();

    const service =
      services.find(({ id }) => id === booking.serviceId) ??
      services.find(({ name }) => name === booking.service);

    const addons = getBookingAddons(booking);
    let addonsPrice = 0;
    let addonsMinutes = 0;

    for (const { price, minutes, quantity } of addons) {
      addonsPrice += (price || 0) * (quantity || 1);
      addonsMinutes += (minutes || 0) * (quantity || 1);
    }

    const servicePrice = String(Math.max(0, booking.price - addonsPrice));

    setState({
      bookingStep: "editsvc",
      changeServiceQuery: "",
      serviceEdit: {
        serviceId: booking.serviceId ?? service?.id ?? null,
        serviceName: booking.service,
        taxonomyId: service ? service.taxonomyId : null,
        time: timeToMinutes(booking.time),
        duration: Math.max(5, booking.durationMinutes - addonsMinutes),
        price: servicePrice,
        originalPrice: servicePrice,
        priceOpen: !!booking.priceReason,
        priceReason: booking.priceReason || "",
        extra: booking.extra ?? (service?.extra ? Number(service.extra) : null),
        addons: addons.map((addon) => ({ ...addon })),
      },
    });
  };

  const patchServiceEdit = (
    patch: Partial<NonNullable<StudioState["serviceEdit"]>>,
  ) =>
    setState(({ serviceEdit }) => ({
      serviceEdit: serviceEdit ? { ...serviceEdit, ...patch } : serviceEdit,
    }));

  return { getBookingAddons, openAddonEdit, patchServiceEdit };
};
