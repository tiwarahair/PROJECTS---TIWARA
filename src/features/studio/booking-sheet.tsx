import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { getAddBookingView } from "./add-booking-view";
import { getAddonDialog, getEditServiceView } from "./booking-edit-view";
import type { EditServiceView } from "./booking-edit-view";
import { AddonEditDialog } from "./booking-dialogs";
import { getBookingSheetView } from "./booking-sheet-view";
import type { BookingSheetView } from "./booking-sheet-view";
import {
  AddonPickerList,
  CancelStep,
  ChangeClientStep,
  ChangeServiceStep,
  EditServiceStep,
  NoShowPanel,
  RescheduleStep,
} from "./booking-steps";
import { StudioCheckout } from "./studio-checkout";
import type { StudioController } from "./use-studio";
import styles from "./booking-sheet.module.css";
import stepStyles from "./booking-steps.module.css";
import sheet from "./studio-sheet.module.css";

const asStyle = (values: Record<string, string>) => values as CSSProperties;

const CONTACT_ICONS = {
  call: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.8 2.1z",
  text: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-10 7L2 7",
};

/** Call / text / email buttons beside a client (booking and past sheets). */
export const ContactLinks = ({
  telHref,
  smsHref,
  mailHref,
  hasPhone,
  hasEmail,
}: {
  telHref: string;
  smsHref: string;
  mailHref: string;
  hasPhone: boolean;
  hasEmail: boolean;
}) => {
  const link = (href: string, label: string, d: string) => (
    <a
      className={styles.contact}
      href={href}
      onClick={(event) => event.stopPropagation()}
      aria-label={label}
      title={label}
    >
      <span className={styles.hitArea} aria-hidden="true"></span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={d}></path>
      </svg>
    </a>
  );
  return (
    <span className={styles.contacts}>
      {hasPhone && link(telHref, "Call client", CONTACT_ICONS.call)}
      {hasPhone && link(smsHref, "Text client", CONTACT_ICONS.text)}
      {hasEmail && link(mailHref, "Email client", CONTACT_ICONS.mail)}
    </span>
  );
};

const ChevronRight = ({
  stroke = "var(--neutral-500)",
}: {
  stroke?: string;
}) => (
  <svg
    className={styles.noShrink}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6"></path>
  </svg>
);

const BookingMain = ({
  studio,
  view,
  edit,
}: {
  studio: StudioController;
  view: BookingSheetView;
  edit: EditServiceView;
}) => {
  const { state, setState } = studio;
  const { booking } = view;
  const isHovering = !!state.cliHov && view.isView;
  const hasClientActions = isHovering && !view.isClientLocked;
  const isServiceHover = !!state.svcHov;
  return (
    <>
      <div
        className={joinClassNames(styles.main, state.bkBack && styles.mainBack)}
      >
        {booking.autoX && (
          <div className={styles.autoCancelled}>
            <div className={styles.autoLabel}>Auto-cancelled</div>
            <div className={styles.autoBody}>
              {"The payment link expired on " +
                booking.expiryLabel +
                " without being confirmed, so the slot was released."}
            </div>
          </div>
        )}
        <div
          className={styles.clientRow}
          onMouseEnter={() => setState({ cliHov: true })}
          onMouseLeave={() => setState({ cliHov: false })}
        >
          <div
            className={styles.clientOpen}
            role="button"
            tabIndex={0}
            onClick={view.openClient}
            aria-label="Open client profile"
          >
            <img className={styles.avatar52} src={booking.imgSrc} alt="" />
            <span className={styles.grow}>
              <span className={styles.clientName}>{booking.clientName}</span>
              <span className={styles.clientMeta}>
                {booking.visitLabel + booking.sinceLabel}
              </span>
            </span>
            {!hasClientActions && (
              <ContactLinks
                telHref={booking.telHref}
                smsHref={booking.smsHref}
                mailHref={booking.mailHref}
                hasPhone={booking.hasPhone}
                hasEmail={booking.hasEmail}
              />
            )}
            <ChevronRight />
          </div>
          {hasClientActions && (
            <span className={styles.clientActions}>
              <button
                className={styles.roundButton}
                onClick={view.changeClient}
                aria-label="Change client"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8h13l-3-3M21 16H8l3 3"></path>
                </svg>
              </button>
              {!!booking.client && (
                <button
                  className={joinClassNames(
                    styles.roundButton,
                    styles.roundDanger,
                  )}
                  onClick={view.clearClient}
                  aria-label="Make this a walk-in"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"></path>
                  </svg>
                </button>
              )}
            </span>
          )}
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Status</span>
          <span className={styles.statusEnd}>
            {booking.unpaidFlag && (
              <span className={styles.unpaid}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path>
                </svg>
                Unpaid
              </span>
            )}
            <span className={styles.statusHolder}>
              <button
                className={styles.statusButton}
                style={asStyle({
                  "--st-bg": booking.stBg,
                  "--st-border": booking.stBorder,
                  "--st-color": booking.stColor,
                })}
                onClick={() => setState({ stMenu: !state.stMenu })}
              >
                {booking.stDot && <span className={styles.pulse}></span>}
                {booking.stLabel}
                <svg
                  className={joinClassNames(
                    styles.chevron,
                    state.stMenu && styles.chevronOpen,
                  )}
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              {state.stMenu && (
                <>
                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                  <span
                    className={styles.menuScrim}
                    onClick={() => setState({ stMenu: false })}
                  ></span>
                  <span className={styles.statusMenu}>
                    {view.statusItems.map(
                      ({ label, d, sub, off, danger, run }) => (
                        <button
                          key={label}
                          className={joinClassNames(
                            styles.menuItem,
                            off && styles.menuItemOff,
                          )}
                          onClick={run}
                          disabled={!!off}
                        >
                          <svg
                            className={styles.menuIcon}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={danger ? "#a12a2a" : "var(--text-primary)"}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d={d}></path>
                          </svg>
                          <span className={styles.grow}>
                            <span
                              className={joinClassNames(
                                styles.menuLabel,
                                danger && styles.dangerText,
                              )}
                            >
                              {label}
                            </span>
                            {!!sub && (
                              <span className={styles.menuSub}>{sub}</span>
                            )}
                          </span>
                        </button>
                      ),
                    )}
                  </span>
                </>
              )}
            </span>
          </span>
        </div>
        {!!booking.note && (
          <figure className={styles.note}>
            <figcaption className={styles.noteCaption}>
              {"Note from " + booking.firstName}
            </figcaption>
            <blockquote className={styles.noteQuote}>
              {"“" + booking.note + "”"}
            </blockquote>
          </figure>
        )}
      </div>
      {!!view.sens && (
        <div className={styles.sens}>
          <svg
            className={styles.noShrink}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b5541f"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"></path>
          </svg>
          {view.sens}
        </div>
      )}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.service,
          view.isView && styles.serviceClickable,
          isServiceHover && styles.serviceHover,
        )}
        onClick={() => {
          if (view.isView) studio.serviceActions.esOpen(booking);
        }}
        onMouseEnter={() => setState({ svcHov: true })}
        onMouseLeave={() => setState({ svcHov: false })}
      >
        <div className={styles.serviceTop}>
          <div className={styles.grow}>
            <div className={styles.eyebrow}>{booking.catLabel}</div>
            <div className={styles.serviceName}>{booking.svc}</div>
            <div className={styles.when}>
              {booking.dayLabel + " · " + booking.timeRange}
            </div>
            <div className={styles.duration}>{booking.durLabel}</div>
            {booking.movedByClient && (
              <div className={styles.moved}>
                {"Moved once by " +
                  booking.firstName +
                  ". Free reschedule used."}
              </div>
            )}
          </div>
          <div className={styles.priceCell}>
            <div className={styles.priceLayer}>
              <div className={styles.price}>{booking.priceLabel}</div>
              {view.isView && (
                <button
                  className={styles.editLink}
                  onClick={() => studio.serviceActions.esOpen(booking)}
                >
                  Edit
                </button>
              )}
            </div>
            {view.isView && (
              <div className={styles.iconLayer}>
                <button
                  className={styles.editIcon}
                  onClick={() => studio.serviceActions.esOpen(booking)}
                  aria-label="Edit service"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        {edit.bookingAddons.length > 0 && (
          <div className={styles.addons}>
            {edit.bookingAddons.map(({ key, name, meta }) => (
              <div key={key} className={styles.addonLine}>
                <span className={styles.primaryText}>{name}</span>
                <span className={styles.addonMeta}>{meta}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {booking.awaiting && (
        <div className={styles.awaiting}>
          <svg
            className={styles.noShrink}
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b5a10"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 7v5l3 2"></path>
          </svg>
          <div className={styles.grow}>
            <div className={styles.awaitingTitle}>
              {"Auto-cancels " + booking.expiryLabel}
            </div>
            <div className={styles.muted135}>{booking.hoursLeft}</div>
          </div>
        </div>
      )}
      {state.profile.mobile && (
        <div className={styles.panel}>
          <svg
            className={styles.panelIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <div className={styles.grow}>
            <div className={styles.panelLabel}>Client location</div>
            {!state.bkLocOn && (
              <div
                className={joinClassNames(
                  styles.panelValue,
                  !booking.addr && styles.panelValueEmpty,
                )}
              >
                {booking.addrLabel}
              </div>
            )}
            {state.bkLocOn && (
              <input
                className={styles.addressInput}
                value={state.bkAddrDraft}
                onChange={(event) =>
                  setState({ bkAddrDraft: event.target.value })
                }
                placeholder="Street, postcode"
              />
            )}
          </div>
          <button className={styles.textAction} onClick={view.toggleLocation}>
            {state.bkLocOn ? "Save" : booking.addr ? "Edit" : "Add"}
          </button>
        </div>
      )}
      {booking.awaiting && (
        <div className={styles.panel}>
          <svg
            className={styles.panelIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z"></path>
            <path d="M22 2 11 13"></path>
          </svg>
          <div className={styles.grow}>
            <div className={styles.panelLabel}>{booking.protWord}</div>
            <div className={styles.panelValue}>
              {"Link sent to " +
                booking.firstName +
                " " +
                booking.linkSentLabel}
            </div>
            <div className={styles.linkActions}>
              <button
                className={joinClassNames(
                  styles.pill,
                  !booking.canResend && styles.pillOff,
                )}
                onClick={view.resend}
                disabled={!booking.canResend}
              >
                {booking.resendLabel}
              </button>
              <button className={styles.pill} onClick={view.copyPaymentLink}>
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}
      {booking.noProtect && !booking.autoX && (
        <div className={styles.noProtect}>
          <svg
            className={styles.menuIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path>
            <path d="m4 3 16 18"></path>
          </svg>
          <div className={styles.noProtectText}>
            <span className={styles.strong}>No booking protection.</span>
            {" Cancellation and no-show fees can't be charged."}
          </div>
        </div>
      )}
      {!state.bkNoteOn && booking.hasStNote && (
        <button
          className={styles.ownNote}
          onClick={() =>
            setState({ bkNoteOn: true, bkNoteDraft: booking.stylistNote })
          }
        >
          <span className={styles.strong}>Your note:</span>{" "}
          {booking.stylistNote}
        </button>
      )}
      {!state.bkNoteOn && booking.noStNote && (
        <button
          className={styles.addNote}
          onClick={() =>
            setState({ bkNoteOn: true, bkNoteDraft: booking.stylistNote })
          }
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          Add a note only you can see
        </button>
      )}
      {state.bkNoteOn && (
        <div className={styles.noteEditor}>
          <textarea
            className={styles.noteInput}
            value={state.bkNoteDraft}
            onChange={(event) => setState({ bkNoteDraft: event.target.value })}
            rows={3}
            placeholder="e.g. Bring the 30 colour, she wants it longer this time"
          ></textarea>
          <div className={styles.noteActions}>
            <button
              className={styles.noteCancel}
              onClick={() => setState({ bkNoteOn: false })}
            >
              Cancel
            </button>
            <button className={styles.noteSave} onClick={view.saveNote}>
              Save note
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const PaymentStep = ({ view }: { view: BookingSheetView }) => {
  const { booking } = view;
  return (
    <div className={styles.payment}>
      <div className={styles.paymentHead}>
        <span className={styles.secondary145}>
          {booking.svc + " · " + booking.dayLabel}
        </span>
        <span
          className={styles.payBadge}
          style={asStyle({
            "--pay-bg": booking.payBg,
            "--pay-color": booking.payColor,
          })}
        >
          {booking.payLabel}
        </span>
      </div>
      <div>
        <div className={styles.sectionLabel}>Price</div>
        {view.payLines.map(({ key, label, value }) => (
          <div key={key} className={styles.line}>
            <span className={styles.primaryText}>{label}</span>
            <span className={styles.numeric}>{value}</span>
          </div>
        ))}
        <div className={styles.lineTotal}>
          <span>Total</span>
          <span className={styles.numeric}>{booking.priceLabel}</span>
        </div>
      </div>
      <div>
        <div className={styles.sectionLabel}>Payments</div>
        {view.payReceived.map(({ key, label, sub, value, tone }) => (
          <div key={key} className={styles.line}>
            <span className={styles.minWidth}>
              <span className={styles.blockPrimary}>{label}</span>
              <span className={styles.lineSub}>{sub}</span>
            </span>
            <span
              className={joinClassNames(
                styles.received,
                tone === "paid" && styles.receivedPaid,
                tone === "failed" && styles.receivedFailed,
              )}
            >
              {value}
            </span>
          </div>
        ))}
        <div className={styles.lineTotal}>
          <span>{view.payRowLabel}</span>
          <span className={styles.numeric}>{booking.dueLabel}</span>
        </div>
      </div>
      <div className={styles.feeBox}>
        <div className={styles.feeLine}>
          <span className={styles.ink700}>
            {"Booking fee, paid by " + view.feeWho}
          </span>
          <span className={styles.inkNumeric}>{view.payFeeLabel}</span>
        </div>
        <div className={styles.feeNote}>
          {"£0.50 + 1.5% on top of your price. You keep the full " +
            booking.priceLabel +
            "."}
        </div>
      </div>
    </div>
  );
};

/** The booking sheet's body for every step (prototype Studio.dc.html lines 1819–2370). */
export const BookingSheetBody = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingSheetView;
}) => {
  const { state, actions } = studio;
  const edit = getEditServiceView(studio, view.booking, view.patchBooking);
  return (
    <>
      {state.bkStep === "payment" && <PaymentStep view={view} />}
      {view.isMain && <BookingMain studio={studio} view={view} edit={edit} />}
      {state.bkStep === "done" && (
        <div className={styles.done}>
          <div className={styles.doneIcon}>
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
          </div>
          <div className={styles.doneTitle}>{view.doneTitle}</div>
          <div className={styles.doneBody}>{view.doneBody}</div>
          <button className={styles.rebook} onClick={view.rebook}>
            {"Rebook " + view.booking.firstName}
          </button>
          <button className={styles.doneButton} onClick={actions.closeSheet}>
            Done
          </button>
        </div>
      )}
      {state.bkStep === "editsvc" && (
        <EditServiceStep studio={studio} edit={edit} />
      )}
      {state.bkStep === "changesvc" && (
        <ChangeServiceStep studio={studio} edit={edit} />
      )}
      {state.bkStep === "changeclient" && (
        <ChangeClientStep studio={studio} view={view} />
      )}
      {state.bkStep === "addaddon" && (
        <AddonPickerList
          className={joinClassNames(
            stepStyles.pane,
            state.bkOut && stepStyles.paneOut,
          )}
          picker={edit.picker}
        />
      )}
      {state.bkStep === "resched" && (
        <RescheduleStep studio={studio} view={view} />
      )}
      {state.bkStep === "cancel" && <CancelStep studio={studio} view={view} />}
    </>
  );
};

/** Panels and footers under the booking sheet's body. */
export const BookingSheetAfter = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingSheetView;
}) => {
  const { state } = studio;
  const { booking } = view;
  const step = state.bkStep;
  const edit =
    step === "editsvc"
      ? getEditServiceView(studio, booking, view.patchBooking)
      : null;
  const go = () => {
    const run =
      step === "cancel"
        ? view.cancel
        : step === "editsvc"
          ? edit?.apply
          : view.reschedule;
    run?.();
  };
  const isFooterOff = step === "resched" && !view.canMove;
  return (
    <>
      {step === "noshow" && <NoShowPanel studio={studio} view={view} />}
      {step === "view" && (
        <div className={joinClassNames(sheet.footer, sheet.footerTall)}>
          <div className={sheet.totals}>
            <div className={sheet.totalLine}>
              <span>Total</span>
              <span className={sheet.numeric}>{booking.priceLabel}</span>
            </div>
            <div className={sheet.totalLine}>
              <span>Paid</span>
              <span className={sheet.numeric}>{booking.paidLabel}</span>
            </div>
            <button
              className={sheet.payRow}
              onClick={view.openPayment}
              aria-label="See payment breakdown"
            >
              <span className={sheet.payLabel}>
                {view.payRowLabel}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </span>
              <span className={sheet.amount}>{booking.dueLabel}</span>
            </button>
          </div>
          <div className={sheet.actions}>
            {view.hasMore && (
              <button
                className={sheet.more}
                onClick={view.more}
                aria-label="More actions"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="5" r="1.8"></circle>
                  <circle cx="12" cy="12" r="1.8"></circle>
                  <circle cx="12" cy="19" r="1.8"></circle>
                </svg>
              </button>
            )}
            <button className={sheet.secondary} onClick={view.bookAgain}>
              Book again
            </button>
            {view.canCheckout && (
              <button className={sheet.primary} onClick={view.goCheckout}>
                Checkout
              </button>
            )}
          </div>
        </div>
      )}
      {(step === "resched" || step === "cancel" || step === "editsvc") && (
        <div className={sheet.footer}>
          {step === "editsvc" && edit && (
            <div className={sheet.totalBar}>
              <span className={sheet.h3}>Total</span>
              <span className={sheet.amount15}>{edit.totalLabel}</span>
            </div>
          )}
          <div className={sheet.row10}>
            {step === "cancel" && (
              <button
                className={sheet.reschedule}
                onClick={() =>
                  studio.setState({
                    bkStep: "resched",
                    rsDay: null,
                    rsTime: null,
                    rsCustom: false,
                  })
                }
              >
                Reschedule instead
              </button>
            )}
            <button
              className={joinClassNames(
                sheet.go,
                step === "cancel" && sheet.goEqual,
                isFooterOff && sheet.faded,
              )}
              onClick={go}
              disabled={isFooterOff}
            >
              {step === "cancel"
                ? "Cancel booking"
                : step === "editsvc"
                  ? "Apply"
                  : "Move booking"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/** The embedded checkout over the booking sheet (prototype ckOn, "Checkout"). */
export const BookingCheckout = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingSheetView;
}) => (
  <StudioCheckout
    studio={studio}
    booking={view.checkoutBooking}
    onExit={() => studio.setState({ bkStep: "view" })}
    onComplete={(result, action) =>
      view.onCheckoutComplete({ ...result, tip: result.tip ?? 0 }, action)
    }
  />
);

/** The add-on dialog over Edit service or New booking (rendered with the other dialogs, as in the prototype). */
export const BookingAddonDialog = ({
  studio,
}: {
  studio: StudioController;
}) => {
  const { esAddon, sheet } = studio.state;
  if (!esAddon) return null;
  if (esAddon.ctx === "add") {
    if (sheet !== "add") return null;
    const dialog = {
      ...getAddonDialog(studio, esAddon),
      ...getAddBookingView(studio).addonDialog(esAddon),
    };
    return <AddonEditDialog studio={studio} dialog={dialog} />;
  }
  const view = getBookingSheetView(studio);
  if (!view) return null;
  const { addonDialog } = getEditServiceView(
    studio,
    view.booking,
    view.patchBooking,
  );
  return addonDialog ? (
    <AddonEditDialog studio={studio} dialog={addonDialog} />
  ) : null;
};

export { ChevronRight };
