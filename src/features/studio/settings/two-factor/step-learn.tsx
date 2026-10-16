import type { TwoFactorView } from "./view";
import styles from "../../../../styles/features/studio/settings/two-factor/index.module.css";

interface StepLearnProps {
  view: TwoFactorView;
}

/** Why we collect tax details: HMRC platform reporting. */
export const StepLearn = ({ view }: StepLearnProps) => (
  <>
    <div className={styles.learn}>
      <p className={styles.para}>
        Since 1 January 2024, online platforms in the UK have to report what
        sellers earn through them to HMRC. Tiwára’s House counts as one of these
        platforms.
      </p>
      <div className={styles.reportBox}>
        <div className={styles.reportTitle}>Once a year, we report</div>
        <ul className={styles.reportList}>
          <li>Your legal name, date of birth and home address</li>
          <li>Your National Insurance number, or your company number</li>
          <li>What you earned through Tiwára’s House that year</li>
        </ul>
      </div>
      <p className={styles.para}>
        We send you a copy of what we share by 31 January. Reporting doesn’t
        change the tax you owe. You still declare your income to HMRC as you do
        now.
      </p>
    </div>
    <button className={styles.primary} onClick={view.learnGo}>
      {view.learnLabel}
    </button>
  </>
);
