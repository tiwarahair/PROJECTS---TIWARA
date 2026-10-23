import { useLayoutEffect } from "react";
import { WelcomeToast } from "../../components/welcome-toast";
import type { PublicStylist } from "../../lib/public-stylist";
import { joinClassNames } from "../../utils/class-names";
import { BookingConfirmation } from "./confirmation";
import { BookingCrumbs } from "./crumbs";
import { BookingDialogs } from "./dialogs";
import { LoginDialog } from "./login-dialog";
import pageGlobal from "../../styles/features/booking/page-global.module.css";
import { BookingNav } from "./nav";
import styles from "../../styles/features/booking/page.module.css";
import { BookingSummary } from "./summary";
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
import { useBooking } from "./hooks/use-booking";

const STEP_VIEWS = {
  1: StepService,
  2: StepCustomise,
  3: StepTime,
  4: StepDetails,
  5: StepReview,
  6: StepPay,
} as const;

interface BookingFlowProps {
  publicStylist: PublicStylist;
}

export const BookingFlow = ({ publicStylist }: BookingFlowProps) => {
  const booking = useBooking(publicStylist);
  const { state, stylist, holdOn, holdLeftMs, actions } = booking;
  const { step, confirmed } = state;
  const StepView = STEP_VIEWS[step as keyof typeof STEP_VIEWS];

  // page-wide rules (16px inputs on mobile, focus borders, overflow) apply while Booking is mounted
  useLayoutEffect(() => {
    document.documentElement.classList.add("booking-page");

    return () => document.documentElement.classList.remove("booking-page");
  }, []);

  return (
    <div
      data-screen-label="Booking"
      className={joinClassNames(pageGlobal.bkpage, styles.page)}
    >
      <BookingNav
        exitHref={`/${stylist.id}`}
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
            <div className={joinClassNames(pageGlobal.bkgrid, styles.grid)}>
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
      {!!state.loginStart && (
        <LoginDialog key={state.loginStart} booking={booking} />
      )}
      {state.sizeGuide && (
        <SizeGuide onClose={() => actions.setState({ sizeGuide: false })} />
      )}
      <WelcomeToast />
    </div>
  );
};
