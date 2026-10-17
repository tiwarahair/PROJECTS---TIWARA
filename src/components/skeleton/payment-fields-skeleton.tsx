import Skeleton from "react-loading-skeleton";
import styles from "../../styles/components/skeleton/payment-fields-skeleton.module.css";

/** Stripe's card fields (number, expiry and code, country) while its form loads. */
export const PaymentFieldsSkeleton = () => (
  <div
    aria-hidden="true"
    data-testid="payment-skeleton"
    className={styles.fields}
  >
    <div>
      <Skeleton width={96} height={12} />
      <Skeleton height={48} borderRadius={12} className={styles.input} />
    </div>
    <div className={styles.row}>
      <div>
        <Skeleton width={80} height={12} />
        <Skeleton height={48} borderRadius={12} className={styles.input} />
      </div>
      <div>
        <Skeleton width={90} height={12} />
        <Skeleton height={48} borderRadius={12} className={styles.input} />
      </div>
    </div>
    <div>
      <Skeleton width={120} height={12} />
      <Skeleton height={48} borderRadius={12} className={styles.input} />
    </div>
  </div>
);
