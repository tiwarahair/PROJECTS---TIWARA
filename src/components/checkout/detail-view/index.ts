import type { CheckoutStatus } from "../data";
import type { CheckoutViewModel } from "../view";
import type { CheckoutController } from "../use-checkout";
import { BOOKING_DETAILS } from "./booking-statuses";
import { getContext } from "./context";
import type { DetailBuilder } from "./context";
import { NO_SHOW_DETAILS } from "./no-show-statuses";
import type { Detail } from "./types";

const DETAILS: Record<CheckoutStatus, DetailBuilder> = {
  ...BOOKING_DETAILS,
  ...NO_SHOW_DETAILS,
};

export const getDetailView = (
  checkout: CheckoutController,
  view: CheckoutViewModel,
): Detail => ({
  badges: [],
  panel: null,
  rows: [],
  total: { label: "", value: "" },
  links: [],
  actions: [],
  hasUndo: false,
  ...DETAILS[checkout.state.status](getContext(checkout, view)),
});
