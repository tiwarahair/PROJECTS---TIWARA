import { Check, ChevronRight } from "lucide-react";
import {
  formatServiceDuration,
  getFromWithFee,
  getMenu,
} from "../../utils/services";
import { joinClassNames } from "../../utils/class-names";
import step from "../../styles/features/booking/step.module.css";
import styles from "../../styles/features/booking/step-service.module.css";
import type { BookingController } from "./hooks/use-booking";
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
                    <Check
                      size={17}
                      strokeWidth={2.4}
                      color="var(--accent-700)"
                    />
                  ) : (
                    <ChevronRight size={16} strokeWidth={2} />
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
