import { useLayoutEffect } from "react";
import { WelcomeToast } from "../../components/welcome-toast/welcome-toast";
import { joinClassNames } from "../../utils/class-names";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingCrumbs } from "./booking-crumbs";
import { BookingDialogs } from "./booking-dialogs";
import helmet from "../../styles/features/booking/booking-helmet.module.css";
import { BookingNav } from "./booking-nav";
import styles from "../../styles/features/booking/booking-page.module.css";
import { BookingSummary } from "./booking-summary";
import { HoldBar } from "./hold-bar";
import { MobileSummary } from "./mobile-summary";
import { ResumeBanner } from "./resume-banner";
import { SizeGuide } from "./size-guide";
import { StepCustomise } from "./step-customise";
import { StepDetails } from "./step-details";
import { StepNav } from "./step-nav";
import { StepPay } from "./step-pay";
import { StepReview } from "./step-review";
import { StepService } from "./step-service";
import { StepTime } from "./step-time";
import { useBooking } from "./use-booking";

const STEP_VIEWS = {
  1: StepService,
  2: StepCustomise,
  3: StepTime,
  4: StepDetails,
  5: StepReview,
  6: StepPay,
} as const;

/** The 6-step booking flow and its confirmation, route "/book". */
export const BookingPage = () => {
  const booking = useBooking();
  const { state, stylist, holdOn, holdLeftMs, actions } = booking;
  const { step, confirmed } = state;
  const StepView = STEP_VIEWS[step as keyof typeof STEP_VIEWS];

  // page-wide helmet rules (16px inputs on mobile, focus borders, overflow) apply while Booking is mounted
  useLayoutEffect(() => {
    document.documentElement.classList.add("booking-page");

    return () => document.documentElement.classList.remove("booking-page");
  }, []);

  return (
    <div
      data-screen-label="Booking"
      className={joinClassNames(helmet.bkpage, styles.page)}
    >
      <BookingNav
        exitHref={`/stylist?stylist=${stylist.id}`}
        onLeaveLink={actions.onLeaveLink}
        holdBar={
          holdOn && (
            <HoldBar variant="nav" time={state.time} leftMs={holdLeftMs} />
          )
        }
      />
      {confirmed && <BookingConfirmation booking={booking} />}
      {!confirmed && (
        <>
          <div className={styles.content}>
            {!!state.resumeDraft && <ResumeBanner booking={booking} />}
            <BookingCrumbs booking={booking} />
            <div className={joinClassNames(helmet.bkgrid, styles.grid)}>
              <div className={styles.main}>
                {StepView && <StepView booking={booking} />}
                <StepNav booking={booking} />
              </div>
              <BookingSummary booking={booking} />
            </div>
          </div>
          {step >= 2 && step < 6 && <MobileSummary booking={booking} />}
        </>
      )}
      <BookingDialogs booking={booking} />
      {state.sizeGuide && (
        <SizeGuide onClose={() => actions.setState({ sizeGuide: false })} />
      )}
      <WelcomeToast />
    </div>
  );
};
