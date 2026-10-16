// The booking so far, kept in localStorage (tw_bk_draft_<stylist>) for a day.
import { DRAFT_TTL_MS } from "./constants";
import type { BookingDraft, BookingState } from "./types";

const getDraftKey = (stylistId: string): string => `tw_bk_draft_${stylistId}`;

export const clearDraft = (stylistId: string): void => {
  try {
    localStorage.removeItem(getDraftKey(stylistId));
  } catch {
    // storage unavailable
  }
};

export const readDraft = (stylistId: string): BookingDraft | null => {
  try {
    const draft = JSON.parse(
      localStorage.getItem(getDraftKey(stylistId)) || "null",
    ) as BookingDraft | null;

    if (!draft || !draft.serviceId) return null;

    if (Date.now() - draft.at > DRAFT_TTL_MS) {
      clearDraft(stylistId);

      return null;
    }

    return draft;
  } catch {
    return null;
  }
};

/** Saves the booking so far (no card, photos or allergy text); boards, no service or confirmed never save. */
export const saveDraft = (state: BookingState): void => {
  const { board, serviceId, confirmed, hold } = state;

  if (board || !serviceId || confirmed) return;

  const draft: BookingDraft = {
    at: Date.now(),
    step: state.step,
    serviceId,
    selection: state.selection,
    calendarMonth: state.calendarMonth,
    calendarYear: state.calendarYear,
    date: state.date,
    time: state.time,
    details: state.details,
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

/** Restores a draft; a past or released time sends the client back to Time ("Pick your time again"). */
export const getDraftPatch = (
  draft: BookingDraft,
  state: BookingState,
): Partial<BookingState> => {
  const { calendarYear, calendarMonth, date, time, step, holdUntil } = draft;
  const now = Date.now();
  const [hours = 0, minutes = 0] = (time ?? "").split(":").map(Number);

  const past =
    !!(date && time) &&
    new Date(calendarYear, calendarMonth, date, hours, minutes).getTime() < now;

  const holdOk = !!holdUntil && holdUntil > now;
  const repick = !!time && (past || !holdOk);

  return {
    serviceId: draft.serviceId,
    selection: draft.selection,
    step: repick ? Math.min(step, 3) : step,
    calendarMonth,
    calendarYear,
    date: past ? null : date,
    time: repick ? null : time,
    details: { ...state.details, ...draft.details },
    guest: draft.guest ?? !!(draft.details.first || draft.details.email),
    appointmentAddress: {
      ...state.appointmentAddress,
      ...draft.appointmentAddress,
    },
    hold:
      holdOk && !repick
        ? {
            id: draft.holdId ?? "",
            secret: draft.holdSecret ?? "",
            until: holdUntil,
          }
        : null,
    resumeDraft: null,
    repickNote: repick && step >= 3,
  };
};
