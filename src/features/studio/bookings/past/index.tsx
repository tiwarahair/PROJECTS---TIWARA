import type { CSSProperties } from "react";
import {
  ChevronRight,
  Link,
  Receipt,
  Send,
  TriangleAlert,
  Undo,
  Undo2,
} from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import { ContactLinks } from "../sheet/contact-links";
import { getPastCheckoutView } from "./view";
import type { PastSheetView } from "./view";
import { StudioCheckout } from "../checkout";
import type { StudioController } from "../../core/use-studio";
import bookingStyles from "../../../../styles/features/studio/bookings/sheet/index.module.css";
import styles from "../../../../styles/features/studio/bookings/past/index.module.css";
import sheet from "../../../../styles/features/studio/shell/sheet-frame.module.css";

const asStyle = (values: Record<string, string>) => values as CSSProperties;

/** The status pill in the sheet header. */
export const PastBadge = ({ view }: { view: PastSheetView }) => {
  const { badgeIcon: BadgeIcon } = view;

  return (
    <span
      className={styles.badge}
      // the status tone comes from PAST_TONE at runtime
      style={asStyle({
        "--badge-bg": view.badgeBackground,
        "--badge-color": view.badgeColor,
      })}
    >
      {BadgeIcon && <BadgeIcon size={11} strokeWidth={2.6} />}
      {view.status}
    </span>
  );
};

const RefundTag = ({ label }: { label: string }) => (
  <span className={styles.tag}>
    <Undo2 size={14} strokeWidth={2} />
    {label}
  </span>
);

/** A finished, cancelled or no-show booking. */
export const PastSheetBody = ({ view }: { view: PastSheetView }) => (
  <div className={styles.body}>
    <div className={bookingStyles.clientRow}>
      <div
        className={bookingStyles.clientOpen}
        role="button"
        tabIndex={0}
        onClick={view.openClient}
        aria-label="Open client profile"
      >
        <img className={bookingStyles.avatar52} src={view.imgSrc} alt="" />
        <span className={bookingStyles.grow}>
          <span className={bookingStyles.clientName}>{view.clientName}</span>
          <span className={bookingStyles.clientMeta}>
            {view.visitLabel + view.sinceLabel}
          </span>
        </span>
        {view.hasContact && (
          <ContactLinks
            telHref={view.telHref}
            smsHref={view.smsHref}
            mailHref={view.mailHref}
            hasPhone={view.hasPhone}
            hasEmail={view.hasEmail}
          />
        )}
        {view.canOpen && (
          <ChevronRight
            className={bookingStyles.noShrink}
            size={18}
            strokeWidth={1.7}
            color="var(--neutral-500)"
          />
        )}
      </div>
    </div>
    <div className={styles.service}>
      <div className={styles.grow}>
        <div className={styles.serviceName}>{view.service}</div>
        <div className={styles.when}>{`${view.when} · ${view.time}`}</div>
      </div>
      <div
        className={joinClassNames(
          styles.price,
          view.isStruck && styles.priceStruck,
        )}
      >
        {view.priceLabel}
      </div>
    </div>
    {view.feeUnpaid && (
      <div className={styles.unpaid} role="alert">
        <div className={styles.alertRow}>
          <TriangleAlert
            className={styles.alertIcon}
            size={18}
            strokeWidth={1.7}
            color="var(--accent-700)"
          />
          <div className={styles.minWidth}>
            <div className={styles.unpaidTitle}>{view.feeUnpaidTitle}</div>
            <div className={styles.panelBody}>{view.feeUnpaidBody}</div>
          </div>
        </div>
        <div className={styles.buttons}>
          {view.feeUnpaidRetryShown && (
            <button className={styles.retry} onClick={view.feeUnpaidRetry}>
              {view.feeUnpaidRetryLabel}
            </button>
          )}
          <button
            className={styles.whiteButton}
            onClick={view.feeUnpaidLink}
            disabled={view.isFeeUnpaidLinkOff}
          >
            {view.feeUnpaidLinkLabel}
          </button>
          <button className={styles.whiteButton} onClick={view.feeUnpaidRecord}>
            Record as paid
          </button>
          <button className={styles.waive} onClick={view.feeUnpaidWaive}>
            Waive fee
          </button>
        </div>
      </div>
    )}
    {view.feeRefundTag && <RefundTag label={view.feeRefundTag} />}
    {view.feeMerge && (
      <div className={styles.merge}>
        <div className={styles.minWidth}>
          <div className={styles.mergeTitle}>{view.actionTitle}</div>
          <div className={styles.mergeBody}>{view.feeReason}</div>
        </div>
        <button className={styles.feeAct} onClick={view.feeAction ?? undefined}>
          {view.feeActionLabel}
        </button>
      </div>
    )}
    {view.hasNote && <div className={styles.note}>{view.note}</div>}
    {view.hasAction && (
      <div className={styles.actRow}>
        {view.actionHasText && (
          <div className={styles.grow}>
            <div className={styles.actTitle}>{view.actionTitle}</div>
            <div className={styles.actWhy}>{view.actionReason}</div>
          </div>
        )}
        <button className={styles.act} onClick={view.action ?? undefined}>
          <Undo size={14} strokeWidth={1.7} />
          {view.actionLabel}
        </button>
      </div>
    )}
    {view.hasAwait && (
      <div className={styles.awaiting}>
        <div className={styles.alertRow}>
          <Link
            className={styles.alertIcon}
            size={18}
            strokeWidth={1.7}
            color="var(--neutral-700)"
          />
          <div className={styles.minWidth}>
            <div className={styles.awaitingTitle}>
              Completed · Awaiting payment
            </div>
            <div className={styles.panelBody}>{view.awaitBody}</div>
          </div>
        </div>
        <div className={styles.buttons}>
          <button className={styles.whiteButton} onClick={view.resendLink}>
            Resend link
          </button>
          <button className={styles.whiteButton} onClick={view.recordPaid}>
            Record as paid
          </button>
          {view.canCancelLink && (
            <button className={styles.cancelLink} onClick={view.cancelLink}>
              Cancel link
            </button>
          )}
        </div>
      </div>
    )}
    {view.refundTag && <RefundTag label={view.refundTag} />}
    {view.hasLinks && (
      <div className={styles.links}>
        <button className={styles.linkRow} onClick={view.viewReceipt}>
          <Receipt size={18} strokeWidth={1.7} color="var(--neutral-600)" />
          <span className={styles.linkLabel}>View receipt</span>
          <ChevronRight
            size={16}
            strokeWidth={1.7}
            color="var(--neutral-500)"
          />
        </button>
        <button className={styles.linkRow} onClick={view.resendReceipt}>
          <Send size={18} strokeWidth={1.7} color="var(--neutral-600)" />
          <span className={styles.linkLabel}>Resend receipt</span>
          <ChevronRight
            size={16}
            strokeWidth={1.7}
            color="var(--neutral-500)"
          />
        </button>
      </div>
    )}
    {view.canRefund && (
      <button className={styles.refund} onClick={view.openRefund}>
        Refund
      </button>
    )}
  </div>
);

/** Total, what was kept / paid, and Book again. */
export const PastSheetFooter = ({ view }: { view: PastSheetView }) => (
  <div className={joinClassNames(sheet.footer, sheet.footerTall)}>
    <div className={sheet.totals}>
      <div className={sheet.totalLine}>
        <span>Total</span>
        <span className={sheet.numeric}>{view.totalLabel}</span>
      </div>
      <div className={sheet.totalMain}>
        <span className={sheet.h3}>{view.outLabel}</span>
        <span className={sheet.amount}>{view.outValue}</span>
      </div>
    </div>
    {view.canRebook && (
      <button className={sheet.wide48} onClick={view.rebook}>
        Book again
      </button>
    )}
  </div>
);

/** Receipt, resend or refund over the past sheet. */
export const PastCheckout = ({ studio }: { studio: StudioController }) => {
  const checkout = getPastCheckoutView(studio);

  return checkout ? <StudioCheckout studio={studio} {...checkout} /> : null;
};
