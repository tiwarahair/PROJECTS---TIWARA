// The booking so far, kept in localStorage (tw_bk_draft_<stylist>) for a day.
import { DRAFT_TTL_MS } from "./constants";
import type { BookingDraft, BookingState } from "./types";

const getDraftKey = (stylistId: string): string => `tw_bk_draft_${stylistId}`;

export const readDraft = (stylistId: string): BookingDraft | null => {
  try {
    const draft = JSON.parse(
      localStorage.getItem(getDraftKey(stylistId)) || "null",
    ) as BookingDraft | null;

    if (!draft || !draft.serviceId) return null;

    if (Date.now() - draft.at > DRAFT_TTL_MS) {
      localStorage.removeItem(getDraftKey(stylistId));

      return null;
    }

    return draft;
  } catch {
    return null;
  }
};

/** Saves the booking so far (no card, photos or allergy text); boards, no service or confirmed never save. */
export const saveDraft = (state: BookingState): void => {
  const { board, serviceId, confirmed, details, hold } = state;

  if (board || !serviceId || confirmed) return;

  const { first, last, email, phone, notes } = details;

  const draft: BookingDraft = {
    at: Date.now(),
    step: state.step,
    serviceId,
    selection: state.selection,
    calendarMonth: state.calendarMonth,
    calendarYear: state.calendarYear,
    date: state.date,
    time: state.time,
    details: { first, last, email, phone, notes },
    appointmentAddress: state.appointmentAddress,
    holdUntil: hold ? hold.until : null,
    holdId: hold?.id,
    holdSecret: hold?.secret,
    guest: state.guest,
  };

  try {
    localStorage.setItem(getDraftKey(state.id), JSON.stringify(draft));
  } catch {
    // storage unavailable
  }
};

export const clearDraft = (stylistId: string): void => {
  try {
    localStorage.removeItem(getDraftKey(stylistId));
  } catch {
    // storage unavailable
  }
};

/** Restores a draft; a past or released time sends the client back to Time ("Pick your time again"). */
export const getDraftPatch = (
  draft: BookingDraft,
  state: BookingState,
): Partial<BookingState> => {
  const now = Date.now();
  let past = false;

  if (draft.date && draft.time) {
    const [hours = 0, minutes = 0] = draft.time.split(":").map(Number);

    past =
      new Date(
        draft.calendarYear,
        draft.calendarMonth,
        draft.date,
        hours,
        minutes,
      ).getTime() < now;
  }

  const holdOk = !!(draft.holdUntil && draft.holdUntil > now);

  const patch: Partial<BookingState> = {
    serviceId: draft.serviceId,
    selection: draft.selection,
    step: draft.step,
    calendarMonth: draft.calendarMonth,
    calendarYear: draft.calendarYear,
    date: draft.date,
    time: draft.time,
    details: { ...state.details, ...draft.details },
    guest: draft.guest ?? !!(draft.details.first || draft.details.email),
    appointmentAddress: {
      ...state.appointmentAddress,
      ...draft.appointmentAddress,
    },
    hold:
      holdOk && draft.holdUntil
        ? {
            id: draft.holdId ?? "",
            secret: draft.holdSecret ?? "",
            until: draft.holdUntil,
          }
        : null,
    resumeDraft: null,
    repickNote: false,
  };

  if (draft.time && (past || !holdOk)) {
    Object.assign(patch, {
      step: Math.min(draft.step, 3),
      time: null,
      hold: null,
      repickNote: draft.step >= 3,
    });

    if (past) patch.date = null;
  }

  return patch;
};
