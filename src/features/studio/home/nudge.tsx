import { X } from "lucide-react";
import { markPolicyNudged } from "../../../lib/studio-api/home";
import type { StudioState } from "../core/types";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/home/nudge.module.css";
import shared from "../../../styles/features/studio/home/index.module.css";

interface PolicyNudgeProps {
  studio: StudioController;
}

export const closePolicyNudge = ({
  state,
  setState,
  context,
}: StudioController) => {
  const { stylistId } = state.account;

  setState({ nudge: false, policyReminder: false });

  if (stylistId)
    context.sync.save(
      () => markPolicyNudged(stylistId, state.policyReminder),
      {},
    );
};

export const isPolicyNudgeShown = (
  { linkCard, setupExit, nudge }: StudioState,
  isComplete: boolean,
) => isComplete && !linkCard && !setupExit && nudge;

export const PolicyNudge = ({ studio }: PolicyNudgeProps) => (
  <section className={styles.nudge} data-screen-label="Policy nudge">
    <div className={styles.nudgeHead}>
      <div className={shared.grow}>
        <div className={styles.nudgeTitle}>Make your policy your own</div>
        <div className={styles.nudgeBody}>
          You can take bookings now. Until you set a booking policy, clients
          book without a deposit or card, and can cancel at any time.
        </div>
      </div>
      <button
        className={styles.nudgeClose}
        onClick={() => closePolicyNudge(studio)}
        aria-label="Dismiss"
      >
        <X size={15} strokeWidth={1.8} />
      </button>
    </div>
    <div className={styles.nudgeActions}>
      <button
        className={styles.nudgeButton}
        onClick={() => studio.actions.openSubpage("policy")}
      >
        Payment policy
      </button>
    </div>
  </section>
);
