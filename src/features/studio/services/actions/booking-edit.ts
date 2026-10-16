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
    const service = getState().services.find(
      ({ name }) => name === booking.service,
    );

    setState({
      bookingStep: "editsvc",
      changeServiceQuery: "",
      serviceEdit: {
        serviceId: service ? service.id : null,
        serviceName: booking.service,
        taxonomyId: service ? service.taxonomyId : null,
        time: timeToMinutes(booking.time),
        duration: booking.durationMinutes,
        price: String(booking.price),
        originalPrice: String(booking.price),
        priceOpen: !!booking.priceReason,
        priceReason: booking.priceReason || "",
        extra: service?.extra ? Number(service.extra) : null,
        addons: getBookingAddons(booking).map((addon) => ({ ...addon })),
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
