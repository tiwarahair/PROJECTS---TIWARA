import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { useState } from "react";
import { PaymentFieldsSkeleton } from "../../../components/skeleton/payment-fields";
import { startCardSetup } from "../../../lib/client-cards";
import { stripePromise } from "../../../lib/stripe";
import {
  getPaymentAppearance,
  getPaymentFonts,
} from "../../booking/logic/payment";
import type { AccountController } from "../use-account";
import shared from "../../../styles/features/account/dialogs/index.module.css";
import styles from "../../../styles/features/account/dialogs/add-card.module.css";
import ui from "../../../styles/features/account/ui.module.css";

interface AddCardDialogProps {
  account: AccountController;
}

export const AddCardDialog = ({ account }: AddCardDialogProps) => (
  <Elements
    stripe={stripePromise}
    options={{
      mode: "setup",
      currency: "gbp",
      allowedPaymentMethodTypes: ["card"],
      appearance: getPaymentAppearance(),
      fonts: getPaymentFonts(),
    }}
  >
    <CardForm account={account} />
  </Elements>
);

const CardForm = ({ account: { data, actions } }: AddCardDialogProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setReady] = useState(false);
  const [isDefault, setDefault] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const saveCard = async () => {
    if (!stripe || !elements || isSaving) return;

    setSaving(true);
    setError("");

    const { error: fieldError } = await elements.submit();

    if (fieldError) {
      setSaving(false);

      return setError(fieldError.message ?? "Check your card details");
    }

    try {
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret: await startCardSetup(),
        redirect: "if_required",
      });

      const card = setupIntent?.payment_method;

      if (setupError || typeof card !== "string")
        throw new Error(setupError?.message ?? "");

      await actions.finishCardSetup(card, isDefault);
    } catch (setupError) {
      setError(
        (setupError instanceof Error && setupError.message) ||
          "Your card couldn’t be saved. Try again",
      );
    }

    setSaving(false);
  };

  return (
    <div data-screen-label="Add a card">
      <h2 className={shared.title} id="ac-dlg-t">
        Add a card
      </h2>
      <div className={styles.cardForm}>
        {!isReady && <PaymentFieldsSkeleton />}
        <PaymentElement
          className={isReady ? undefined : styles.cardLoading}
          onReady={() => setReady(true)}
          onLoadError={() => {
            setReady(true);
            setError("The card form couldn’t load. Try again");
          }}
          onChange={() => setError("")}
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never", link: "never" },
          }}
        />
        {data.cards.length > 0 && (
          <label className={ui.checkLabel}>
            <input
              className={ui.checkbox}
              type="checkbox"
              checked={isDefault}
              onChange={() => setDefault(!isDefault)}
            />
            Make this my default card
          </label>
        )}
        {!!error && (
          <span className={ui.error} role="alert">
            {error}
          </span>
        )}
        <div className={styles.stripeNote}>
          <Lock size={14} strokeWidth={1.5} />
          Your card details are stored securely by Stripe.
        </div>
      </div>
      <div className={shared.actions}>
        <button
          className={shared.saveCard}
          onClick={() => void saveCard()}
          disabled={!stripe || isSaving}
        >
          {isSaving ? "Saving…" : "Save card"}
        </button>
        <button className={shared.secondary} onClick={actions.closeDialog}>
          Cancel
        </button>
      </div>
    </div>
  );
};
