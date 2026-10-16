import { ArrowLeft, ArrowRight, Check, CircleAlert, Lock } from "lucide-react";
import type { ChangeEvent } from "react";
import { joinClassNames } from "../../utils/class-names";
import { AppleIcon, GoogleIcon } from "./brand-icons";
import { getPayIntro, getPaySubtitle } from "./booking-content";
import {
  formatCardNumber,
  formatExpiry,
  getCardBrand,
  getCardError,
  getCvcLabel,
} from "./booking-details";
import type { PayFields } from "./booking-state";
import fields from "../../styles/features/booking/booking-fields.module.css";
import step from "../../styles/features/booking/booking-step.module.css";
import styles from "../../styles/features/booking/step-pay.module.css";
import { TurnstileFallback } from "./turnstile-fallback";
import type { BookingController } from "./use-booking";

const getPayButtonClass = (paying: boolean, turnstileBlocking: boolean) => {
  if (paying) return styles.payButtonPaying;

  return turnstileBlocking ? styles.payButtonBlocked : styles.payButtonReady;
};

interface StepPayProps {
  booking: BookingController;
}

/** Step 6 (Pay): Apple / Google Pay, card fields, saved-card note, errors, the Turnstile fallback and Pay & confirm. */
export const StepPay = ({ booking }: StepPayProps) => {
  const {
    state,
    stylist,
    money,
    showTurnstile,
    turnstileBlocking,
    payDisabled,
    actions,
  } = booking;

  const { setState } = actions;
  const { pay, paying, payError } = state;
  const { policy } = money;

  // every card edit clears the last payment error
  const setPay =
    (key: keyof PayFields, clean: (value: string) => string) =>
    (event: ChangeEvent<HTMLInputElement>) =>
      setState({
        pay: { ...pay, [key]: clean(event.target.value) },
        payError: "",
      });

  const payNow = () => {
    if (payDisabled) return;

    const error = getCardError(pay);

    if (error) {
      setState({ payError: error });

      return;
    }

    actions.attemptPay(pay.number.replace(/\D/g, ""));
  };

  return (
    <>
      <h1 className={step.title}>{`Pay ${money.dueToday} today`}</h1>
      <p className={styles.intro}>
        {getPayIntro(policy.mode, stylist.policies.depositPercent)}
      </p>
      <div className={styles.form}>
        <div className={styles.quickCheckout}>Quick checkout</div>
        <button
          onClick={() => actions.openWallet("Apple Pay")}
          disabled={payDisabled}
          aria-label="Pay with Apple Pay"
          className={styles.applePay}
        >
          <AppleIcon size={19} />
          Pay
        </button>
        <button
          onClick={() => actions.openWallet("Google Pay")}
          disabled={payDisabled}
          aria-label="Pay with Google Pay"
          className={styles.googlePay}
        >
          <GoogleIcon size={18} />
          Pay
        </button>
        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          or pay by card
          <span className={styles.dividerLine}></span>
        </div>
        <label className={fields.field}>
          <span className={fields.label}>Card number</span>
          <span className={styles.cardWrap}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={pay.number}
              onChange={setPay("number", formatCardNumber)}
              className={styles.cardInput}
            />
            <span className={styles.cardBrand}>{getCardBrand(pay.number)}</span>
          </span>
        </label>
        <div className={styles.pair}>
          <label className={styles.pairField}>
            <span className={fields.label}>Expiry</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              value={pay.expiry}
              onChange={setPay("expiry", formatExpiry)}
              className={styles.input}
            />
          </label>
          <label className={styles.pairField}>
            <span className={fields.label}>Security code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={getCvcLabel(pay.number)}
              value={pay.cvc}
              onChange={setPay("cvc", (value) =>
                value.replace(/\D/g, "").slice(0, 4),
              )}
              className={styles.input}
            />
          </label>
        </div>
        <label className={fields.field}>
          <span className={fields.label}>Name on card</span>
          <input
            type="text"
            autoComplete="cc-name"
            value={pay.name}
            onChange={setPay("name", (value) => value)}
            className={styles.input}
          />
        </label>
        <label className={fields.field}>
          <span className={fields.label}>Billing postcode</span>
          <input
            type="text"
            autoComplete="postal-code"
            value={pay.postcode}
            onChange={setPay("postcode", (value) => value.toUpperCase())}
            className={styles.input}
          />
        </label>
        {policy.cardSaved && (
          <div data-screen-label="Card saved line" className={styles.savedLine}>
            <Lock size={15} strokeWidth={1.5} className={styles.savedIcon} />
            <span>
              {`Your card is saved securely for this booking's balance and any fees under ${stylist.name}'s policy.`}
            </span>
          </div>
        )}
        {state.loggedIn && (
          <button
            role="checkbox"
            aria-checked={pay.future ? "true" : "false"}
            onClick={() => setState({ pay: { ...pay, future: !pay.future } })}
            className={styles.future}
          >
            <span
              className={joinClassNames(
                styles.futureBox,
                pay.future ? styles.futureBoxOn : styles.futureBoxOff,
              )}
            >
              {pay.future && (
                <Check size={11} strokeWidth={3} color="#fffefb" />
              )}
            </span>{" "}
            Also save this card for future bookings
          </button>
        )}
        <div aria-live="assertive">
          {!!payError && (
            <div
              data-screen-label="Payment error"
              role="alert"
              className={styles.error}
            >
              <CircleAlert
                size={16}
                strokeWidth={1.7}
                className={styles.errorIcon}
              />
              <span className={styles.errorBody}>
                <span>{payError}</span>
                {state.payKind === "taken" && (
                  <button
                    onClick={actions.pickAnother}
                    className={styles.pickAnother}
                  >
                    Pick another time
                  </button>
                )}
              </span>
            </div>
          )}
        </div>
        {showTurnstile && <TurnstileFallback booking={booking} />}
        <div
          className={joinClassNames(
            styles.payRow,
            showTurnstile ? styles.payRowTight : styles.payRowLoose,
          )}
        >
          <button
            onClick={actions.goBack}
            aria-label="Back"
            className={styles.back}
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <button
            onClick={payNow}
            disabled={payDisabled}
            className={joinClassNames(
              styles.payButton,
              getPayButtonClass(paying, turnstileBlocking),
              turnstileBlocking && styles.payButtonBlockedText,
              payDisabled && styles.payButtonDisabled,
            )}
          >
            {paying ? "Confirming…" : `Pay ${money.dueToday} & confirm`}{" "}
            <ArrowRight size={17} strokeWidth={2} />
          </button>
        </div>
        <div data-screen-label="Pay sub-line" className={styles.paySub}>
          {getPaySubtitle(
            policy.mode,
            money.balance,
            money.price,
            stylist.name,
          )}
        </div>
        <div className={styles.encrypted}>
          <Lock size={12} strokeWidth={2} /> Encrypted and processed by Stripe.
          We never see your card details.
        </div>
      </div>
    </>
  );
};
