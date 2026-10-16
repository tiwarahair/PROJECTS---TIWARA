import { Lock } from "lucide-react";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/home/gate.module.css";

interface GoLiveBannerProps {
  studio: StudioController;
}

export const GoLiveBanner = ({ studio }: GoLiveBannerProps) => (
  <section
    className={styles.gate}
    role="status"
    data-screen-label="Go-live banner"
  >
    <span className={styles.gateIcon}>
      <Lock size={17} strokeWidth={1.7} />
    </span>
    <div className={styles.gateText}>
      <span className={styles.bold}>Finish setup to go live</span> — your
      booking link and payouts are off until you turn on two-step verification,
      add your tax details and connect Stripe.
    </div>
    <button
      className={styles.gateButton}
      onClick={() => studio.actions.openTwoFactor("secure")}
    >
      Continue setup
    </button>
  </section>
);
