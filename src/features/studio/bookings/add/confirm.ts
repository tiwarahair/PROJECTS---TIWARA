import { getInitialsImage, parseNumber } from "../../core/format";
import {
  getClient,
  getClientNames,
  getProtectionExpiry,
} from "../../core/model";
import type { StudioBooking } from "../../core/types";
import { formatDuration } from "../../../../utils/dates";
import { fetchStudioBooking } from "../../../../lib/studio-api/bookings";
import { createStudioBooking } from "../../../../lib/studio-api/booking-writes";
import type { StudioContact } from "../../../../lib/studio-api/booking-writes";
import { addStudioClient } from "../../clients/save";
import { keepLocalId, toStartsAt } from "../records";
import { isWaiting, removeLocal, replaceWithRow } from "../save";
import { getAddonValue } from "./addon-values";
import type { AddContext } from "./context";
import type { NewClient } from "./types";
import { checkUnpaidFee } from "./unpaid-fee";

const toPence = (pounds: number) => Math.round(pounds * 100);

export const saveNewClient = (
  { studio, state, setState }: AddContext,
  addNew: NewClient,
) => {
  const address = addNew.address.trim();
  const id = `c${Date.now()}`;

  addStudioClient(studio.context, {
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
  });

  setState({
    addClient: id,
    addNew: null,
    addStep: 2,
    ...(address
      ? { clientAddresses: { ...state.clientAddresses, [id]: address } }
      : {}),
  });

  // a shared phone can still owe a fee
  checkUnpaidFee(studio.context.getState, setState, id);
};

const getStatus = (isLink: boolean, hasStarted: boolean) => {
  if (isLink) return "awaiting";

  return hasStarted ? "arrived" : "confirmed";
};

const getBookingRecord = (
  {
    state,
    duration,
    price,
    hasStarted,
    isProtectionSkipped,
    isLinkTooLate,
    selectedAddons,
  }: AddContext,
  name: string,
  dayOffset: number,
  time: string,
): StudioBooking => {
  const isLink =
    !isProtectionSkipped && !isLinkTooLate && state.addProtection !== "none";

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
    status: getStatus(isLink, hasStarted),
    loggedAfterStart: hasStarted,
    paid: isLink ? "link" : "none",
    protect: isLink ? "link" : "none",
    stylistNote: state.addNote.trim(),
    address: state.addAddress.trim(),
    walkIn: !!state.addWalkIn,
    protectionMode: isLink ? state.policy.mode : "none",
    agreedPolicy: isLink ? state.policy : { ...state.policy, mode: "none" },
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

const getContact = (context: AddContext): StudioContact | null => {
  const { state } = context;

  if (state.addWalkIn || !state.addClient) return null;

  const client = getClient(state, state.addClient);

  return {
    ...getClientNames(client),
    phone: client.phone || "",
    email: client.email || "",
  };
};

/** Saves a real booking; the server's row then replaces the one shown straight away. */
const saveRemote = (context: AddContext, record: StudioBooking) => {
  const { state, setState, service, studio, overrides, selectedAddons } =
    context;

  const { sync } = studio.context;

  if (!service) return;

  const previous = state.bookings;

  sync.save(
    async () => {
      const { id } = await createStudioBooking({
        serviceId: service.id,
        addons: selectedAddons.map((addon) => {
          const { price, minutes, quantity } = getAddonValue(addon, overrides);

          return {
            id: addon.id,
            pricePence: toPence(price),
            minutes,
            quantity,
          };
        }),
        startsAt: toStartsAt(record.dayOffset, record.time),
        minutes: context.duration,
        extraMinutes: state.addExtra || 0,
        pricePence: toPence(record.price),
        allowOverlap: !!state.addOverlapAllowed,
        contact: getContact(context),
        address: record.address || "",
        note: record.stylistNote || "",
        protect: record.protect === "link",
      });

      keepLocalId(id, record.id);

      const row = await fetchStudioBooking(id);

      setState((current) => {
        // changes queued behind this save bring the server's copy once they're saved
        if (isWaiting(record.id))
          return {
            bookings: current.bookings
              .filter(({ remoteId }) => remoteId !== id)
              .map((item) =>
                item.id === record.id ? { ...item, remoteId: id } : item,
              ),
            // cancelled or marked a no-show before this save came back
            pastNew: current.pastNew.map((item) =>
              item.original?.id === record.id
                ? { ...item, remoteId: id }
                : item,
            ),
          };

        return row
          ? replaceWithRow(current, record.id, row)
          : removeLocal(current, record.id);
      });
    },
    { bookings: previous },
  );
};

export const confirmBooking = (context: AddContext) => {
  const { state, setState, actions, service } = context;
  const { addDay, addTime, addClient } = state;

  if (!service || addDay == null || !addTime) return;

  const record = getBookingRecord(context, service.name, addDay, addTime);

  saveRemote(context, record);
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
