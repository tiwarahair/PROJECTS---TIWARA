import { getInitialsImage, parseNumber } from "../../core/format";
import { getProtectionExpiry } from "../../core/model";
import type { StudioBooking } from "../../core/types";
import { formatDuration } from "../../../../utils/dates";
import type { AddContext } from "./context";
import type { NewClient } from "./types";

export const saveNewClient = (
  { state, setState }: AddContext,
  addNew: NewClient,
) => {
  const id = `c${Date.now()}`;
  const address = addNew.address.trim();

  setState({
    extraClients: state.extraClients.concat([
      {
        id,
        name: addNew.name.trim(),
        phone: addNew.contact.trim(),
        email: (addNew.email || "").trim(),
        area: "",
        img: getInitialsImage(addNew.name),
        visits: 0,
        last: "—",
        spent: 0,
        fav: "",
      },
    ]),
    addClient: id,
    addNew: null,
    addStep: 2,
    ...(address
      ? { clientAddresses: { ...state.clientAddresses, [id]: address } }
      : {}),
  });
};

const getBookingRecord = (
  { state, duration, price, isProtectionSkipped, selectedAddons }: AddContext,
  name: string,
  dayOffset: number,
  time: string,
): StudioBooking => {
  const isLink = !isProtectionSkipped && state.addProtection !== "none";
  const id = Date.now();
  const sentAt = Date.now();

  const record: StudioBooking = {
    id,
    dayOffset,
    time,
    duration: formatDuration(duration),
    client: state.addWalkIn ? null : state.addClient,
    service: name,
    price: Math.max(0, price),
    pending: false,
    status: isLink ? "awaiting" : "confirmed",
    paid: isLink ? "link" : "none",
    protect: isLink ? "link" : "none",
    stylistNote: state.addNote.trim(),
    address: state.addAddress.trim(),
    walkIn: !!state.addWalkIn,
    protectionMode: isLink ? state.policy.mode : "none",
  };

  if (state.addExtra) record.extra = state.addExtra;

  if (selectedAddons.length)
    record.addons = selectedAddons.map(
      ({ id, name: addonName, price: addonPrice }) => ({
        id,
        name: addonName,
        price: parseNumber(addonPrice),
        quantity: 1,
      }),
    );

  if (isLink) {
    record.linkSentAt = sentAt;
    record.resends = 0;
    record.expiresAt = getProtectionExpiry(sentAt, dayOffset, time);
  }

  return record;
};

const getAddedToast = (
  { state, client, clientFirst }: AddContext,
  isLink: boolean,
) => {
  if (state.addWalkIn) return "Walk-in added";

  const who = client ? clientFirst : "client";

  return `Booking added for ${who}${isLink ? ". Payment link sent" : ""}`;
};

export const confirmBooking = (context: AddContext) => {
  const { state, setState, actions, service } = context;
  const { addDay, addTime, addClient } = state;

  if (!service || addDay == null || !addTime) return;

  const record = getBookingRecord(context, service.name, addDay, addTime);
  const date = new Date();

  date.setDate(date.getDate() + addDay);

  setState({
    bookings: state.bookings.concat([record]),
    tab: "bookings",
    dayIndex: addDay,
    bookingsLayout: "cal",
    bookingCalendarMonth: date.getMonth(),
    bookingCalendarYear: date.getFullYear(),
    ...(record.address && addClient
      ? {
          clientAddresses: {
            ...state.clientAddresses,
            [addClient]: record.address,
          },
        }
      : {}),
  });

  actions.showToast(getAddedToast(context, record.protect === "link"));
  actions.closeSheet();
};
