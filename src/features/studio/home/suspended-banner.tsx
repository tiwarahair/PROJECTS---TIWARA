import { Ban } from "lucide-react";
import { getSupportMailto } from "../../../utils/support";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/home/gate.module.css";

interface SuspendedBannerProps {
  studio: StudioController;
}

export const SuspendedBanner = ({ studio }: SuspendedBannerProps) => {
  const { suspendReason: reason } = studio.state.account;

  return (
    <section
      className={styles.gate}
      role="status"
      data-screen-label="Suspended banner"
    >
      <span className={styles.gateIcon}>
        <Ban size={17} strokeWidth={1.7} />
      </span>
      <div className={styles.gateText}>
        <span className={styles.bold}>Your business is suspended</span> — your
        profile is hidden and clients can’t make new bookings. Bookings you
        already have carry on.{reason ? ` Our reason: “${reason}”` : ""}
      </div>
      <a
        className={styles.gateButton}
        href={getSupportMailto("My business is suspended")}
      >
        Contact us
      </a>
    </section>
  );
};
