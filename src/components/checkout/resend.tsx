import { useFormState } from "react-hook-form";
import { joinClassNames } from "../../utils/class-names";
import { getViewAnimation } from "./detail";
import type { CheckoutController } from "./use-checkout";
import styles from "../../styles/components/checkout/resend.module.css";
import shared from "../../styles/components/checkout/index.module.css";

export const CheckoutResend = ({
  checkout: { state, booking, resendForm },
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
      <label className={shared.field}>
        <span className={shared.fieldLabel}>Email address</span>
        <input
          className={joinClassNames(
            styles.resendInput,
            error ? shared.borderErr : shared.borderOk,
          )}
          type="email"
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
