import { hhmm, parseNumber } from "../../core/format";
import { formatDuration } from "../../../../utils/dates";
import type { EditContext } from "./context";

export const getApplyView = ({
  state,
  setState,
  actions,
  memo,
  booking,
  patchBooking,
  draft,
  duration,
  extra,
  clashes,
  addonsPrice,
  addonsMinutes,
}: EditContext) => {
  const totalPrice = parseNumber(draft.price) + addonsPrice;
  const firstClash = clashes[0];

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

    patchBooking({
      price: totalPrice,
      duration: formatDuration(duration),
      time: hhmm(draft.time),
      priceReason: (draft.priceReason || "").trim(),
    });

    const list = state.bookings.map((item) =>
      item.id === booking.id
        ? { ...item, service: draft.serviceName, addons: draft.addons.slice() }
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

      actions.showToast(`Service updated. ${booking.firstName} is notified`);
      window.setTimeout(() => setState({ bookingStepBack: false }), 700);
    }, 200);
  };

  memo.applyEdit = apply;

  return {
    totalLabel: `${formatDuration(duration + extra + addonsMinutes)}  £${totalPrice}`,
    apply,
  };
};
