import { hhmm, parseNumber } from "../../core/format";
import type { BookingAddon } from "../../core/types";
import { formatDuration } from "../../../../utils/dates";
import { updateStudioBooking } from "../../../../lib/studio-api/booking-writes";
import { toStartsAt } from "../records";
import { saveToBooking } from "../save";
import type { EditContext } from "./context";
import { formatMoney, toPence } from "../../../../utils/money";

const getAppliedToast = ({ booking }: EditContext, isClientFacing: boolean) => {
  if (!booking.client || !isClientFacing) return "Service updated";

  return booking.awaiting
    ? `Service updated. ${booking.firstName} gets a new link`
    : `Service updated. ${booking.firstName} is notified`;
};

export const getApplyView = (context: EditContext) => {
  const {
    state,
    setState,
    actions,
    memo,
    studio,
    booking,
    patchBooking,
    draft,
    duration,
    extra,
    clashes,
    addonsPrice,
    addonsMinutes,
    getLinkValues,
  } = context;

  const totalPrice = parseNumber(draft.price) + addonsPrice;
  const firstClash = clashes[0];

  // every line keeps its name, price, length and quantity, however it was added
  const addons: BookingAddon[] = draft.addons.map((link) => {
    const { addon, price, minutes, quantity } = getLinkValues(
      link,
      link.name || "Add-on",
    );

    const id = link.addonId || link.id;

    return { id, addonId: id, name: addon.name, price, minutes, quantity };
  });

  const save = (remoteId: string, allowOverlap: boolean) =>
    updateStudioBooking(
      remoteId,
      {
        serviceId: draft.serviceId || booking.serviceId || "",
        addons: addons.map(({ id, price, minutes, quantity }) => ({
          id: id || "",
          pricePence: toPence(price || 0),
          minutes: minutes || 0,
          quantity: quantity || 1,
        })),
        startsAt: toStartsAt(booking.dayOffset, hhmm(draft.time)),
        minutes: duration + addonsMinutes,
        extraMinutes: extra,
        pricePence: toPence(totalPrice),
        allowOverlap,
      },
      (draft.priceReason || "").trim(),
    );

  const apply = () => {
    if (clashes.length && !memo.clashOk && firstClash) {
      const who =
        firstClash.kind === "booking" && firstClash.booking
          ? `${firstClash.booking.client}'s ${firstClash.booking.service}`
          : firstClash.block?.reason || "blocked time";

      const clashTime = hhmm(draft.time);

      setState({
        confirm: {
          title: "Double-book this slot?",
          yesLabel: "Apply anyway",
          noLabel: "Pick another time",
          body: `${clashTime} overlaps ${who}. Both stay in your calendar and the slot will not reopen for online booking.`,
          yes: () => {
            memo.clashOk = true;
            setState({ confirm: null });
            memo.applyEdit?.();
            memo.clashOk = false;
          },
        },
      });

      return;
    }

    const previous = state.bookings;
    const time = hhmm(draft.time);

    const allowOverlap =
      !!memo.clashOk || (!!booking.overlapOk && time === booking.time);

    const isClientFacing =
      draft.serviceName !== booking.service ||
      time !== booking.time ||
      totalPrice !== booking.price;

    patchBooking({
      price: totalPrice,
      duration: formatDuration(duration + addonsMinutes),
      time,
      extra,
      priceReason: (draft.priceReason || "").trim(),
      startsAt: toStartsAt(booking.dayOffset, time),
      overlapOk: allowOverlap,
    });

    saveToBooking(
      studio.context,
      booking,
      (remoteId) => save(remoteId, allowOverlap),
      { bookings: previous },
    );

    const list = state.bookings.map((item) =>
      item.id === booking.id
        ? { ...item, service: draft.serviceName, addons }
        : item,
    );

    setState({ bookingStepOut: true });

    window.setTimeout(() => {
      setState(({ bookings }) => ({
        // the patch above already landed; keep its price / time and take the new service and add-ons
        bookings: bookings.map((item) => {
          const next = list.find(({ id }) => id === item.id);

          return next && item.id === booking.id
            ? { ...item, service: next.service, addons: next.addons }
            : item;
        }),
        bookingStep: "view",
        bookingStepOut: false,
        bookingStepBack: true,
      }));

      actions.showToast(getAppliedToast(context, isClientFacing));
      window.setTimeout(() => setState({ bookingStepBack: false }), 700);
    }, 200);
  };

  memo.applyEdit = apply;

  return {
    totalLabel: `${formatDuration(duration + extra + addonsMinutes)}  ${formatMoney(totalPrice)}`,
    apply,
  };
};
