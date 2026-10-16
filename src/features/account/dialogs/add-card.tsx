import { Lock } from "lucide-react";
import { useFormState } from "react-hook-form";
import type { ChangeEvent } from "react";
import { joinClassNames } from "../../../utils/class-names";
import { formatCardDigits, formatCardExpiry } from "../logic";
import type { AccountController } from "../use-account";
import shared from "../../../styles/features/account/dialogs/index.module.css";
import styles from "../../../styles/features/account/dialogs/add-card.module.css";
import ui from "../../../styles/features/account/ui.module.css";

type CardField = "number" | "expiry" | "cvc";

const getFormattedCardField = (key: CardField, value: string) => {
  if (key === "number") return formatCardDigits(value);

  if (key === "expiry") return formatCardExpiry(value);

  return value.replace(/\D/g, "").slice(0, 4);
};

interface AddCardDialogProps {
  account: AccountController;
}

export const AddCardDialog = ({
  account: { state, actions, forms },
}: AddCardDialogProps) => {
  const { register, setValue, clearErrors, control } = forms.card;
  const { errors: cardErrors } = useFormState({ control });

  const cardField = (key: CardField) =>
    register(key, {
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        clearErrors(key);
        setValue(key, getFormattedCardField(key, event.target.value));
      },
    });

  const cardBorder = (key: CardField) =>
    cardErrors[key] ? ui.inputErr : ui.inputOk;

  return (
    <div data-screen-label="Add a card">
      <h2 className={shared.title} id="ac-dlg-t">
        Add a card
      </h2>
      <div className={styles.cardForm}>
        <label className={ui.label}>
          Card number{" "}
          <input
            className={joinClassNames(styles.cardInput, cardBorder("number"))}
            {...cardField("number")}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            aria-invalid={cardErrors.number ? "true" : "false"}
            aria-describedby="ac-e-num"
          />
          <span className={ui.error} id="ac-e-num">
            {cardErrors.number?.message}
          </span>
        </label>
        <div className={styles.cardGrid}>
          <label className={ui.label}>
            Expiry{" "}
            <input
              className={joinClassNames(
                styles.cardInputSmall,
                cardBorder("expiry"),
              )}
              {...cardField("expiry")}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              aria-invalid={cardErrors.expiry ? "true" : "false"}
              aria-describedby="ac-e-exp"
            />
            <span className={ui.error} id="ac-e-exp">
              {cardErrors.expiry?.message}
            </span>
          </label>
          <label className={ui.label}>
            Security code{" "}
            <input
              className={joinClassNames(
                styles.cardInputSmall,
                cardBorder("cvc"),
              )}
              {...cardField("cvc")}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="CVC"
              aria-invalid={cardErrors.cvc ? "true" : "false"}
              aria-describedby="ac-e-cvc"
            />
            <span className={ui.error} id="ac-e-cvc">
              {cardErrors.cvc?.message}
            </span>
          </label>
        </div>
        {state.cards.length > 0 && (
          <label className={ui.checkLabel}>
            <input
              className={ui.checkbox}
              type="checkbox"
              {...register("isDefault")}
            />
            Make this my default card
          </label>
        )}
        <div className={styles.stripeNote}>
          <Lock size={14} strokeWidth={1.5} />
          Your card details are stored securely by Stripe.
        </div>
      </div>
      <div className={shared.actions}>
        <button
          className={shared.saveCard}
          onClick={() => void actions.saveCard()}
        >
          Save card
        </button>
        <button className={shared.secondary} onClick={actions.closeDialog}>
          Cancel
        </button>
      </div>
    </div>
  );
};
