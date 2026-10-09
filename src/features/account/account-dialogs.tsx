import type { ChangeEvent, ReactNode } from "react";
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
import styles from "./account-dialogs.module.css";
import helmet from "./account-helmet.module.css";
import ui from "./account-ui.module.css";

const WIDE_DIALOGS = ["receipt", "delete", "cookies"];

interface AccountDialogsProps {
  account: AccountController;
  view: AccountView;
}

/** Overlay + dialog for receipts, confirmations, add card, cookie settings and delete account. */
export const AccountDialogs = ({ account, view }: AccountDialogsProps) => {
  const { state, refs, actions } = account;
  const { dlg, cards, addrs, cf, cfErr, ckDraft, delText, me, entries } = state;
  const { setState, closeDialog, showToast, focusLater } = actions;
  if (!dlg) return null;
  const { receipt, blocked, upcoming } = view;
  const canDelete = delText.trim() === "DELETE";

  const confirm = (
    title: string,
    text: string,
    action: string,
    onConfirm: () => void,
  ) => (
    <>
      <h2 className={styles.title} id="ac-dlg-t">
        {title}
      </h2>
      <p className={styles.text}>{text}</p>
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={closeDialog}>
          Cancel
        </button>
        <button className={styles.primary} onClick={onConfirm}>
          {action}
        </button>
      </div>
    </>
  );
  const closeThen = (patch: Parameters<typeof setState>[0]) =>
    setState(patch, () => focusLater("undlg"));
  const setCardField =
    (key: "num" | "exp" | "cvc") => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      const formatted =
        key === "num"
          ? formatCardDigits(value)
          : key === "exp"
            ? formatCardExpiry(value)
            : value.replace(/\D/g, "").slice(0, 4);
      setState(({ cf: current, cfErr: errors }) => ({
        cf: { ...current, [key]: formatted },
        cfErr: { ...errors, [key]: "" },
      }));
    };
  const cardBorder = (key: string) => (cfErr[key] ? ui.inputErr : ui.inputOk);

  let content: ReactNode = null;
  if (dlg.k === "receipt") {
    const rc = receipt ?? {
      ref: "",
      date: "",
      stylist: "",
      where: "",
      total: "",
      lines: [],
      pays: [],
    };
    content = (
      <div data-screen-label="Receipt">
        <h2 className={styles.receiptTitle} id="ac-dlg-t">
          Receipt
        </h2>
        <div className={styles.receiptRef}>
          {rc.ref}
          {" · "}
          {rc.date}
        </div>
        <div className={styles.receiptStylist}>{rc.stylist}</div>
        <div className={ui.muted}>{rc.where}</div>
        <div className={styles.receiptLines}>
          {rc.lines.map(({ label, sub, amt }, index) => (
            <div key={index} className={styles.receiptLine}>
              <span className={styles.lineLabel}>
                {label}
                {!!sub && <span className={styles.lineSub}>{sub}</span>}
              </span>
              <span className={styles.amount}>{amt}</span>
            </div>
          ))}
          <div className={styles.totalRow}>
            <span>Total</span>
            <span className={styles.amount}>{rc.total}</span>
          </div>
        </div>
        <div className={styles.pays}>
          {rc.pays.map(({ label, amt }, index) => (
            <div key={index} className={styles.pay}>
              <span>{label}</span>
              <span className={styles.payAmount}>{amt}</span>
            </div>
          ))}
        </div>
        <div className={styles.receiptActions}>
          <button
            className={styles.download}
            onClick={() => {
              if (!receipt) return;
              downloadFile(
                "receipt-" + receipt.ref + ".html",
                getReceiptHtml(receipt, me),
                "text/html",
              );
              showToast("Receipt downloaded");
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path>
            </svg>
            Download
          </button>
          <button className={styles.secondary} onClick={closeDialog}>
            Close
          </button>
        </div>
      </div>
    );
  }
  if (dlg.k === "alg") {
    const { i: index } = dlg;
    content = confirm(
      "Remove this?",
      view.getStylistName(entries[index]?.id ?? "") + " won’t see it any more.",
      "Remove",
      () => {
        closeThen(({ entries: current }) => ({
          entries: current.map((entry, position) =>
            position === index ? { ...entry, text: "" } : entry,
          ),
          dlg: null,
        }));
        showToast("Removed");
      },
    );
  }
  if (dlg.k === "card") {
    const { id } = dlg;
    const card = cards.find((item) => item.id === id);
    content = confirm(
      "Remove this card?",
      card?.brand +
        " ending " +
        card?.last4 +
        " will be removed from your account." +
        (card?.def && cards.length > 1
          ? " Your other card becomes your default."
          : ""),
      "Remove card",
      () => {
        closeThen(({ cards: current }) => {
          let list = current.filter((item) => item.id !== id);
          if (card?.def && list.length)
            list = list.map((item, index) => ({ ...item, def: index === 0 }));
          return { cards: list, dlg: null };
        });
        showToast("Card removed");
      },
    );
  }
  if (dlg.k === "addCard")
    content = (
      <div data-screen-label="Add a card">
        <h2 className={styles.title} id="ac-dlg-t">
          Add a card
        </h2>
        <div className={styles.cardForm}>
          <label className={ui.label}>
            Card number{" "}
            <input
              className={joinClassNames(styles.cardInput, cardBorder("num"))}
              value={cf.num}
              onChange={setCardField("num")}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              aria-invalid={cfErr.num ? "true" : "false"}
              aria-describedby="ac-e-num"
            />
            <span className={ui.error} id="ac-e-num">
              {cfErr.num}
            </span>
          </label>
          <div className={styles.cardGrid}>
            <label className={ui.label}>
              Expiry{" "}
              <input
                className={joinClassNames(
                  styles.cardInputSmall,
                  cardBorder("exp"),
                )}
                value={cf.exp}
                onChange={setCardField("exp")}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM / YY"
                aria-invalid={cfErr.exp ? "true" : "false"}
                aria-describedby="ac-e-exp"
              />
              <span className={ui.error} id="ac-e-exp">
                {cfErr.exp}
              </span>
            </label>
            <label className={ui.label}>
              Security code{" "}
              <input
                className={joinClassNames(
                  styles.cardInputSmall,
                  cardBorder("cvc"),
                )}
                value={cf.cvc}
                onChange={setCardField("cvc")}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="CVC"
                aria-invalid={cfErr.cvc ? "true" : "false"}
                aria-describedby="ac-e-cvc"
              />
              <span className={ui.error} id="ac-e-cvc">
                {cfErr.cvc}
              </span>
            </label>
          </div>
          {cards.length > 0 && (
            <label className={ui.checkLabel}>
              <input
                className={ui.checkbox}
                type="checkbox"
                checked={cf.def}
                onChange={(event) => {
                  const def = event.target.checked;
                  setState(({ cf: current, cfErr: errors }) => ({
                    cf: { ...current, def },
                    cfErr: { ...errors, def: "" },
                  }));
                }}
              />
              Make this my default card
            </label>
          )}
          <div className={styles.stripeNote}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="4" y="11" width="16" height="10" rx="2"></rect>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
            </svg>
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
  if (dlg.k === "logoutAll")
    content = confirm(
      "Log out of all devices?",
      "You’ll be logged out everywhere you use Tiwára's House, including here. Your bookings and details stay as they are.",
      "Log out everywhere",
      () => {
        setState({ dlg: null, loggedOut: true });
        actions.endSession();
        showToast("You’re logged out of all devices");
      },
    );
  if (dlg.k === "addr") {
    const { id } = dlg;
    const address = addrs.find((item) => item.id === id);
    content = confirm(
      "Remove this address?",
      address
        ? address.label + " at " + getAddressLine(address) + " will be removed."
        : "",
      "Remove",
      () => {
        let list = addrs.filter((item) => item.id !== id);
        if (address?.def && list.length)
          list = list.map((item, index) => ({ ...item, def: index === 0 }));
        actions.setAddresses(list);
        closeThen({ dlg: null });
        showToast("Address removed");
      },
    );
  }
  if (dlg.k === "sync")
    content = confirm(
      "Reset your calendar link?",
      "The old link will stop working.",
      "Reset link",
      () => {
        closeThen({ sync: Math.random().toString(36).slice(2, 10), dlg: null });
        showToast("New calendar link created");
      },
    );
  if (dlg.k === "cookies")
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
              on={ckDraft.an}
              onToggle={() =>
                setState(({ ckDraft: current }) => ({
                  ckDraft: { ...current, an: !current.an },
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
              on={ckDraft.mk}
              onToggle={() =>
                setState(({ ckDraft: current }) => ({
                  ckDraft: { ...current, mk: !current.mk },
                }))
              }
            />
          </div>
        </div>
        <div className={styles.cookieActions}>
          <button
            className={styles.saveCard}
            onClick={() => {
              closeThen(({ ckDraft: current }) => ({
                cookies: { ...current },
                dlg: null,
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
  if (dlg.k === "delete" && blocked)
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
            : "You have " +
              upcoming.length +
              " upcoming bookings. Cancel them or wait until they’re over, then try again."}
        </p>
        <div className={styles.actions}>
          <button
            className={styles.viewBookings}
            onClick={() => {
              setState({ dlg: null });
              actions.go("bookings");
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
  if (dlg.k === "delete" && !blocked)
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
            ref={refs.del}
            value={delText}
            onChange={(event) =>
              setState({ delText: event.target.value.toUpperCase() })
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
              setState({ dlg: null, deleted: true });
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
      className={joinClassNames(helmet.acOv, styles.overlay)}
      onClick={closeDialog}
      data-a="1"
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={joinClassNames(
          helmet.acDlg,
          styles.dialog,
          WIDE_DIALOGS.includes(dlg.k)
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12"></path>
          </svg>
        </button>
        {content}
      </div>
    </div>
  );
};
