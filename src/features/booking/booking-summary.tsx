import type { CSSProperties } from "react";
import { resolveAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { getWhenLine } from "./booking-calendar";
import { getPreviewIndex, hasPreview, PREVIEW_POOL } from "./booking-content";
import { getSummaryWhere } from "./booking-details";
import helmet from "./booking-helmet.module.css";
import { HoldBar } from "./hold-bar";
import styles from "./booking-summary.module.css";
import type { BookingController } from "./use-booking";

interface BookingSummaryProps {
  booking: BookingController;
}

const toImage = (path: string) => 'url("' + resolveAssetUrl(path) + '")';

/** The sticky aside: AI preview (braids), cover photo, hold bar, the booking summary and "See AI preview". */
export const BookingSummary = ({ booking }: BookingSummaryProps) => {
  const {
    state,
    stylist,
    service,
    options,
    money,
    custLine,
    address,
    holdOn,
    holdLeftMs,
    actions,
  } = booking;
  const { showPrev, sel, step } = state;
  // the prototype reads the window width on each render (no resize listener)
  const isMobile = window.innerWidth <= 960;
  const canPreview = hasPreview(options.length.map(({ label }) => label));
  const previewIndex = getPreviewIndex(sel.length, sel.colour);
  const previewPath = PREVIEW_POOL[previewIndex] ?? "";
  // previewBoxStyle / coverShellStyle background images
  const previewStyle = {
    "--preview-image": toImage(previewPath),
  } as CSSProperties;
  const coverStyle = {
    "--cover-image": stylist.cover ? toImage(stylist.cover) : "none",
  } as CSSProperties;
  const motion = isMobile ? styles.motionMobile : styles.motionDesktop;
  const totalOr = service ? money.total : "—";

  return (
    <div className={joinClassNames(helmet.bksum, styles.aside)}>
      <div
        className={joinClassNames(
          helmet.prevshell,
          step !== 2 && helmet.prevshellOff,
          styles.previewShell,
          showPrev ? styles.previewShellOpen : styles.previewShellClosed,
          motion,
        )}
      >
        <div
          className={joinClassNames(
            helmet.aiprev,
            styles.previewBox,
            showPrev
              ? isMobile
                ? styles.previewBoxOpenMobile
                : styles.previewBoxOpen
              : styles.previewBoxClosed,
            isMobile ? styles.previewBoxMobile : styles.previewBoxDesktop,
            motion,
          )}
          style={previewStyle}
        >
          {PREVIEW_POOL.map((path, index) => {
            // previewPool p.style backgroundImage
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
              className={joinClassNames(helmet.aihide, styles.hide)}
            >
              Hide
            </button>
          </div>
          <span className={styles.previewCaption}>
            {custLine || "No add-ons"}
          </span>
        </div>
      </div>
      <div className={joinClassNames(helmet.sumcard, styles.card)}>
        <div
          role="img"
          aria-label={stylist.name}
          className={joinClassNames(
            helmet.sumcover,
            showPrev && helmet.sumcoverHidden,
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
              {stylist.area + " · ★ " + stylist.rating}
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
                  {step >= 2 ? custLine : "—"}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.muted}>When</span>
                <span className={styles.value}>
                  {getWhenLine(state.calY, state.calM, state.date, state.time)}
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
                  <span>{money.service}</span>
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
                {money.PL.balance > 0 && (
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
            <div className={styles.compactTotal}>{totalOr}</div>
          </div>
        )}
      </div>
      {step === 2 && !showPrev && canPreview && (
        <button
          onClick={() => actions.setState({ showPrev: true })}
          className={joinClassNames(helmet.aiBtn, styles.aiButton)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>{" "}
          See AI preview
        </button>
      )}
    </div>
  );
};
