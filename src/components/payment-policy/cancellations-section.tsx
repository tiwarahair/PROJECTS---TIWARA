import { FeeBlock } from "./fee-block";
import { Reveal, Select } from "./parts";
import type { PaymentPolicyController } from "./use-payment-policy";
import styles from "../../styles/components/payment-policy/cancellations-section.module.css";
import parts from "../../styles/components/payment-policy/parts.module.css";

const WINDOW_OPTIONS = (
  [
    [0.5, "30 mins"],
    [1, "1 hour"],
    [2, "2 hours"],
    [12, "12 hours"],
    [24, "24 hours"],
    [48, "48 hours"],
    [72, "72 hours"],
  ] as const
).map(([value, label]) => ({ value: String(value), label }));

const GRACE_OPTIONS = [0, 15, 20, 25, 30, 45, 60].map((minutes) => ({
  value: String(minutes),
  label: minutes ? `${minutes} min` : "None",
}));

export const CancellationsSection = ({
  policy: {
    uid,
    policy: {
      mode,
      deposit: depositInput,
      freeWindowHours,
      late,
      noShow,
      grace,
    },
    getError,
    getPercentInput,
    updateFee,
    setWindow,
    setGrace,
  },
}: {
  policy: PaymentPolicyController;
}) => {
  const deposit = parseInt(depositInput, 10);
  const depositText = String(isNaN(deposit) ? 0 : deposit);

  return (
    <section data-screen-label="Cancellations and no-shows">
      <h2 className={parts.heading}>Cancellations & no-shows</h2>
      <div className={styles.windowField}>
        <label className={parts.label} htmlFor={`${uid}-win`}>
          Free cancellation, and one reschedule, until
        </label>
        <div className={styles.windowRow}>
          <Select
            id={`${uid}-win`}
            value={String(freeWindowHours)}
            options={WINDOW_OPTIONS}
            onChange={setWindow}
            wrapClassName={styles.selectWrap}
          />
          <span className={parts.muted}>before the appointment</span>
        </div>
        <div className={styles.help}>
          Online rescheduling also closes at this point.
        </div>
      </div>

      <Reveal open={mode !== "none"}>
        <div className={styles.fees}>
          <FeeBlock
            label="Late cancellation fee"
            fee={late}
            mode={mode}
            depositText={depositText}
            error={getError("late")}
            percentInput={getPercentInput("late")}
            onUpdate={updateFee("late")}
          />
          <FeeBlock
            label="No-show fee"
            fee={noShow}
            mode={mode}
            depositText={depositText}
            error={getError("noShow")}
            percentInput={getPercentInput("noShow")}
            onUpdate={updateFee("noShow")}
          />
        </div>
      </Reveal>

      <div className={styles.graceField}>
        <label className={parts.label} htmlFor={`${uid}-gr`}>
          Grace period before no-show
        </label>
        <Select
          id={`${uid}-gr`}
          value={String(grace)}
          options={GRACE_OPTIONS}
          onChange={setGrace}
          wrapClassName={styles.graceSelectWrap}
        />
        {!!grace && (
          <div className={styles.help}>
            {`You can mark a no-show ${grace} minutes after the start time. It’s always optional.`}
          </div>
        )}
      </div>
    </section>
  );
};
