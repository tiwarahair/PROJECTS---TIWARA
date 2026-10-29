import { useFormState } from "react-hook-form";
import { joinClassNames } from "../../utils/class-names";
import { getViewAnimation } from "./motion";
import { Chip } from "./controls";
import type { CheckoutController } from "./use-checkout";
import styles from "../../styles/components/checkout/resend.module.css";
import shared from "../../styles/components/checkout/index.module.css";

export const CheckoutResend = ({
  checkout: { state, booking, resendForm, startResend },
}: {
  checkout: CheckoutController;
}) => {
  const { errors } = useFormState({ control: resendForm.control });
  const error = errors.to?.message;

  return (
    <div
      className={joinClassNames(
        shared.viewGap18,
        shared.motion,
        getViewAnimation(state.direction),
      )}
      data-ck-m="1"
    >
      <div className={styles.resendIntro}>
        {`Send ${booking.first} a copy of the receipt for ${booking.day}, ${booking.time}.`}
      </div>
      <div className={shared.chipRow}>
        {(
          [
            ["email", "Email"],
            ["sms", "SMS"],
          ] as const
        ).map(([via, label]) => (
          <Chip
            key={via}
            isOn={state.resendVia === via}
            className={styles.resendChip}
            onPick={() => startResend(via)}
          >
            {label}
          </Chip>
        ))}
      </div>
      <label className={shared.field}>
        <span className={shared.fieldLabel}>
          {state.resendVia === "email" ? "Email address" : "Mobile number"}
        </span>
        <input
          className={joinClassNames(
            styles.resendInput,
            error ? shared.borderErr : shared.borderOk,
          )}
          type={state.resendVia === "email" ? "email" : "tel"}
          {...resendForm.register("to")}
        />
        {!!error && (
          <span className={shared.fieldError} role="alert">
            {error}
          </span>
        )}
        <span className={shared.note13}>
          {`Edit it to send this receipt somewhere else. ${booking.first}’s profile isn’t changed.`}
        </span>
      </label>
    </div>
  );
};
