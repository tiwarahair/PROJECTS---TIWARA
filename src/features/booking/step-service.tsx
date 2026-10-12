import {
  formatServiceDuration,
  getFromWithFee,
  getMenu,
} from "../../utils/services";
import { joinClassNames } from "../../utils/class-names";
import step from "../../styles/features/booking/booking-step.module.css";
import styles from "../../styles/features/booking/step-service.module.css";
import type { BookingController } from "./use-booking";
import { formatMoney } from "../../utils/money";

interface StepServiceProps {
  booking: BookingController;
}

/** Step 1: every active service, grouped by the stylist's categories. */
export const StepService = ({ booking }: StepServiceProps) => {
  const { state, stylist, actions } = booking;

  return (
    <>
      <h1 className={step.title}>Pick a service</h1>
      <p className={step.lead}>
        {`Everything ${stylist.name} offers, grouped by category.`}
      </p>
      {getMenu(stylist).map(({ id: groupId, name: groupName, items }) => (
        <div key={groupId} className={styles.group}>
          {!!groupName && <div className={styles.groupName}>{groupName}</div>}
          {items.map((service) => {
            const { id, name, minutes } = service;
            const chosen = state.serviceId === id;

            return (
              <button
                key={id}
                onClick={() => actions.pickService(id)}
                className={joinClassNames(
                  styles.row,
                  chosen ? styles.rowChosen : styles.rowIdle,
                )}
              >
                <span>
                  <span className={styles.name}>{name}</span>
                  <span className={styles.meta}>
                    {formatServiceDuration(minutes)}
                  </span>
                </span>
                <span className={styles.price}>
                  {`from ${formatMoney(getFromWithFee(service))}`}{" "}
                  {chosen ? (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent-700)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12.5l5 5L20 6.5"></path>
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="m9 5 7 7-7 7"></path>
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
};
