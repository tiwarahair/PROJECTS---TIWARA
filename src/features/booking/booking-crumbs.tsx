import { Fragment } from "react";
import { joinClassNames } from "../../utils/class-names";
import helmet from "./booking-helmet.module.css";
import styles from "./booking-crumbs.module.css";
import type { BookingController } from "./use-booking";

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
      className={joinClassNames(helmet.bkcrumbs, styles.crumbs)}
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
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--neutral-400)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m9 5 7 7-7 7"></path>
            </svg>
          )}
        </Fragment>
      ))}
    </div>
  );
};
