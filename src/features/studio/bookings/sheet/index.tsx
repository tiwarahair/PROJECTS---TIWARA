import type { CSSProperties } from "react";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  EllipsisVertical,
  MapPin,
  PenLine,
  Plus,
  Send,
  ShieldOff,
  Trash,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import { getAddBookingView } from "../add/view";
import { getAddonDialog, getEditServiceView } from "../edit-view";
import type { EditServiceView } from "../edit-view";
import { AddonEditDialog } from "../dialogs";
import { getBookingSheetView } from "./view";
import type { BookingSheetView } from "./view";
import {
  AddonPickerList,
  CancelStep,
  ChangeClientStep,
  ChangeServiceStep,
  EditServiceStep,
  NoShowPanel,
  RescheduleStep,
} from "../steps";
import { StudioCheckout } from "../checkout";
import { CONTACT_ICONS } from "../../core/data";
import type { StudioController } from "../../core/use-studio";
import styles from "../../../../styles/features/studio/bookings/sheet/index.module.css";
import stepStyles from "../../../../styles/features/studio/bookings/steps.module.css";
import sheet from "../../../../styles/features/studio/shell/sheet-frame.module.css";

const asStyle = (values: Record<string, string>) => values as CSSProperties;

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
  const link = (href: string, label: string, ContactIcon: LucideIcon) => (
    <a
      className={styles.contact}
      href={href}
      onClick={(event) => event.stopPropagation()}
      aria-label={label}
      title={label}
    >
      <span className={styles.hitArea} aria-hidden="true"></span>
      <ContactIcon size={18} strokeWidth={1.7} />
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
  const isHovering = !!state.clientHover && view.isView;
  const hasClientActions = isHovering && !view.isClientLocked;
  const isServiceHover = !!state.serviceHover;

  const getLocationLabel = () => {
    if (state.bookingAddressOn) return "Save";

    return booking.address ? "Edit" : "Add";
  };

  return (
    <>
      <div
        className={joinClassNames(
          styles.main,
          state.bookingStepBack && styles.mainBack,
        )}
      >
        {booking.autoX && (
          <div className={styles.autoCancelled}>
            <div className={styles.autoLabel}>Auto-cancelled</div>
            <div className={styles.autoBody}>
              {`The payment link expired on ${booking.expiryLabel} without being confirmed, so the slot was released.`}
            </div>
          </div>
        )}
        <div
          className={styles.clientRow}
          onMouseEnter={() => setState({ clientHover: true })}
          onMouseLeave={() => setState({ clientHover: false })}
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
            <ChevronRight
              className={styles.noShrink}
              size={18}
              strokeWidth={1.7}
              color="var(--neutral-500)"
            />
          </div>
          {hasClientActions && (
            <span className={styles.clientActions}>
              <button
                className={styles.roundButton}
                onClick={view.changeClient}
                aria-label="Change client"
              >
                <ArrowRightLeft size={16} strokeWidth={1.7} />
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
                  <Trash size={16} strokeWidth={1.7} />
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
                <TriangleAlert size={12} strokeWidth={2} />
                Unpaid
              </span>
            )}
            <span className={styles.statusHolder}>
              <button
                className={styles.statusButton}
                style={asStyle({
                  "--st-bg": booking.statusBackground,
                  "--st-border": booking.statusBorder,
                  "--st-color": booking.statusColor,
                })}
                onClick={() =>
                  setState({ statusMenuOpen: !state.statusMenuOpen })
                }
              >
                {booking.statusDot && <span className={styles.pulse}></span>}
                {booking.statusLabel}
                <ChevronDown
                  className={joinClassNames(
                    styles.chevron,
                    state.statusMenuOpen && styles.chevronOpen,
                  )}
                  size={13}
                  strokeWidth={2.2}
                />
              </button>
              {state.statusMenuOpen && (
                <>
                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                  <span
                    className={styles.menuScrim}
                    onClick={() => setState({ statusMenuOpen: false })}
                  ></span>
                  <span className={styles.statusMenu}>
                    {view.statusItems.map(
                      ({
                        label,
                        icon: ItemIcon,
                        subtitle,
                        disabled,
                        danger,
                        run,
                      }) => (
                        <button
                          key={label}
                          className={joinClassNames(
                            styles.menuItem,
                            disabled && styles.menuItemOff,
                          )}
                          onClick={run}
                          disabled={!!disabled}
                        >
                          <ItemIcon
                            className={styles.menuIcon}
                            size={16}
                            strokeWidth={1.8}
                            color={danger ? "#a12a2a" : "var(--text-primary)"}
                          />
                          <span className={styles.grow}>
                            <span
                              className={joinClassNames(
                                styles.menuLabel,
                                danger && styles.dangerText,
                              )}
                            >
                              {label}
                            </span>
                            {!!subtitle && (
                              <span className={styles.menuSub}>{subtitle}</span>
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
              {`Note from ${booking.firstName}`}
            </figcaption>
            <blockquote className={styles.noteQuote}>
              {`“${booking.note}”`}
            </blockquote>
          </figure>
        )}
      </div>
      {!!view.sensitivities && (
        <div className={styles.sens}>
          <TriangleAlert
            className={styles.noShrink}
            size={16}
            strokeWidth={1.7}
            color="#b5541f"
          />
          {view.sensitivities}
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
          if (view.isView) studio.serviceActions.openAddonEdit(booking);
        }}
        onMouseEnter={() => setState({ serviceHover: true })}
        onMouseLeave={() => setState({ serviceHover: false })}
      >
        <div className={styles.serviceTop}>
          <div className={styles.grow}>
            <div className={styles.eyebrow}>{booking.categoryLabel}</div>
            <div className={styles.serviceName}>{booking.service}</div>
            <div className={styles.when}>
              {`${booking.dayLabel} · ${booking.timeRange}`}
            </div>
            <div className={styles.duration}>{booking.durationLabel}</div>
            {booking.movedByClient && (
              <div className={styles.moved}>
                {`Moved once by ${booking.firstName}. Free reschedule used.`}
              </div>
            )}
          </div>
          <div className={styles.priceCell}>
            <div className={styles.priceLayer}>
              <div className={styles.price}>{booking.priceLabel}</div>
              {view.isView && (
                <button
                  className={styles.editLink}
                  onClick={() => studio.serviceActions.openAddonEdit(booking)}
                >
                  Edit
                </button>
              )}
            </div>
            {view.isView && (
              <div className={styles.iconLayer}>
                <button
                  className={styles.editIcon}
                  onClick={() => studio.serviceActions.openAddonEdit(booking)}
                  aria-label="Edit service"
                >
                  <PenLine size={16} strokeWidth={1.7} />
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
          <Clock
            className={styles.noShrink}
            size={17}
            strokeWidth={1.8}
            color="#6b5a10"
          />
          <div className={styles.grow}>
            <div className={styles.awaitingTitle}>
              {`Auto-cancels ${booking.expiryLabel}`}
            </div>
            <div className={styles.muted135}>{booking.hoursLeft}</div>
          </div>
        </div>
      )}
      {state.profile.mobile && (
        <div className={styles.panel}>
          <MapPin
            className={styles.panelIcon}
            size={16}
            strokeWidth={1.7}
            color="var(--text-secondary)"
          />
          <div className={styles.grow}>
            <div className={styles.panelLabel}>Client location</div>
            {!state.bookingAddressOn && (
              <div
                className={joinClassNames(
                  styles.panelValue,
                  !booking.address && styles.panelValueEmpty,
                )}
              >
                {booking.addressLabel}
              </div>
            )}
            {state.bookingAddressOn && (
              <input
                className={styles.addressInput}
                value={state.bookingAddressDraft}
                onChange={(event) =>
                  setState({ bookingAddressDraft: event.target.value })
                }
                placeholder="Street, postcode"
              />
            )}
          </div>
          <button className={styles.textAction} onClick={view.toggleLocation}>
            {getLocationLabel()}
          </button>
        </div>
      )}
      {booking.awaiting && (
        <div className={styles.panel}>
          <Send
            className={styles.panelIcon}
            size={16}
            strokeWidth={1.7}
            color="var(--text-secondary)"
          />
          <div className={styles.grow}>
            <div className={styles.panelLabel}>{booking.protectionWord}</div>
            <div className={styles.panelValue}>
              {`Link sent to ${booking.firstName} ${booking.linkSentLabel}`}
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
          <ShieldOff
            className={styles.menuIcon}
            size={16}
            strokeWidth={1.7}
            color="var(--text-secondary)"
          />
          <div className={styles.noProtectText}>
            <span className={styles.strong}>No booking protection.</span>
            {" Cancellation and no-show fees can't be charged."}
          </div>
        </div>
      )}
      {!state.bookingNoteOn && booking.hasStylistNote && (
        <button
          className={styles.ownNote}
          onClick={() =>
            setState({
              bookingNoteOn: true,
              bookingNoteDraft: booking.stylistNote,
            })
          }
        >
          <span className={styles.strong}>Your note:</span>{" "}
          {booking.stylistNote}
        </button>
      )}
      {!state.bookingNoteOn && booking.noStylistNote && (
        <button
          className={styles.addNote}
          onClick={() =>
            setState({
              bookingNoteOn: true,
              bookingNoteDraft: booking.stylistNote,
            })
          }
        >
          <Plus size={13} strokeWidth={2.2} />
          Add a note only you can see
        </button>
      )}
      {state.bookingNoteOn && (
        <div className={styles.noteEditor}>
          <textarea
            className={styles.noteInput}
            value={state.bookingNoteDraft}
            onChange={(event) =>
              setState({ bookingNoteDraft: event.target.value })
            }
            rows={3}
            placeholder="e.g. Bring the 30 colour, she wants it longer this time"
          ></textarea>
          <div className={styles.noteActions}>
            <button
              className={styles.noteCancel}
              onClick={() => setState({ bookingNoteOn: false })}
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
          {`${booking.service} · ${booking.dayLabel}`}
        </span>
        <span
          className={styles.payBadge}
          style={asStyle({
            "--pay-bg": booking.payBackground,
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
        {view.payReceived.map(({ key, label, subtitle, value, tone }) => (
          <div key={key} className={styles.line}>
            <span className={styles.minWidth}>
              <span className={styles.blockPrimary}>{label}</span>
              <span className={styles.lineSub}>{subtitle}</span>
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
            {`Booking fee, paid by ${view.feeWho}`}
          </span>
          <span className={styles.inkNumeric}>{view.payFeeLabel}</span>
        </div>
        <div className={styles.feeNote}>
          {`£0.50 + 1.5% on top of your price. You keep the full ${booking.priceLabel}.`}
        </div>
      </div>
    </div>
  );
};

/** The booking sheet's body for every step. */
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
      {state.bookingStep === "payment" && <PaymentStep view={view} />}
      {view.isMain && <BookingMain studio={studio} view={view} edit={edit} />}
      {state.bookingStep === "done" && (
        <div className={styles.done}>
          <div className={styles.doneIcon}>
            <Check size={26} strokeWidth={2.4} />
          </div>
          <div className={styles.doneTitle}>{view.doneTitle}</div>
          <div className={styles.doneBody}>{view.doneBody}</div>
          <button className={styles.rebook} onClick={view.rebook}>
            {`Rebook ${view.booking.firstName}`}
          </button>
          <button className={styles.doneButton} onClick={actions.closeSheet}>
            Done
          </button>
        </div>
      )}
      {state.bookingStep === "editsvc" && (
        <EditServiceStep studio={studio} edit={edit} />
      )}
      {state.bookingStep === "changesvc" && (
        <ChangeServiceStep studio={studio} edit={edit} />
      )}
      {state.bookingStep === "changeclient" && (
        <ChangeClientStep studio={studio} view={view} />
      )}
      {state.bookingStep === "addaddon" && (
        <AddonPickerList
          className={joinClassNames(
            stepStyles.pane,
            state.bookingStepOut && stepStyles.paneOut,
          )}
          picker={edit.picker}
        />
      )}
      {state.bookingStep === "resched" && (
        <RescheduleStep studio={studio} view={view} />
      )}
      {state.bookingStep === "cancel" && (
        <CancelStep studio={studio} view={view} />
      )}
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
  const step = state.bookingStep;

  const edit =
    step === "editsvc"
      ? getEditServiceView(studio, booking, view.patchBooking)
      : null;

  const runStep = () => {
    const getRun = () => {
      if (step === "cancel") return view.cancel;

      if (step === "editsvc") return edit?.apply;

      return view.reschedule;
    };

    const run = getRun();

    run?.();
  };

  const getGoLabel = () => {
    if (step === "cancel") return "Cancel booking";

    if (step === "editsvc") return "Apply";

    return "Move booking";
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
                <ChevronRight size={16} strokeWidth={1.7} />
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
                <EllipsisVertical size={18} />
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
                    bookingStep: "resched",
                    rescheduleDay: null,
                    rescheduleTime: null,
                    rescheduleCustom: false,
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
              onClick={runStep}
              disabled={isFooterOff}
            >
              {getGoLabel()}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/** The embedded checkout over the booking sheet. */
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
    onExit={() => studio.setState({ bookingStep: "view" })}
    onComplete={(result, action) =>
      view.onCheckoutComplete({ ...result, tip: result.tip ?? 0 }, action)
    }
  />
);

/** The add-on dialog over Edit service or New booking (rendered with the other dialogs). */
export const BookingAddonDialog = ({
  studio,
}: {
  studio: StudioController;
}) => {
  const { addonEdit, sheet } = studio.state;

  if (!addonEdit) return null;

  if (addonEdit.context === "add") {
    if (sheet !== "add") return null;

    const dialog = {
      ...getAddonDialog(studio, addonEdit),
      ...getAddBookingView(studio).addonDialog(addonEdit),
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
