import { Check } from "lucide-react";
import type { StudioController } from "../../core/use-studio";
import styles from "../../../../styles/features/studio/settings/payouts/stripe-sheet.module.css";

export const StripeSheet = ({ studio }: { studio: StudioController }) => {
  const { state, actions } = studio;

  return (
    <>
      <div className={styles.stripeCard}>
        <div className={styles.title15}>Get paid with Stripe</div>
        <div className={styles.stripeBody}>
          Stripe verifies your identity and links your bank account. Deposits
          and payments land there automatically; payouts are sent daily and
          usually reach your bank in about 3 working days.
        </div>
        <div className={styles.bullets}>
          <div className={styles.bullet}>
            <span className={styles.bulletDot}></span>Bank account for payouts
          </div>
          <div className={styles.bullet}>
            <span className={styles.bulletDot}></span>Photo ID for identity
            checks
          </div>
        </div>
      </div>
      <div className={styles.filled}>
        <Check className={styles.noShrink} size={15} strokeWidth={1.7} />
        We’ve filled in your details for you.
      </div>
      <button
        className={styles.stripeButton}
        onClick={() => void actions.startStripe()}
        disabled={state.stripeBusy}
      >
        {state.stripeBusy && <span className={styles.spinner}></span>}
        {state.stripeBusy ? "Connecting" : "Continue with Stripe"}
      </button>
    </>
  );
};
