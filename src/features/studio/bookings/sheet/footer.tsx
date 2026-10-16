import { ChevronRight, EllipsisVertical } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import { getEditServiceView } from "../edit-view";
import { NoShowPanel } from "../steps";
import { RESCHEDULE_STEP } from "./types";
import type { BookingSheetView } from "./view";
import sheet from "../../../../styles/features/studio/shell/sheet-frame.module.css";

interface BookingSheetAfterProps {
  studio: StudioController;
  view: BookingSheetView;
}

/** Panels and footers under the booking sheet's body. */
export const BookingSheetAfter = ({ studio, view }: BookingSheetAfterProps) => {
  const { state } = studio;
  const { booking } = view;
  const step = state.bookingStep;

  const edit =
    step === "editsvc"
      ? getEditServiceView(studio, booking, view.patchBooking)
      : null;

  const runStep = () => {
    const getRun = () => {
      if (step === "cancel") return view.cancel;

      if (step === "editsvc") return edit?.apply;

      return view.reschedule;
    };

    const run = getRun();

    run?.();
  };

  const getGoLabel = () => {
    if (step === "cancel") return "Cancel booking";

    if (step === "editsvc") return "Apply";

    return "Move booking";
  };

  const isFooterOff = step === "resched" && !view.canMove;

  return (
    <>
      {step === "noshow" && <NoShowPanel studio={studio} view={view} />}
      {step === "view" && (
        <div className={joinClassNames(sheet.footer, sheet.footerTall)}>
          <div className={sheet.totals}>
            <div className={sheet.totalLine}>
              <span>Total</span>
              <span className={sheet.numeric}>{booking.priceLabel}</span>
            </div>
            <div className={sheet.totalLine}>
              <span>Paid</span>
              <span className={sheet.numeric}>{booking.paidLabel}</span>
            </div>
            <button
              className={sheet.payRow}
              onClick={view.openPayment}
              aria-label="See payment breakdown"
            >
              <span className={sheet.payLabel}>
                {view.payRowLabel}
                <ChevronRight size={16} strokeWidth={1.7} />
              </span>
              <span className={sheet.amount}>{booking.dueLabel}</span>
            </button>
          </div>
          <div className={sheet.actions}>
            {view.hasMore && (
              <button
                className={sheet.more}
                onClick={view.more}
                aria-label="More actions"
              >
                <EllipsisVertical size={18} />
              </button>
            )}
            <button className={sheet.secondary} onClick={view.bookAgain}>
              Book again
            </button>
            {view.canCheckout && (
              <button className={sheet.primary} onClick={view.goCheckout}>
                Checkout
              </button>
            )}
          </div>
        </div>
      )}
      {(step === "resched" || step === "cancel" || step === "editsvc") && (
        <div className={sheet.footer}>
          {step === "editsvc" && edit && (
            <div className={sheet.totalBar}>
              <span className={sheet.h3}>Total</span>
              <span className={sheet.amount15}>{edit.totalLabel}</span>
            </div>
          )}
          <div className={sheet.row10}>
            {step === "cancel" && (
              <button
                className={sheet.reschedule}
                onClick={() => studio.setState(RESCHEDULE_STEP)}
              >
                Reschedule instead
              </button>
            )}
            <button
              className={joinClassNames(
                sheet.go,
                step === "cancel" && sheet.goEqual,
                isFooterOff && sheet.faded,
              )}
              onClick={runStep}
              disabled={isFooterOff}
            >
              {getGoLabel()}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
