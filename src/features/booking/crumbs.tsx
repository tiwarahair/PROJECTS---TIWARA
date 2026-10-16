import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { joinClassNames } from "../../utils/class-names";
import pageGlobal from "../../styles/features/booking/page-global.module.css";
import styles from "../../styles/features/booking/crumbs.module.css";
import type { BookingController } from "./hooks/use-booking";

interface BookingCrumbsProps {
  booking: BookingController;
}

const getCrumbStateClass = (stepNumber: number, current: number) => {
  if (stepNumber === current) return styles.crumbCurrent;

  return stepNumber < current ? styles.crumbDone : styles.crumbAhead;
};

/** Service › Customise › Time › Details › Review › Pay; steps up to the current one are clickable. */
export const BookingCrumbs = ({ booking }: BookingCrumbsProps) => {
  const { state, steps, crumbsRef, actions } = booking;

  return (
    <div
      ref={crumbsRef}
      className={joinClassNames(pageGlobal.bkcrumbs, styles.crumbs)}
    >
      {steps.map(({ stepNumber, label }, index) => (
        <Fragment key={stepNumber}>
          <button
            onClick={() => {
              if (stepNumber <= state.step) actions.goToStep(stepNumber);
            }}
            className={joinClassNames(
              styles.crumb,
              stepNumber <= state.step
                ? styles.crumbReachable
                : styles.crumbLocked,
              getCrumbStateClass(stepNumber, state.step),
            )}
          >
            {label}
          </button>
          {index < steps.length - 1 && (
            <ChevronRight
              size={13}
              strokeWidth={2}
              color="var(--neutral-400)"
            />
          )}
        </Fragment>
      ))}
    </div>
  );
};
