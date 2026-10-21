import type { CSSProperties } from "react";
import { ChevronLeft, X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { CheckoutDone } from "./done";
import { CheckoutReceipt } from "./receipt";
import { CheckoutRefund } from "./refund";
import { CheckoutResend } from "./resend";
import { CheckoutDetail } from "./detail";
import { CheckoutAdd, CheckoutItems } from "./items";
import { CheckoutPay } from "./pay";
import { CheckoutReview } from "./review";
import { CheckoutTip } from "./tip";
import { getDialog } from "./dialogs";
import { getFooter } from "./footer";
import { STEP_LABELS, VIEW_TITLES, getCheckoutView } from "./view";
import { useCheckout } from "./use-checkout";
import type { CheckoutSheetProps } from "./use-checkout";
import shared from "../../styles/components/checkout/index.module.css";

export type { CheckoutSheetProps } from "./use-checkout";

/**
 * Studio → booking checkout: booking detail, items with price adjustments, payment
 * method, tip and review, then done / receipt / resend / refund, plus the no-show fee flows.
 */
export const CheckoutSheet = (props: CheckoutSheetProps) => {
  const checkout = useCheckout(props);
  const { state, setState, money, scrollRef } = checkout;
  const view = getCheckoutView(checkout);
  const isMobile = (props.layout || "mobile") !== "desktop";
  const hasBack = state.view !== "detail" && state.view !== "done";
  const footer = getFooter(checkout, view);
  const dialog = getDialog(checkout, view);

  // embedded, the host decides the sheet's corners
  const sheetStyle = {
    "--sheet-radius": props.radius || "0",
  } as CSSProperties;

  const getStepClass = (index: number) => {
    if (index === view.stepIndex) return shared.stepCurrent;

    return index < view.stepIndex ? shared.stepDone : shared.stepTodo;
  };

  const close = () => {
    if (state.view === "done") return view.leaveDone("done");

    if (props.onClose) props.onClose();
    else checkout.exit();
  };

  return (
    <div className={shared.outer} data-screen-label="Checkout sheet">
      <div className={shared.sheet} style={sheetStyle}>
        <div className={shared.header}>
          {hasBack && (
            <button
              className={shared.headerButton}
              onClick={view.back}
              aria-label="Back"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          )}
          <div
            className={joinClassNames(
              shared.title,
              hasBack ? shared.titleWithBack : shared.titleNoBack,
            )}
          >
            {VIEW_TITLES[state.view] || ""}
          </div>
          <button
            className={shared.headerButton}
            onClick={close}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        {view.isInCheckout && (
          <ol className={shared.stepper} aria-label="Checkout steps">
            {money.steps.map((step, index) => (
              <li
                key={step}
                className={shared.flexCell}
                aria-current={index === view.stepIndex ? "step" : "false"}
              >
                <div
                  className={joinClassNames(
                    shared.stepBar,
                    index <= view.stepIndex
                      ? shared.stepBarDone
                      : shared.stepBarTodo,
                  )}
                ></div>
                <div
                  className={joinClassNames(
                    shared.stepLabel,
                    getStepClass(index),
                  )}
                >
                  {STEP_LABELS[step]}
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className={shared.scroll} ref={scrollRef}>
          {state.view === "detail" && (
            <CheckoutDetail checkout={checkout} view={view} />
          )}
          {state.view === "items" && (
            <CheckoutItems checkout={checkout} view={view} />
          )}
          {state.view === "add" && (
            <CheckoutAdd checkout={checkout} menu={props.menu} />
          )}
          {state.view === "tip" && (
            <CheckoutTip checkout={checkout} view={view} />
          )}
          {state.view === "pay" && (
            <CheckoutPay checkout={checkout} view={view} />
          )}
          {state.view === "review" && (
            <CheckoutReview checkout={checkout} view={view} />
          )}
          {state.view === "done" && (
            <CheckoutDone checkout={checkout} view={view} />
          )}
          {state.view === "receipt" && (
            <CheckoutReceipt checkout={checkout} view={view} />
          )}
          {state.view === "resend" && <CheckoutResend checkout={checkout} />}
          {state.view === "refund" && (
            <CheckoutRefund checkout={checkout} view={view} />
          )}
        </div>

        {footer.show && (
          <div
            className={joinClassNames(
              shared.footer,
              isMobile ? shared.footerMobile : shared.footerDesk,
            )}
          >
            {footer.hasTotal && (
              <div className={shared.flexCell}>
                <div className={shared.muted135}>{footer.totalLabel}</div>
                <div className={shared.footerTotal}>{footer.totalValue}</div>
              </div>
            )}
            {footer.hasSecondary && (
              <button
                className={shared.footerSecondary}
                onClick={footer.secondaryRun}
              >
                {footer.secondaryLabel}
              </button>
            )}
            {footer.hasPrimary && (
              <button
                className={joinClassNames(
                  shared.footerPrimary,
                  footer.hasTotal
                    ? shared.primaryWithTotal
                    : shared.primaryAlone,
                  footer.isPrimaryDisabled
                    ? shared.primaryDisabled
                    : shared.primaryOn,
                )}
                onClick={footer.primaryRun}
                disabled={footer.isPrimaryDisabled}
              >
                {state.busy && state.view === "review" && (
                  <span className={shared.spinner}></span>
                )}
                {footer.primaryLabel}
              </button>
            )}
          </div>
        )}

        {dialog && (
          <div className={shared.scrim}>
            <div
              className={joinClassNames(shared.dialog, shared.motion)}
              role="alertdialog"
              aria-modal="true"
              aria-label={dialog.title}
              data-ck-m="1"
            >
              <div className={shared.dialogTitle}>{dialog.title}</div>
              <div className={shared.dialogBody}>{dialog.body}</div>
              <div className={shared.dialogActions}>
                <button className={shared.dialogYes} onClick={dialog.run}>
                  {dialog.yes}
                </button>
                <button
                  className={shared.dialogNo}
                  onClick={() => setState({ dialog: null })}
                >
                  {dialog.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {!!state.toast && (
          <div
            className={joinClassNames(
              shared.toast,
              footer.show ? shared.toastHigh : shared.toastLow,
            )}
            role="status"
          >
            {state.toast}
          </div>
        )}
      </div>
    </div>
  );
};
