import type { TurnstileInstance } from "@marsidev/react-turnstile";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { ArrowRight, CircleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { PaymentFieldsSkeleton } from "../skeleton/payment-fields";
import { stripePromise } from "../../lib/stripe";
import { getErrorMessage } from "../../stores/api-slice";
import { joinClassNames } from "../../utils/class-names";
import {
  getPaymentAppearance,
  getPaymentFonts,
  WALLET_BUTTON_HEIGHT,
} from "../../features/booking/logic/payment";
import { OnboardingTurnstile } from "../../features/onboarding/turnstile";
import stepPay from "../../styles/features/booking/step-pay.module.css";
import styles from "../../styles/components/link-payment/index.module.css";

interface FormProps {
  payLabel: string;
  /** starts the payment on the server; its refusals are shown with `refusals`. */
  getClientSecret: (turnstileToken: string) => Promise<string>;
  refusals: Record<string, string>;
  onPaid: () => void;
  /** saves a card for later (a SetupIntent) instead of paying */
  isSetup?: boolean;
}

export interface LinkPaymentProps extends FormProps {
  amountPence: number;
  /** deposit & card protection keep the card for later fees. */
  isSavingCard: boolean;
}

const getBusyLabel = (isSetup: boolean) => (isSetup ? "Saving…" : "Paying…");

const NETWORK_ERROR =
  "Something went wrong and you haven't been charged. Try again.";

const Form = ({
  payLabel,
  getClientSecret: startPayment,
  refusals,
  onPaid,
  isSetup = false,
}: FormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isPaying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [hasWallets, setHasWallets] = useState(false);
  const [isCardReady, setCardReady] = useState(false);
  const isDisabled = isPaying || !turnstileToken || !stripe;

  const getClientSecret = async (humanToken: string) => {
    try {
      return await startPayment(humanToken);
    } catch (startError) {
      setError(refusals[getErrorMessage(startError)] ?? NETWORK_ERROR);

      return null;
    } finally {
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  };

  const pay = async () => {
    if (!stripe || !elements || !turnstileToken) return false;

    setPaying(true);
    setError("");

    const { error: cardError } = await elements.submit();

    if (cardError) {
      setPaying(false);
      setError(cardError.message ?? NETWORK_ERROR);

      return false;
    }

    const clientSecret = await getClientSecret(turnstileToken);

    if (!clientSecret) {
      setPaying(false);

      return false;
    }

    const confirmation = {
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required" as const,
    };

    const { error: payError } = isSetup
      ? await stripe.confirmSetup(confirmation)
      : await stripe.confirmPayment(confirmation);

    setPaying(false);

    if (payError) {
      setError(payError.message ?? NETWORK_ERROR);

      return false;
    }

    onPaid();

    return true;
  };

  return (
    <div className={joinClassNames(stepPay.form, styles.form)}>
      <div
        className={joinClassNames(
          stepPay.wallets,
          !hasWallets && stepPay.walletsHidden,
        )}
      >
        <ExpressCheckoutElement
          options={{
            buttonHeight: WALLET_BUTTON_HEIGHT,
            paymentMethods: { link: "never" },
          }}
          onReady={({ availablePaymentMethods }) =>
            setHasWallets(!!availablePaymentMethods)
          }
          onClick={({ resolve }) => {
            if (!isDisabled) resolve();
          }}
          onConfirm={async ({ paymentFailed }) => {
            if (!(await pay())) paymentFailed({ reason: "fail" });
          }}
        />
        <div className={stepPay.divider}>
          <span className={stepPay.dividerLine}></span>
          {isSetup ? "or add a card" : "or pay by card"}
          <span className={stepPay.dividerLine}></span>
        </div>
      </div>
      {!isCardReady && <PaymentFieldsSkeleton />}
      <PaymentElement
        className={isCardReady ? undefined : stepPay.cardLoading}
        onReady={() => setCardReady(true)}
        onLoadError={() => {
          setCardReady(true);
          setError(NETWORK_ERROR);
        }}
        options={{
          layout: "tabs",
          wallets: { applePay: "never", googlePay: "never", link: "never" },
        }}
        onChange={() => setError("")}
      />
      <div aria-live="assertive">
        {!!error && (
          <div role="alert" className={stepPay.error}>
            <CircleAlert
              size={16}
              strokeWidth={1.7}
              className={stepPay.errorIcon}
            />
            <span>{error}</span>
          </div>
        )}
      </div>
      <OnboardingTurnstile
        isDark={false}
        widgetRef={turnstileRef}
        onToken={setTurnstileToken}
      />
      <button
        onClick={() => void pay()}
        disabled={isDisabled}
        className={joinClassNames(
          stepPay.payButton,
          styles.payButton,
          isPaying ? stepPay.payButtonPaying : stepPay.payButtonReady,
          isDisabled && stepPay.payButtonDisabled,
        )}
      >
        {isPaying ? getBusyLabel(isSetup) : payLabel}{" "}
        <ArrowRight size={17} strokeWidth={2} />
      </button>
    </div>
  );
};

/** a new card (or Apple / Google Pay) saved for later fees, with nothing charged now. */
export const CardSetup = (form: FormProps) => (
  <Elements
    stripe={stripePromise}
    options={{
      mode: "setup",
      currency: "gbp",
      allowedPaymentMethodTypes: ["card"],
      setupFutureUsage: "off_session",
      appearance: getPaymentAppearance(),
      fonts: getPaymentFonts(),
    }}
  >
    <Form {...form} isSetup />
  </Elements>
);

/** Card (and Apple / Google Pay) payment for a link a client was sent: a fee, or confirming a booking. */
export const LinkPayment = ({
  amountPence,
  isSavingCard,
  ...form
}: LinkPaymentProps) => (
  <Elements
    stripe={stripePromise}
    options={{
      mode: "payment",
      amount: amountPence,
      currency: "gbp",
      allowedPaymentMethodTypes: ["card"],
      setupFutureUsage: isSavingCard ? "off_session" : null,
      appearance: getPaymentAppearance(),
      fonts: getPaymentFonts(),
    }}
  >
    <Form {...form} />
  </Elements>
);
