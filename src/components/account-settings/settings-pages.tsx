import { useRef } from "react";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  Copy,
  Info,
  Lock,
  TriangleAlert,
} from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { TaxDetailsForm } from "../tax-details-form/tax-details-form";
import {
  ALWAYS_ON,
  CLIENT_MESSAGES,
  NOTIFICATION_GROUPS,
  getPayoutStatus,
  getTaxRows,
} from "./account-settings-logic";
import type { ChannelSetting, NotificationKey } from "./account-settings-logic";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import { CheckRow, SettingsSection, Switch } from "./settings-fields";
import shared from "../../styles/components/account-settings/account-settings.module.css";
import calendar from "../../styles/components/account-settings/settings-calendar.module.css";
import notifications from "../../styles/components/account-settings/settings-notifications.module.css";
import payouts from "../../styles/components/account-settings/settings-payouts.module.css";

interface PageProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

export const SettingsNotifications = ({
  settings: { state, setState, toast, backend },
}: PageProps) => {
  // saves run one at a time, in order
  const saving = useRef(Promise.resolve());

  const toggle = (key: NotificationKey, channel: keyof ChannelSetting) => {
    const before = state.notifications[key];
    const next = { ...before, [channel]: !before[channel] };

    setState(({ notifications: current }) => ({
      notifications: { ...current, [key]: next },
    }));

    saving.current = saving.current
      .then(() => backend.saveNotification(key, next))
      .then(
        () => toast("Notification settings saved"),
        () => {
          setState(({ notifications: current }) =>
            current[key] === next
              ? { notifications: { ...current, [key]: before } }
              : {},
          );

          toast("Your notification settings couldn’t be saved. Try again.");
        },
      );
  };

  return (
    <>
      {NOTIFICATION_GROUPS.map(([title, rows]) => (
        <SettingsSection key={title} label={title} heading={title}>
          <div className={notifications.groupCard}>
            <div className={notifications.groupHead} aria-hidden="true">
              <span></span>
              <span>Email</span>
              <span>SMS</span>
            </div>
            {rows.map(([key, label]) => (
              <div key={key} className={notifications.groupRow}>
                <span className={notifications.rowLabel}>{label}</span>
                {(
                  [
                    ["email", " by email"],
                    ["sms", " by SMS"],
                  ] as const
                ).map(([channel, suffix]) => (
                  <Switch
                    key={channel}
                    isOn={state.notifications[key][channel]}
                    label={label + suffix}
                    className={notifications.switchCell}
                    onToggle={() => toggle(key, channel)}
                  />
                ))}
              </div>
            ))}
          </div>
        </SettingsSection>
      ))}

      <SettingsSection
        label="Always on"
        heading="Always on"
        intro={
          <p className={shared.introText}>
            Sent by email and SMS. These can’t be turned off.
          </p>
        }
      >
        <div className={notifications.alwaysCard}>
          {ALWAYS_ON.map((label) => (
            <div key={label} className={notifications.alwaysRow}>
              <span className={notifications.alwaysLabel}>{label}</span>
              <span className={notifications.alwaysTag}>
                <Lock size={14} strokeWidth={1.5} />
                Always on
              </span>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        label="Messages clients receive"
        heading="Messages your clients receive"
      >
        <div className={shared.quietCard}>
          <p className={notifications.clientText}>
            Clients always get these, so they know where they stand.
          </p>
          <div className={shared.actions}>
            {CLIENT_MESSAGES.map((message) => (
              <span key={message} className={notifications.clientChip}>
                <Check
                  className={notifications.clientTick}
                  size={13}
                  strokeWidth={2}
                />
                {message}
              </span>
            ))}
          </div>
        </div>
      </SettingsSection>
      <p className={notifications.bellNote}>
        <Bell size={16} strokeWidth={1.7} />
        Everything also appears in your notification bell.
      </p>
    </>
  );
};

export const SettingsPayouts = ({ props }: PageProps) => {
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
          {!!props.isNew && (
            <div className={payouts.firstPayout}>
              <Info className={shared.infoIcon} size={16} strokeWidth={1.7} />
              Your first payout can take 7 to 14 days. Payments for your first 5
              bookings are released 24 hours after each appointment.
            </div>
          )}
          <p className={payouts.cardFees}>
            Card fees on balance payments taken through Tiwára’s House are
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

const GOOGLE_EMAIL = "amara.okonkwo@gmail.com";

export const SettingsCalendar = ({
  settings: { state, setState, toast, ask, connectGoogle },
  uid,
}: PageProps) => {
  const { google } = state;
  const icsUrl = `webcal://tiwaras.house/cal/${state.icsToken}.ics`;

  const setGoogle = (patch: Partial<typeof google>) =>
    setState(({ google: current }) => ({ google: { ...current, ...patch } }));

  return (
    <>
      <SettingsSection
        label="Google Calendar"
        heading="Google Calendar"
        intro={
          <p className={shared.introText}>
            Two-way: busy times block your booking page, and bookings appear in
            your calendar.
          </p>
        }
      >
        <div className={shared.card}>
          {google.state === "off" && (
            <button
              className={joinClassNames(shared.darkButton, shared.focusRing)}
              data-ac-in="1"
              onClick={connectGoogle}
            >
              Connect Google Calendar
            </button>
          )}
          {google.state === "connecting" && (
            <div className={calendar.connecting} aria-busy="true">
              <span className={calendar.connectingText}>
                Connecting to Google
              </span>
              <span className={calendar.skeletonLong} data-ac-sk="1"></span>
              <span className={calendar.skeletonShort} data-ac-sk="1"></span>
            </div>
          )}
          {google.state === "on" && (
            <>
              <div className={shared.row}>
                <div className={shared.rowText}>
                  <div className={shared.badgeRow}>
                    <span className={shared.rowValue}>{GOOGLE_EMAIL}</span>
                    <span className={calendar.connectedTag}>
                      <Check size={12} strokeWidth={2.4} />
                      Connected
                    </span>
                  </div>
                  <div className={shared.rowLabel}>Last synced 5 min ago</div>
                </div>
              </div>
              <div className={calendar.divider}></div>
              <div className={shared.strongText}>
                Check these calendars for busy times
              </div>
              <div className={calendar.calendarsHelp}>
                Only busy or free is used. Event details stay private.
              </div>
              <div className={calendar.calendars}>
                {(
                  [
                    ["main", GOOGLE_EMAIL],
                    ["family", "Family"],
                    ["holidays", "Holidays in the UK"],
                  ] as const
                ).map(([key, name]) => (
                  <CheckRow
                    key={key}
                    isOn={google.calendars[key]}
                    onToggle={() => {
                      setGoogle({
                        calendars: {
                          ...google.calendars,
                          [key]: !google.calendars[key],
                        },
                      });

                      toast("Calendar settings saved");
                    }}
                  >
                    <span className={calendar.calendarName}>{name}</span>
                  </CheckRow>
                ))}
              </div>
              <label className={calendar.targetLabel} htmlFor={`${uid}-gt`}>
                Add my bookings to
              </label>
              <span className={calendar.selectWrap}>
                <select
                  className={joinClassNames(calendar.select, shared.focusRing)}
                  data-ac-in="1"
                  id={`${uid}-gt`}
                  value={google.target}
                  onChange={(event) => {
                    setGoogle({ target: event.target.value });
                    toast("Calendar settings saved");
                  }}
                >
                  <option value="new">
                    Tiwára’s House bookings (new calendar)
                  </option>
                  <option value="main">{GOOGLE_EMAIL}</option>
                </select>
                <ChevronDown
                  className={calendar.selectChevron}
                  size={16}
                  strokeWidth={2}
                />
              </span>
              <div className={calendar.disconnectRow}>
                <button
                  className={joinClassNames(
                    calendar.disconnect,
                    shared.focusRing,
                  )}
                  data-ac-in="1"
                  onClick={() =>
                    ask(
                      {
                        title: "Disconnect Google Calendar?",
                        body: "Busy times will stop blocking your booking page, and new bookings won’t be added to your calendar.",
                        cta: "Disconnect",
                      },
                      () => {
                        setGoogle({ state: "off" });
                        toast("Google Calendar disconnected");
                      },
                    )
                  }
                >
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        label="Other calendars"
        heading="Apple, Outlook and other calendars"
      >
        <div className={shared.card}>
          <label className={shared.label} htmlFor={`${uid}-ics`}>
            Private subscribe link
          </label>
          <input
            className={joinClassNames(calendar.icsInput, shared.focusRing)}
            data-ac-in="1"
            id={`${uid}-ics`}
            readOnly={true}
            value={icsUrl}
            onFocus={(event) => event.target.select()}
          />
          <div className={calendar.icsActions}>
            <button
              className={joinClassNames(calendar.copyLink, shared.focusRing)}
              data-ac-in="1"
              onClick={() => {
                try {
                  void navigator.clipboard.writeText(icsUrl);
                } catch {
                  // clipboard unavailable
                }

                toast("Link copied");
              }}
            >
              <Copy size={15} strokeWidth={1.7} />
              Copy link
            </button>
            <button
              className={joinClassNames(calendar.resetLink, shared.focusRing)}
              data-ac-in="1"
              onClick={() =>
                ask(
                  {
                    title: "Reset your subscribe link?",
                    body: "The old link stops working. You’ll need to add the new one to your calendar app again.",
                    cta: "Reset link",
                  },
                  () => {
                    setState({
                      icsToken: Math.random().toString(36).slice(2, 10),
                    });

                    toast("New link ready. Add it to your calendar app");
                  },
                )
              }
            >
              Reset link
            </button>
          </div>
          <p className={calendar.icsHelp}>
            Adds your bookings to your calendar. Updates can take a few hours
            depending on your calendar app. Anyone with this link can see your
            bookings, so reset it if it’s shared by mistake.
          </p>
        </div>
      </SettingsSection>
    </>
  );
};
