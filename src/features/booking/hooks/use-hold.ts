import { useMemo } from "react";
import type { BookingChoices } from "../../../lib/booking-api";
import {
  hasErrorMessage,
  useGetAvailableSlotsQuery,
  useHoldBookingMutation,
} from "../../../stores/api-slice";
import { getMonthRange, groupSlotsByDay } from "../logic/slots";
import type { BookingState } from "../logic/types";
import type { FlowState } from "./use-flow-state";

interface HoldOptions {
  flow: FlowState;
  choices: BookingChoices;
  /** The service is picked and its options are complete, so the server knows the length. */
  canListTimes: boolean;
}

/** The month's open times and holding the chosen one on the server. */
export const useHold = ({ flow, choices, canListTimes }: HoldOptions) => {
  const { state, setState, scrollToTitle } = flow;

  const slots = useGetAvailableSlotsQuery(
    {
      serviceId: state.serviceId,
      choices,
      ...getMonthRange(state.calendarYear, state.calendarMonth),
      ...(state.hold?.id ? { ownHold: state.hold.id } : {}),
    },
    { skip: state.step !== 3 || !canListTimes },
  );

  const slotsByDay = useMemo(
    () => groupSlotsByDay(slots.currentData ?? []),
    [slots.currentData],
  );

  const [holdTime] = useHoldBookingMutation();

  /** Holds the chosen time on the server (dev boards fake it); null when it couldn't be held. */
  const holdChosenTime = async (): Promise<Partial<BookingState> | null> => {
    if (state.board)
      return {
        hold: state.hold ?? {
          id: "",
          secret: "",
          until: Date.now() + state.holdSeconds * 1000,
        },
      };

    const startsAt = slotsByDay
      .get(state.date ?? 0)
      ?.find(({ time }) => time === state.time)?.startsAt;

    // a time missing from the loaded list (a resumed booking's, say) has gone since
    if (!startsAt) {
      setState({ holdError: "taken", time: null });

      return null;
    }

    setState({ holding: true, holdError: null });

    try {
      const held = await holdTime({
        serviceId: state.serviceId,
        choices,
        startsAt,
        // picking again moves the same hold
        ...(state.hold?.id
          ? { hold: { id: state.hold.id, secret: state.hold.secret } }
          : {}),
      }).unwrap();

      return {
        holding: false,
        hold: {
          id: held.id,
          secret: held.secret,
          until: Date.parse(held.hold_expires_at),
        },
      };
    } catch (error) {
      const isTaken = hasErrorMessage(error, "slot_taken");

      setState({
        holding: false,
        holdError: isTaken ? "taken" : "failed",
        ...(isTaken ? { time: null } : {}),
      });

      return null;
    }
  };

  const actions = {
    pickAgain: () =>
      setState(
        {
          holdExpired: false,
          hold: null,
          time: null,
          step: 3,
          repickNote: false,
          payError: "",
          payKind: "",
        },
        scrollToTitle,
      ),
    pickAnother: () =>
      setState(
        {
          step: 3,
          time: null,
          hold: null,
          payError: "",
          payKind: "",
          taken: false,
        },
        scrollToTitle,
      ),
  };

  return {
    slotsByDay,
    isLoadingSlots: slots.isFetching,
    holdChosenTime,
    holdOn: !!state.hold && !!state.time && !state.confirmed,
    holdLeftMs: state.hold ? Math.max(0, state.hold.until - Date.now()) : 0,
    actions,
  };
};
