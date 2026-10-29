import type { CSSProperties } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Info,
  Lock,
  TriangleAlert,
} from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { TaxDetailsForm } from "../tax-details-form";
import { getPayoutStatus, getTaxRows } from "./logic";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import { SettingsSection } from "./fields";
import shared from "../../styles/components/account-settings/index.module.css";
import payouts from "../../styles/components/account-settings/payouts.module.css";

interface SettingsPayoutsProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

export const SettingsPayouts = ({ props }: SettingsPayoutsProps) => {
  const status = props.payoutStatus || "active";
  const view = getPayoutStatus(status, props.pauseReason);
  const { icon: StatusIcon } = view;

  // the status palette comes from getPayoutStatus
  const statusStyle = {
    "--pst-bg": view.background,
    "--pst-shadow": view.flat ? "none" : "var(--shadow-panel)",
    "--pst-chip": view.chip,
    "--pst-fg": view.foreground,
    "--pst-btn-bd": view.primary ? "none" : "1px solid var(--border-strong)",
    "--pst-btn-bg": view.primary ? "var(--neutral-900,#1a1714)" : "transparent",
    "--pst-btn-fg": view.primary ? "#fffefb" : "var(--text-primary)",
  } as CSSProperties;

  const { tax, taxEditing = false } = props;
  const taxRows = tax ? getTaxRows(tax) : [];

  return (
    <>
      <SettingsSection label="Payout status" heading="Status">
        <div className={payouts.statusCard} role="status" style={statusStyle}>
          <span className={payouts.statusChip}>
            <StatusIcon size={20} strokeWidth={1.8} />
          </span>
          <div className={payouts.statusText}>
            <div className={payouts.statusTitle}>{view.title}</div>
            <div className={payouts.statusBody}>{view.body}</div>
          </div>
          <button
            className={joinClassNames(payouts.statusButton, shared.focusRing)}
            data-ac-in="1"
            onClick={() => {
              if (status === "none" || status === "action")
                props.onConnectStripe?.();
              else props.onOpenStripe?.();
            }}
          >
            {view.buttonLabel}
            <ArrowUpRight size={15} strokeWidth={1.7} />
          </button>
        </div>
      </SettingsSection>

      {status !== "none" && (
        <SettingsSection label="Bank account" heading="Bank account">
          <div className={payouts.bankCard}>
            <div className={shared.rowText}>
              <div className={payouts.managed}>
                <Lock size={14} strokeWidth={1.5} />
                Managed in Stripe
              </div>
              <div className={payouts.bankName}>
                {props.payoutBank === undefined ? (
                  <>
                    Monzo <span className={payouts.bankDigits}>•••• 4821</span>
                  </>
                ) : (
                  (props.payoutBank ?? "No bank account yet")
                )}
              </div>
            </div>
            <button
              className={joinClassNames(payouts.updateStripe, shared.focusRing)}
              data-ac-in="1"
              onClick={props.onOpenStripe}
            >
              Update in Stripe
              <ArrowUpRight size={15} strokeWidth={1.7} />
            </button>
          </div>
        </SettingsSection>
      )}

      <SettingsSection label="Payout schedule" heading="Payout schedule">
        <div className={shared.quietCard}>
          <p className={payouts.scheduleText}>
            Paid out daily. Payments reach your bank about 3 working days after
            they’re taken.
          </p>
          <div className={payouts.firstPayout}>
            <Info className={shared.infoIcon} size={16} strokeWidth={1.7} />
            Your first payout can take 7 to 14 days. Payments for your first 5
            bookings are released 24 hours after each appointment.
          </div>
          <p className={payouts.cardFees}>
            Card fees on every card payment taken through Tiwára’s House are
            deducted from your payout.
          </p>
          <button
            className={joinClassNames(payouts.earningsLink, shared.focusRing)}
            data-ac-in="1"
            onClick={() => props.onNavigate?.("earnings")}
          >
            View payout history in Earnings
            <ArrowRight size={15} strokeWidth={1.7} />
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        label="Tax details"
        heading="Tax details"
        intro={
          <p className={shared.introText}>
            We’re required to collect this for tax reporting.{" "}
            <button
              className={joinClassNames(payouts.learnMore, shared.focusRing)}
              data-ac-in="1"
              onClick={() => props.onTaxLearnMore?.()}
            >
              Learn more
            </button>
          </p>
        }
      >
        <div className={shared.card}>
          {!tax && !taxEditing && (
            <div className={payouts.taxHold} role="alert">
              <span className={payouts.taxHoldText}>
                <TriangleAlert
                  className={payouts.taxHoldIcon}
                  size={18}
                  strokeWidth={1.7}
                />
                Payouts on hold. Add your tax details to get paid.
              </span>
              <button
                className={joinClassNames(payouts.addTax, shared.focusRing)}
                data-ac-in="1"
                onClick={() => props.onTaxAdd?.()}
              >
                Add tax details
              </button>
            </div>
          )}
          {!!tax && !taxEditing && (
            <>
              <div className={payouts.taxHead}>
                <span className={payouts.completeTag}>
                  <Check size={13} strokeWidth={2.4} />
                  Complete
                </span>
                <button
                  className={joinClassNames(
                    shared.outlineButton,
                    shared.focusRing,
                  )}
                  data-ac-in="1"
                  onClick={() => props.onTaxEdit?.()}
                >
                  Edit
                </button>
              </div>
              <dl className={payouts.taxList}>
                {taxRows.map(({ label, value, isSpaced }, index) => (
                  <div key={`t${index}`} className={payouts.taxRow}>
                    <dt className={shared.rowLabel}>{label}</dt>
                    <dd
                      className={joinClassNames(
                        payouts.taxValue,
                        isSpaced
                          ? payouts.taxValueSpaced
                          : payouts.taxValuePlain,
                      )}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {taxEditing && (
            // host block for the embedded form
            <div data-dc-host="">
              <TaxDetailsForm
                mode="settings"
                value={tax ?? undefined}
                business={props.taxBusiness ?? undefined}
                legalName={props.taxLegalName || ""}
                businessName={props.taxBusinessName || ""}
                onSubmit={(details) => props.onTaxSave?.(details)}
                onCancel={() => props.onTaxCancel?.()}
                onDirtyChange={props.onTaxDirty}
              />
            </div>
          )}
        </div>
      </SettingsSection>
    </>
  );
};
