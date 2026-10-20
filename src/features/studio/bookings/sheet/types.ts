import type { BookingStep, StudioState } from "../../core/types";

export type StatusMenuKind =
  "awaiting" | "autoCancelled" | "upcoming" | "arrived";

export type ReceivedTone = "paid" | "quiet" | "failed";

export interface AddonLine {
  key: string;
  label: string;
  value: string;
  amount: number;
}

export interface ReceivedLine {
  key: string;
  label: string;
  subtitle: string;
  value: string;
  tone: ReceivedTone;
}

export const CLOSED_STATUSES = [
  "cancelled",
  "completed",
  "noshow",
  "auto_cancelled",
  "expired",
];

export const CANCEL_STEP: Partial<StudioState> = {
  bookingStep: "cancel",
  cancelWho: "client",
  cancelFee: true,
  cancelReason: "",
};

export const RESCHEDULE_STEP: Partial<StudioState> = {
  bookingStep: "resched",
  rescheduleDay: null,
  rescheduleTime: null,
  rescheduleCustom: false,
};

export const OFF_MAIN_STEPS: BookingStep[] = [
  "done",
  "resched",
  "cancel",
  "editsvc",
  "changesvc",
  "addaddon",
  "changeclient",
  "payment",
];

export const SUB_STEPS: BookingStep[] = ["changesvc", "addaddon"];
