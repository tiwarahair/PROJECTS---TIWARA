import type { CSSProperties } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { writeSession } from "../../../utils/page-flags";
import { SETUP_MINIMISED_KEY } from "../core/seed-account";
import type { StudioController } from "../core/use-studio";
import shared from "../../../styles/features/studio/shell/index.module.css";
import styles from "../../../styles/features/studio/shell/setup-card.module.css";
import { SETUP_COUNT, getSetupProgress, getSetupRows } from "./setup";

const setMinimised = ({ setState }: StudioController, isMinimised: boolean) => {
  writeSession(SETUP_MINIMISED_KEY, isMinimised ? "1" : null);
  setState({ setupMinimised: isMinimised });
};

export const SetupCard = ({ studio }: { studio: StudioController }) => {
  const { state } = studio;
  const { steps, doneCount, isComplete } = getSetupProgress(studio);

  // runtime: the progress bar's fill
  const progressStyle = {
    "--setup-frac": String(doneCount / SETUP_COUNT),
  } as CSSProperties;

  return (
    <div
      className={joinClassNames(
        shared.floatCard,
        state.setupExit === "out" ? styles.setupOut : shared.setupIn,
      )}
      role="region"
      aria-label="Set up your studio"
      data-screen-label="Setup checklist"
    >
      <div className={shared.cardHead}>
        <div className={shared.grow}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitle}>
              {isComplete ? "You’re ready for bookings" : "Set up your studio"}
            </div>
            <div
              className={styles.cardCount}
            >{`${doneCount} of ${SETUP_COUNT} done`}</div>
          </div>
          <div className={styles.cardSub}>
            Four steps and clients can book you.
          </div>
        </div>
        <button
          className={shared.cardClose}
          onClick={() => setMinimised(studio, true)}
          aria-label="Minimise checklist"
        >
          <ChevronDown size={18} strokeWidth={2} />
        </button>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressBar} style={progressStyle}></div>
      </div>
      <div className={styles.column}>
        {getSetupRows(studio).map(([key, label, subtitle, onSelect]) => {
          const isDone = !!steps[key];

          return (
            <button key={key} className={styles.setupRow} onClick={onSelect}>
              <span
                className={joinClassNames(
                  styles.tick,
                  isDone && styles.tickDone,
                  isDone && state.lastDone === key && styles.tickPop,
                )}
              >
                <Check
                  className={styles.tickMark}
                  size={11}
                  strokeWidth={3.2}
                />
              </span>
              <span
                className={joinClassNames(
                  styles.rowText,
                  isDone && styles.rowTextDone,
                )}
              >
                <span className={styles.rowLabel}>{label}</span>
                <span className={styles.rowSub}>{subtitle}</span>
              </span>
              <ChevronRight
                className={styles.noShrink}
                size={15}
                strokeWidth={1.7}
                color="rgba(246,240,228,.55)"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const SetupPill = ({ studio }: { studio: StudioController }) => (
  <button
    className={styles.setupPill}
    onClick={() => setMinimised(studio, false)}
    aria-label="Open setup checklist"
  >
    <span className={styles.pillCount}>
      {`${getSetupProgress(studio).doneCount}/${SETUP_COUNT}`}
    </span>
    <span>Finish setup</span>
  </button>
);
