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
import { PaymentFieldsSkeleton } from "../../components/skeleton/payment-fields-skeleton";
import type { PaymentLink } from "../../lib/payment-link-api";
import { stripePromise } from "../../lib/stripe";
import {
  getErrorMessage,
  useStartLinkPaymentMutation,
} from "../../stores/api-slice";
import { joinClassNames } from "../../utils/class-names";
import {
  getPaymentAppearance,
  getPaymentFonts,
  WALLET_BUTTON_HEIGHT,
} from "../booking/logic/payment";
import { OnboardingTurnstile } from "../onboarding/turnstile";
import { formatPence, LINK_PAY_ERRORS } from "./logic";
import stepPay from "../../styles/features/booking/step-pay.module.css";
import styles from "../../styles/features/pay-fee/pay-form.module.css";

interface PayFormProps {
  link: PaymentLink;
  token: string;
  onPaid: () => void;
}

const NETWORK_ERROR =
  "Something went wrong and you haven't been charged. Try again.";

const Form = ({ link, token, onPaid }: PayFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [startPayment] = useStartLinkPaymentMutation();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isPaying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [hasWallets, setHasWallets] = useState(false);
  const [isCardReady, setCardReady] = useState(false);
  const amount = formatPence(link.amount_pence);
  const isDisabled = isPaying || !turnstileToken || !stripe;

  const getClientSecret = async (humanToken: string) => {
    try {
      return (
        await startPayment({ token, turnstileToken: humanToken }).unwrap()
      ).clientSecret;
    } catch (startError) {
      setError(LINK_PAY_ERRORS[getErrorMessage(startError)] ?? NETWORK_ERROR);

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

    const { error: payError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

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
          or pay by card
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
        {isPaying ? "Paying…" : `Pay ${amount}`}{" "}
        <ArrowRight size={17} strokeWidth={2} />
      </button>
    </div>
  );
};

export const PayForm = (props: PayFormProps) => (
  <Elements
    stripe={stripePromise}
    options={{
      mode: "payment",
      amount: props.link.amount_pence,
      currency: "gbp",
      allowedPaymentMethodTypes: ["card"],
      appearance: getPaymentAppearance(),
      fonts: getPaymentFonts(),
    }}
  >
    <Form {...props} />
  </Elements>
);
