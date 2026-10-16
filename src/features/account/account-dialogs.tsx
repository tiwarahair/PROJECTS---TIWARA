import { ArrowDownToLine, Lock, X } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { DISCARD_PROMPT } from "../../hooks/use-unsaved-changes";
import { joinClassNames } from "../../utils/class-names";
import {
  downloadFile,
  formatCardDigits,
  formatCardExpiry,
  getAddressLine,
  getReceiptHtml,
} from "./account-logic";
import type { AccountView } from "./account-view";
import { AccountSwitch } from "./settings-sections";
import type { AccountController } from "./use-account";
import styles from "../../styles/features/account/account-dialogs.module.css";
import pageGlobal from "../../styles/features/account/account-page-global.module.css";
import ui from "../../styles/features/account/account-ui.module.css";

const WIDE_DIALOGS = ["receipt", "delete", "cookies"];

const getFormattedCardField = (
  key: "number" | "expiry" | "cvc",
  value: string,
) => {
  if (key === "number") return formatCardDigits(value);

  if (key === "expiry") return formatCardExpiry(value);

  return value.replace(/\D/g, "").slice(0, 4);
};

interface AccountDialogsProps {
  account: AccountController;
  view: AccountView;
}

/** Overlay + dialog for receipts, confirmations, add card, cookie settings and delete account. */
export const AccountDialogs = ({ account, view }: AccountDialogsProps) => {
  const { state, refs, actions } = account;

  const {
    dialog,
    cards,
    addresses,
    cardForm,
    cardFormErrors,
    cookiesDraft,
    deleteText,
    profile,
    entries,
  } = state;

  const { setState, closeDialog, showToast, focusLater } = actions;

  if (!dialog) return null;

  const { receipt, blocked, upcoming } = view;
  const canDelete = deleteText.trim() === "DELETE";

  const confirm = (
    title: string,
    text: string,
    action: string,
    onConfirm: () => void,
    cancel = "Cancel",
  ) => (
    <>
      <h2 className={styles.title} id="ac-dlg-t">
        {title}
      </h2>
      <p className={styles.text}>{text}</p>
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={closeDialog}>
          {cancel}
        </button>
        <button className={styles.primary} onClick={onConfirm}>
          {action}
        </button>
      </div>
    </>
  );

  const closeThen = (patch: Parameters<typeof setState>[0]) =>
    setState(patch, () => focusLater("returnFocus"));

  const setCardField =
    (key: "number" | "expiry" | "cvc") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      const formatted = getFormattedCardField(key, value);

      setState(({ cardForm: current, cardFormErrors: errors }) => ({
        cardForm: { ...current, [key]: formatted },
        cardFormErrors: { ...errors, [key]: "" },
      }));
    };

  const cardBorder = (key: string) =>
    cardFormErrors[key] ? ui.inputErr : ui.inputOk;

  let content: ReactNode = null;

  if (dialog.kind === "receipt") {
    const receiptView = receipt ?? {
      ref: "",
      date: "",
      stylist: "",
      where: "",
      total: "",
      lines: [],
      payments: [],
    };

    content = (
      <div data-screen-label="Receipt">
        <h2 className={styles.receiptTitle} id="ac-dlg-t">
          Receipt
        </h2>
        <div className={styles.receiptRef}>
          {receiptView.ref}
          {" · "}
          {receiptView.date}
        </div>
        <div className={styles.receiptStylist}>{receiptView.stylist}</div>
        <div className={ui.muted}>{receiptView.where}</div>
        <div className={styles.receiptLines}>
          {receiptView.lines.map(({ label, subtitle, amount }, index) => (
            <div key={index} className={styles.receiptLine}>
              <span className={styles.lineLabel}>
                {label}
                {!!subtitle && (
                  <span className={styles.lineSub}>{subtitle}</span>
                )}
              </span>
              <span className={styles.amount}>{amount}</span>
            </div>
          ))}
          <div className={styles.totalRow}>
            <span>Total</span>
            <span className={styles.amount}>{receiptView.total}</span>
          </div>
        </div>
        <div className={styles.pays}>
          {receiptView.payments.map(({ label, amount }, index) => (
            <div key={index} className={styles.pay}>
              <span>{label}</span>
              <span className={styles.payAmount}>{amount}</span>
            </div>
          ))}
        </div>
        <div className={styles.receiptActions}>
          <button
            className={styles.download}
            onClick={() => {
              if (!receipt) return;

              downloadFile(
                `receipt-${receipt.ref}.html`,
                getReceiptHtml(receipt, profile),
                "text/html",
              );

              showToast("Receipt downloaded");
            }}
          >
            <ArrowDownToLine size={17} strokeWidth={1.7} />
            Download
          </button>
          <button className={styles.secondary} onClick={closeDialog}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (dialog.kind === "allergy") {
    const { index } = dialog;

    content = confirm(
      "Remove this?",
      `${view.getStylistName(entries[index]?.id ?? "")} won’t see it any more.`,
      "Remove",
      () => {
        closeThen(({ entries: current }) => ({
          entries: current.map((entry, position) =>
            position === index ? { ...entry, text: "" } : entry,
          ),
          dialog: null,
        }));

        showToast("Removed");
      },
    );
  }

  if (dialog.kind === "card") {
    const { id } = dialog;
    const card = cards.find((item) => item.id === id);

    const defaultNote =
      card?.isDefault && cards.length > 1
        ? " Your other card becomes your default."
        : "";

    content = confirm(
      "Remove this card?",
      `${card?.brand} ending ${card?.last4} will be removed from your account.${defaultNote}`,
      "Remove card",
      () => {
        closeThen(({ cards: current }) => {
          let list = current.filter((item) => item.id !== id);

          if (card?.isDefault && list.length)
            list = list.map((item, index) => ({
              ...item,
              isDefault: index === 0,
            }));

          return { cards: list, dialog: null };
        });

        showToast("Card removed");
      },
    );
  }

  if (dialog.kind === "addCard")
    content = (
      <div data-screen-label="Add a card">
        <h2 className={styles.title} id="ac-dlg-t">
          Add a card
        </h2>
        <div className={styles.cardForm}>
          <label className={ui.label}>
            Card number{" "}
            <input
              className={joinClassNames(styles.cardInput, cardBorder("number"))}
              value={cardForm.number}
              onChange={setCardField("number")}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              aria-invalid={cardFormErrors.number ? "true" : "false"}
              aria-describedby="ac-e-num"
            />
            <span className={ui.error} id="ac-e-num">
              {cardFormErrors.number}
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
                value={cardForm.expiry}
                onChange={setCardField("expiry")}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM / YY"
                aria-invalid={cardFormErrors.expiry ? "true" : "false"}
                aria-describedby="ac-e-exp"
              />
              <span className={ui.error} id="ac-e-exp">
                {cardFormErrors.expiry}
              </span>
            </label>
            <label className={ui.label}>
              Security code{" "}
              <input
                className={joinClassNames(
                  styles.cardInputSmall,
                  cardBorder("cvc"),
                )}
                value={cardForm.cvc}
                onChange={setCardField("cvc")}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="CVC"
                aria-invalid={cardFormErrors.cvc ? "true" : "false"}
                aria-describedby="ac-e-cvc"
              />
              <span className={ui.error} id="ac-e-cvc">
                {cardFormErrors.cvc}
              </span>
            </label>
          </div>
          {cards.length > 0 && (
            <label className={ui.checkLabel}>
              <input
                className={ui.checkbox}
                type="checkbox"
                checked={cardForm.isDefault}
                onChange={(event) => {
                  const isDefault = event.target.checked;

                  setState(({ cardForm: current, cardFormErrors: errors }) => ({
                    cardForm: { ...current, isDefault },
                    cardFormErrors: { ...errors, isDefault: "" },
                  }));
                }}
              />
              Make this my default card
            </label>
          )}
          <div className={styles.stripeNote}>
            <Lock size={14} strokeWidth={1.5} />
            Your card details are stored securely by Stripe.
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.saveCard} onClick={actions.saveCard}>
            Save card
          </button>
          <button className={styles.secondary} onClick={closeDialog}>
            Cancel
          </button>
        </div>
      </div>
    );

  if (dialog.kind === "discard")
    content = confirm(
      DISCARD_PROMPT.title,
      DISCARD_PROMPT.body,
      DISCARD_PROMPT.discard,
      dialog.then,
      DISCARD_PROMPT.keep,
    );

  if (dialog.kind === "logoutAll")
    content = confirm(
      "Log out of all devices?",
      "You’ll be logged out everywhere you use Tiwára's House, including here. Your bookings and details stay as they are.",
      "Log out everywhere",
      () => {
        setState({ dialog: null, loggedOut: true });
        actions.endSession();
        showToast("You’re logged out of all devices");
      },
    );

  if (dialog.kind === "address") {
    const { id } = dialog;
    const address = addresses.find((item) => item.id === id);

    content = confirm(
      "Remove this address?",
      address
        ? `${address.label} at ${getAddressLine(address)} will be removed.`
        : "",
      "Remove",
      () => {
        let list = addresses.filter((item) => item.id !== id);

        if (address?.isDefault && list.length)
          list = list.map((item, index) => ({
            ...item,
            isDefault: index === 0,
          }));

        actions.setAddresses(list);
        closeThen({ dialog: null });
        showToast("Address removed");
      },
    );
  }

  if (dialog.kind === "sync")
    content = confirm(
      "Reset your calendar link?",
      "The old link will stop working.",
      "Reset link",
      () => {
        closeThen({
          sync: Math.random().toString(36).slice(2, 10),
          dialog: null,
        });

        showToast("New calendar link created");
      },
    );

  if (dialog.kind === "cookies")
    content = (
      <div data-screen-label="Cookie settings">
        <h2 className={styles.title} id="ac-dlg-t">
          Cookie settings
        </h2>
        <div className={styles.cookieList}>
          <div className={styles.cookieRow}>
            <div className={ui.minZero}>
              <div className={ui.strongText}>Essential</div>
              <div className={ui.itemSub}>
                Keep you logged in and your bookings secure.
              </div>
            </div>
            <span className={styles.alwaysOn}>Always on</span>
          </div>
          <div className={styles.cookieRow}>
            <div className={ui.minZero}>
              <div className={ui.strongText} id="ac-ck-an-l">
                Analytics
              </div>
              <div className={ui.itemSub}>
                Help us see which pages people use.
              </div>
            </div>
            <AccountSwitch
              id="ac-ck-an"
              labelId="ac-ck-an-l"
              on={cookiesDraft.analytics}
              onToggle={() =>
                setState(({ cookiesDraft: current }) => ({
                  cookiesDraft: { ...current, analytics: !current.analytics },
                }))
              }
            />
          </div>
          <div className={styles.cookieRow}>
            <div className={ui.minZero}>
              <div className={ui.strongText} id="ac-ck-mk-l">
                Marketing
              </div>
              <div className={ui.itemSub}>
                {"Show you relevant Tiwára's House offers on other sites."}
              </div>
            </div>
            <AccountSwitch
              id="ac-ck-mk"
              labelId="ac-ck-mk-l"
              on={cookiesDraft.marketing}
              onToggle={() =>
                setState(({ cookiesDraft: current }) => ({
                  cookiesDraft: { ...current, marketing: !current.marketing },
                }))
              }
            />
          </div>
        </div>
        <div className={styles.cookieActions}>
          <button
            className={styles.saveCard}
            onClick={() => {
              closeThen(({ cookiesDraft: current }) => ({
                cookies: { ...current },
                dialog: null,
              }));

              showToast("Cookie settings saved");
            }}
          >
            Save settings
          </button>
          <button className={styles.secondary} onClick={closeDialog}>
            Cancel
          </button>
        </div>
      </div>
    );

  if (dialog.kind === "delete" && blocked) {
    const upcomingCount = upcoming.length;

    content = (
      <div data-screen-label="Delete account blocked">
        <h2 className={styles.title} id="ac-dlg-t">
          Delete your account
        </h2>
        <p className={styles.deleteLead}>
          {
            "You can't delete your account while you have upcoming bookings or money owed."
          }
        </p>
        <p className={styles.deleteDetail}>
          {upcoming.length === 1
            ? "You have 1 upcoming booking. Cancel it or wait until it’s over, then try again."
            : `You have ${upcomingCount} upcoming bookings. Cancel them or wait until they’re over, then try again.`}
        </p>
        <div className={styles.actions}>
          <button
            className={styles.viewBookings}
            onClick={() => {
              setState({ dialog: null });
              actions.goToSection("bookings");
            }}
          >
            View bookings
          </button>
          <button className={styles.secondary} onClick={closeDialog}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (dialog.kind === "delete" && !blocked)
    content = (
      <div data-screen-label="Delete account allowed">
        <h2 className={styles.title} id="ac-dlg-t">
          Delete your account?
        </h2>
        <p className={styles.deleteLead}>This can’t be undone.</p>
        <div className={styles.deleteHeading}>We’ll delete</div>
        <ul className={styles.deleteList}>
          <li>Your name and contact details</li>
          <li>Your favourites</li>
          <li>Allergies you’ve shared with stylists</li>
          <li>Your saved cards</li>
        </ul>
        <div className={styles.keepHeading}>We’ll keep, anonymised</div>
        <p className={styles.keepText}>
          Payment records, because we have to keep them for tax and refunds.
          Your name won’t be attached.
        </p>
        <label className={styles.deleteLabel}>
          Type DELETE to confirm{" "}
          <input
            className={styles.deleteInput}
            ref={refs.deleteConfirm}
            value={deleteText}
            onChange={(event) =>
              setState({ deleteText: event.target.value.toUpperCase() })
            }
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
          />
        </label>
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={closeDialog}>
            Cancel
          </button>
          <button
            className={joinClassNames(
              styles.deleteButton,
              canDelete ? styles.deleteReady : styles.deleteBlocked,
            )}
            onClick={() => {
              if (!canDelete) return;

              setState({ dialog: null, deleted: true });
              actions.endSession();
              showToast("Your account has been deleted");
            }}
            disabled={!canDelete}
          >
            Delete account
          </button>
        </div>
      </div>
    );

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={joinClassNames(pageGlobal.acOv, styles.overlay)}
      onClick={closeDialog}
      data-a="1"
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={joinClassNames(
          pageGlobal.acDlg,
          styles.dialog,
          WIDE_DIALOGS.includes(dialog.kind)
            ? styles.dialogWide
            : styles.dialogNarrow,
        )}
        ref={refs.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ac-dlg-t"
        onClick={(event) => event.stopPropagation()}
        data-a="1"
      >
        <button
          className={styles.closeIcon}
          onClick={closeDialog}
          aria-label="Close"
        >
          <X size={20} strokeWidth={2} />
        </button>
        {content}
      </div>
    </div>
  );
};
