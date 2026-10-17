import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { ArrowLeft, ArrowRight, Check, CircleAlert } from "lucide-react";
import { useState } from "react";
import { PaymentFieldsSkeleton } from "../../components/skeleton/payment-fields-skeleton";
import { stripePromise } from "../../lib/stripe";
import { joinClassNames } from "../../utils/class-names";
import { OnboardingTurnstile } from "../onboarding/onboarding-turnstile";
import { getPayIntro } from "./logic/content";
import {
  getPaymentAppearance,
  PAY_ERRORS,
  WALLET_BUTTON_HEIGHT,
  getPaymentFonts,
  toPence,
} from "./logic/payment";
import styles from "../../styles/features/booking/step-pay.module.css";
import step from "../../styles/features/booking/step.module.css";
import type { BookingController } from "./hooks/use-booking";

const getPayButtonClass = (paying: boolean, isBlocked: boolean) => {
  if (paying) return styles.payButtonPaying;

  return isBlocked ? styles.payButtonBlocked : styles.payButtonReady;
};

interface StepPayProps {
  booking: BookingController;
}

export const StepPay = ({ booking }: StepPayProps) => {
  const { state, money } = booking;

  const savesCard =
    money.policy.cardSaved || (state.loggedIn && state.keepCard);

  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: toPence(money.policy.dueToday),
        currency: "gbp",
        allowedPaymentMethodTypes: ["card"],
        setupFutureUsage: savesCard ? "off_session" : null,
        appearance: getPaymentAppearance(),
        fonts: getPaymentFonts(),
      }}
    >
      <PayForm booking={booking} />
    </Elements>
  );
};

const PayForm = ({ booking }: StepPayProps) => {
  const { state, stylist, money, pay, actions } = booking;
  const { setState } = actions;
  const { paying, payError, confirming } = state;
  const { policy } = money;
  const stripe = useStripe();
  const elements = useElements();
  const [hasWallets, setHasWallets] = useState(false);
  const [isCardReady, setCardReady] = useState(false);
  const isBlocked = !pay.hasTurnstileToken || !stripe;
  const payDisabled = pay.payDisabled || !stripe;

  const payNow = () => {
    if (stripe && elements && !payDisabled) void pay.pay(stripe, elements);
  };

  const payWithWallet = async ({
    paymentFailed,
  }: StripeExpressCheckoutElementConfirmEvent) => {
    const isPaid = !!stripe && !!elements && (await pay.pay(stripe, elements));

    if (!isPaid) paymentFailed({ reason: "fail" });
  };

  return (
    <>
      <h1 className={step.title}>{`Pay ${money.dueToday} today`}</h1>
      <p className={styles.intro}>
        {getPayIntro(policy.mode, stylist.policies.depositPercent)}
      </p>
      <div className={styles.form}>
        <div
          className={joinClassNames(
            styles.wallets,
            !hasWallets && styles.walletsHidden,
          )}
        >
          <div className={styles.quickCheckout}>Quick checkout</div>
          <ExpressCheckoutElement
            options={{
              buttonHeight: WALLET_BUTTON_HEIGHT,
              paymentMethods: { link: "never" },
            }}
            onReady={({ availablePaymentMethods }) =>
              setHasWallets(!!availablePaymentMethods)
            }
            onClick={({ resolve }) => {
              if (!payDisabled) resolve();
            }}
            onConfirm={payWithWallet}
          />
          <div className={styles.divider}>
            <span className={styles.dividerLine}></span>
            or pay by card
            <span className={styles.dividerLine}></span>
          </div>
        </div>
        {!isCardReady && <PaymentFieldsSkeleton />}
        <PaymentElement
          className={isCardReady ? undefined : styles.cardLoading}
          onReady={() => setCardReady(true)}
          onLoadError={() => {
            setCardReady(true);
            setState({ payKind: "network", payError: PAY_ERRORS.network });
          }}
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never", link: "never" },
          }}
          onChange={() => {
            if (payError && state.payKind !== "taken")
              setState({ payError: "", payKind: "" });
          }}
        />
        {state.loggedIn && !policy.cardSaved && (
          <button
            role="checkbox"
            aria-checked={state.keepCard ? "true" : "false"}
            onClick={() => setState({ keepCard: !state.keepCard })}
            className={styles.future}
          >
            <span
              className={joinClassNames(
                styles.futureBox,
                state.keepCard ? styles.futureBoxOn : styles.futureBoxOff,
              )}
            >
              {state.keepCard && (
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
        <OnboardingTurnstile
          isDark={false}
          widgetRef={pay.turnstileRef}
          onToken={pay.onTurnstileToken}
        />
        <div className={styles.payRow}>
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
              getPayButtonClass(paying, isBlocked),
              isBlocked && styles.payButtonBlockedText,
              payDisabled && styles.payButtonDisabled,
            )}
          >
            {paying || confirming
              ? "Confirming…"
              : `Pay ${money.dueToday} & confirm`}{" "}
            <ArrowRight size={17} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
};
