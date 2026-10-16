import { Star, Sun } from "lucide-react";
import type { CSSProperties } from "react";
import { resolveAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { getWhenLine } from "./logic/calendar";
import { getPreviewIndex, hasPreview, PREVIEW_POOL } from "./logic/content";
import { getSummaryWhere } from "./logic/details";
import pageGlobal from "../../styles/features/booking/page-global.module.css";
import { HoldBar } from "./hold-bar";
import styles from "../../styles/features/booking/summary.module.css";
import type { BookingController } from "./hooks/use-booking";

interface BookingSummaryProps {
  booking: BookingController;
}

const toImage = (path: string) => `url("${resolveAssetUrl(path)}")`;

/** The sticky aside: AI preview (braids), cover photo, hold bar, the booking summary and "See AI preview". */
export const BookingSummary = ({ booking }: BookingSummaryProps) => {
  const {
    state,
    stylist,
    service,
    options,
    money,
    customisationLine,
    address,
    holdOn,
    holdLeftMs,
    actions,
  } = booking;

  const { showPrev, selection, step } = state;
  // reads the window width on each render (no resize listener)
  const isMobile = window.innerWidth <= 960;
  const canPreview = hasPreview(options.length.map(({ label }) => label));
  const previewIndex = getPreviewIndex(selection.length, selection.colour);
  const previewPath = PREVIEW_POOL[previewIndex] ?? "";

  const previewStyle = {
    "--preview-image": toImage(previewPath),
  } as CSSProperties;

  const coverStyle = {
    "--cover-image": stylist.cover ? toImage(stylist.cover) : "none",
  } as CSSProperties;

  const motion = isMobile ? styles.motionMobile : styles.motionDesktop;
  const totalLabel = service ? money.total : "—";

  const previewOpenClass = isMobile
    ? styles.previewBoxOpenMobile
    : styles.previewBoxOpen;

  return (
    <div className={joinClassNames(pageGlobal.bksum, styles.aside)}>
      <div
        className={joinClassNames(
          pageGlobal.prevshell,
          step !== 2 && pageGlobal.prevshellOff,
          styles.previewShell,
          showPrev ? styles.previewShellOpen : styles.previewShellClosed,
          motion,
        )}
      >
        <div
          className={joinClassNames(
            pageGlobal.aiprev,
            styles.previewBox,
            showPrev ? previewOpenClass : styles.previewBoxClosed,
            isMobile ? styles.previewBoxMobile : styles.previewBoxDesktop,
            motion,
          )}
          style={previewStyle}
        >
          {PREVIEW_POOL.map((path, index) => {
            const layerStyle = {
              "--layer-image": toImage(path),
            } as CSSProperties;

            return (
              <div
                key={path}
                role="img"
                aria-label="Style preview"
                className={joinClassNames(
                  styles.layer,
                  isMobile ? styles.layerMobile : styles.layerDesktop,
                  index === previewIndex ? styles.layerOn : styles.layerOff,
                )}
                style={layerStyle}
              ></div>
            );
          })}
          <div className={styles.previewTags}>
            <span className={styles.previewTag}>AI preview</span>
            <button
              onClick={() => actions.setState({ showPrev: false })}
              className={joinClassNames(pageGlobal.aihide, styles.hide)}
            >
              Hide
            </button>
          </div>
          <span className={styles.previewCaption}>
            {customisationLine || "No add-ons"}
          </span>
        </div>
      </div>
      <div className={joinClassNames(pageGlobal.sumcard, styles.card)}>
        <div
          role="img"
          aria-label={stylist.name}
          className={joinClassNames(
            pageGlobal.sumcover,
            showPrev && pageGlobal.sumcoverHidden,
            styles.cover,
            showPrev ? styles.coverHidden : styles.coverShown,
            motion,
          )}
          style={coverStyle}
        ></div>
        {holdOn && (
          <HoldBar variant="card" time={state.time} leftMs={holdLeftMs} />
        )}
        {!showPrev && (
          <div className={styles.body}>
            <div className={styles.name}>{stylist.name}</div>
            <div className={styles.meta}>
              {`${stylist.area} · `}
              <Star
                className={styles.ratingStar}
                size={12}
                strokeWidth={0}
                fill="var(--brand-yellow)"
              />{" "}
              {stylist.reviews ? stylist.rating : "New"}
            </div>
            <div className={styles.section}>
              <div className={styles.row}>
                <span className={styles.muted}>Service</span>
                <span className={styles.serviceValue}>
                  {service ? service.name : "—"}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.muted}>Options</span>
                <span className={styles.value}>
                  {step >= 2 ? customisationLine : "—"}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.muted}>When</span>
                <span className={styles.value}>
                  {getWhenLine(
                    state.calendarYear,
                    state.calendarMonth,
                    state.date,
                    state.time,
                  )}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.whereLabel}>Where</span>
                <span className={styles.whereValue}>
                  {getSummaryWhere(stylist, address.clientAddress)}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.muted}>Duration</span>
                <span>{money.duration}</span>
              </div>
            </div>
            {service ? (
              <div className={styles.section}>
                <div className={styles.moneyRow}>
                  <span className={styles.muted}>Service</span>
                  <span>{money.price}</span>
                </div>
                <div className={styles.moneyRow}>
                  <span className={styles.muted}>Booking fee</span>
                  <span>{money.fee}</span>
                </div>
                <div className={styles.totalRow}>
                  <span>Total</span>
                  <span>{money.total}</span>
                </div>
                <div className={styles.dueRow}>
                  <span>Due today</span>
                  <span>{money.dueToday}</span>
                </div>
                {money.policy.balance > 0 && (
                  <div className={styles.balanceRow}>
                    <span>Balance at your appointment</span>
                    <span>{money.balance}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.empty}>Pick a service to see pricing.</div>
            )}
          </div>
        )}
        {showPrev && canPreview && (
          <div className={styles.compact}>
            <div className={styles.compactText}>
              <div className={styles.compactName}>
                {service ? service.name : "—"}
              </div>
              <div className={styles.compactDuration}>{money.duration}</div>
            </div>
            <div className={styles.compactTotal}>{totalLabel}</div>
          </div>
        )}
      </div>
      {step === 2 && !showPrev && canPreview && (
        <button
          onClick={() => actions.setState({ showPrev: true })}
          className={joinClassNames(pageGlobal.aiBtn, styles.aiButton)}
        >
          <Sun size={16} strokeWidth={1.6} /> See AI preview
        </button>
      )}
    </div>
  );
};
