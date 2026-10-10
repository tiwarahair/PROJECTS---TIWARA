import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { ChevronRight, ContactLinks } from "./booking-sheet";
import { getPastCheckoutView } from "./past-sheet-view";
import type { PastSheetView } from "./past-sheet-view";
import { StudioCheckout } from "./studio-checkout";
import type { StudioController } from "./use-studio";
import bookingStyles from "./booking-sheet.module.css";
import styles from "./past-sheet.module.css";
import sheet from "./studio-sheet.module.css";

const asStyle = (values: Record<string, string>) => values as CSSProperties;

const Icon = ({
  d,
  size = 18,
  stroke = "currentColor",
  width = "1.7",
  className,
}: {
  d: string;
  size?: number;
  stroke?: string;
  width?: string;
  className?: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d}></path>
  </svg>
);

const REFUND_ICON = "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3";

/** The status pill in the sheet header (prototype pastS.badge*). */
export const PastBadge = ({ view }: { view: PastSheetView }) => (
  <span
    className={styles.badge}
    // the status tone comes from PAST_TONE at runtime
    style={asStyle({
      "--badge-bg": view.badgeBg,
      "--badge-color": view.badgeColor,
    })}
  >
    <Icon d={view.badgeIcon} size={11} width="2.6" />
    {view.status}
  </span>
);

const RefundTag = ({ label }: { label: string }) => (
  <span className={styles.tag}>
    <Icon d={REFUND_ICON} size={14} width="2" />
    {label}
  </span>
);

/** A finished, cancelled or no-show booking (prototype shPast). */
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
        {view.canOpen && <ChevronRight />}
      </div>
    </div>
    <div className={styles.service}>
      <div className={styles.grow}>
        <div className={styles.serviceName}>{view.svc}</div>
        <div className={styles.when}>{view.when + " · " + view.time}</div>
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
          <Icon
            className={styles.alertIcon}
            stroke="var(--accent-700)"
            d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
          />
          <div className={styles.minWidth}>
            <div className={styles.unpaidTitle}>{view.fuTitle}</div>
            <div className={styles.panelBody}>{view.fuBody}</div>
          </div>
        </div>
        <div className={styles.buttons}>
          {view.fuRetryShow && (
            <button className={styles.retry} onClick={view.fuRetry}>
              {view.fuRetryLabel}
            </button>
          )}
          <button className={styles.whiteButton} onClick={view.fuLink}>
            Send payment link
          </button>
          <button className={styles.whiteButton} onClick={view.fuRecord}>
            Record as paid
          </button>
          <button className={styles.waive} onClick={view.fuWaive}>
            Waive fee
          </button>
        </div>
      </div>
    )}
    {view.feeRefundTag && <RefundTag label={view.feeRefundTag} />}
    {view.feeMerge && (
      <div className={styles.merge}>
        <div className={styles.minWidth}>
          <div className={styles.mergeTitle}>{view.actTitle}</div>
          <div className={styles.mergeBody}>{view.feeReason}</div>
        </div>
        <button className={styles.feeAct} onClick={view.feeAct ?? undefined}>
          {view.feeActLabel}
        </button>
      </div>
    )}
    {view.hasNote && <div className={styles.note}>{view.note}</div>}
    {view.hasAct && (
      <div className={styles.actRow}>
        {view.actHasText && (
          <div className={styles.grow}>
            <div className={styles.actTitle}>{view.actTitle}</div>
            <div className={styles.actWhy}>{view.actWhy}</div>
          </div>
        )}
        <button className={styles.act} onClick={view.act ?? undefined}>
          <Icon d="M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13" size={14} />
          {view.actLabel}
        </button>
      </div>
    )}
    {view.hasAwait && (
      <div className={styles.awaiting}>
        <div className={styles.alertRow}>
          <Icon
            className={styles.alertIcon}
            stroke="var(--neutral-700)"
            d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"
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
          <Icon
            stroke="var(--neutral-600)"
            d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6"
          />
          <span className={styles.linkLabel}>View receipt</span>
          <Icon size={16} stroke="var(--neutral-500)" d="m9 18 6-6-6-6" />
        </button>
        <button className={styles.linkRow} onClick={view.resendReceipt}>
          <Icon
            stroke="var(--neutral-600)"
            d="M22 2 11 13M22 2l-7 20-4-9-9-4z"
          />
          <span className={styles.linkLabel}>Resend receipt</span>
          <Icon size={16} stroke="var(--neutral-500)" d="m9 18 6-6-6-6" />
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

/** Total, what was kept / paid, and Book again (prototype shPast footer). */
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

/** Receipt, resend or refund over the past sheet (prototype ckOn with pastCk). */
export const PastCheckout = ({ studio }: { studio: StudioController }) => {
  const checkout = getPastCheckoutView(studio);
  return checkout ? <StudioCheckout studio={studio} {...checkout} /> : null;
};
