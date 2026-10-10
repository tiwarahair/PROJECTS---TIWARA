import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { TaxDetailsForm } from "../tax-details-form/tax-details-form";
import {
  ALWAYS_ON,
  CLIENT_MESSAGES,
  NOTIFICATION_GROUPS,
  getPayoutStatus,
  getTaxRows,
} from "./account-settings-logic";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import { InfoIcon, SettingsSection } from "./settings-personal";
import { CheckRow, Switch } from "./settings-security";
import shared from "./account-settings.module.css";
import calendar from "./settings-calendar.module.css";
import notifications from "./settings-notifications.module.css";
import payouts from "./settings-payouts.module.css";

interface PageProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

const TickIcon = ({
  size,
  strokeWidth,
  className,
}: {
  size: number;
  strokeWidth: string;
  className?: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12.5l4.5 4.5L19 7.5"></path>
  </svg>
);

const LockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="11" width="14" height="10" rx="2"></rect>
    <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
  </svg>
);

const ExternalIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 17 17 7M9 7h8v8"></path>
  </svg>
);

export const SettingsNotifications = ({
  settings: { state, setState, toast },
}: PageProps) => (
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
                  ["e", " by email"],
                  ["s", " by SMS"],
                ] as const
              ).map(([channel, suffix]) => (
                <Switch
                  key={channel}
                  isOn={state.notif[key][channel]}
                  label={label + suffix}
                  className={notifications.switchCell}
                  onToggle={() => {
                    setState(({ notif }) => ({
                      notif: {
                        ...notif,
                        [key]: {
                          ...notif[key],
                          [channel]: !notif[key][channel],
                        },
                      },
                    }));
                    toast("Notification settings saved");
                  }}
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
              <LockIcon />
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
              <svg
                className={notifications.clientTick}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5"></path>
              </svg>
              {message}
            </span>
          ))}
        </div>
      </div>
    </SettingsSection>
    <p className={notifications.bellNote}>
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
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"></path>
      </svg>
      Everything also appears in your notification bell.
    </p>
  </>
);

export const SettingsPayouts = ({ props }: PageProps) => {
  const status = props.payoutStatus || "active";
  const view = getPayoutStatus(status, props.pauseReason);
  // the status palette comes from the PST table
  const statusStyle = {
    "--pst-bg": view.bg,
    "--pst-shadow": view.flat ? "none" : "var(--shadow-panel)",
    "--pst-chip": view.chip,
    "--pst-fg": view.fg,
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={view.icon}></path>
            </svg>
          </span>
          <div className={payouts.statusText}>
            <div className={payouts.statusTitle}>{view.title}</div>
            <div className={payouts.statusBody}>{view.body}</div>
          </div>
          <button
            className={joinClassNames(payouts.statusButton, shared.focusRing)}
            data-ac-in="1"
            onClick={() => {
              if (status === "none") props.onConnectStripe?.();
            }}
          >
            {view.btn}
            <ExternalIcon />
          </button>
        </div>
      </SettingsSection>

      {status !== "none" && (
        <SettingsSection label="Bank account" heading="Bank account">
          <div className={payouts.bankCard}>
            <div className={shared.rowText}>
              <div className={payouts.managed}>
                <LockIcon />
                Managed in Stripe
              </div>
              <div className={payouts.bankName}>
                Monzo <span className={payouts.bankDigits}>•••• 4821</span>
              </div>
            </div>
            <button
              className={joinClassNames(payouts.updateStripe, shared.focusRing)}
              data-ac-in="1"
            >
              Update in Stripe
              <ExternalIcon />
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
              <InfoIcon className={shared.infoIcon} />
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
            onClick={() => props.onNav?.("earnings")}
          >
            View payout history in Earnings
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6"></path>
            </svg>
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
                <svg
                  className={payouts.taxHoldIcon}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>
                  <path d="M12 9v4M12 17v.01"></path>
                </svg>
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
                  <TickIcon size={13} strokeWidth="2.4" />
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
                  <div key={"t" + index} className={payouts.taxRow}>
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
            // the prototype's dc-import host block
            <div data-dc-host="">
              <TaxDetailsForm
                mode="settings"
                value={tax ?? undefined}
                business={props.taxBusiness ?? undefined}
                legalName={props.taxLegalName || ""}
                businessName={props.taxBusinessName || ""}
                onSubmit={(details) => props.onTaxSave?.(details)}
                onCancel={() => props.onTaxCancel?.()}
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
  const { g } = state;
  const icsUrl = "webcal://tiwaras.house/cal/" + state.icsToken + ".ics";
  const setGoogle = (patch: Partial<typeof g>) =>
    setState(({ g: current }) => ({ g: { ...current, ...patch } }));

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
          {g.state === "off" && (
            <button
              className={joinClassNames(shared.darkButton, shared.focusRing)}
              data-ac-in="1"
              onClick={connectGoogle}
            >
              Connect Google Calendar
            </button>
          )}
          {g.state === "connecting" && (
            <div className={calendar.connecting} aria-busy="true">
              <span className={calendar.connectingText}>
                Connecting to Google
              </span>
              <span className={calendar.skeletonLong} data-ac-sk="1"></span>
              <span className={calendar.skeletonShort} data-ac-sk="1"></span>
            </div>
          )}
          {g.state === "on" && (
            <>
              <div className={shared.row}>
                <div className={shared.rowText}>
                  <div className={shared.badgeRow}>
                    <span className={shared.rowValue}>{GOOGLE_EMAIL}</span>
                    <span className={calendar.connectedTag}>
                      <TickIcon size={12} strokeWidth="2.4" />
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
                    ["fam", "Family"],
                    ["hol", "Holidays in the UK"],
                  ] as const
                ).map(([key, name]) => (
                  <CheckRow
                    key={key}
                    isOn={g.cals[key]}
                    onToggle={() => {
                      setGoogle({ cals: { ...g.cals, [key]: !g.cals[key] } });
                      toast("Calendar settings saved");
                    }}
                  >
                    <span className={calendar.calendarName}>{name}</span>
                  </CheckRow>
                ))}
              </div>
              <label className={calendar.targetLabel} htmlFor={uid + "-gt"}>
                Add my bookings to
              </label>
              <span className={calendar.selectWrap}>
                <select
                  className={joinClassNames(calendar.select, shared.focusRing)}
                  data-ac-in="1"
                  id={uid + "-gt"}
                  value={g.target}
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
                <svg
                  className={calendar.selectChevron}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
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
          <label className={shared.label} htmlFor={uid + "-ics"}>
            Private subscribe link
          </label>
          <input
            className={joinClassNames(calendar.icsInput, shared.focusRing)}
            data-ac-in="1"
            id={uid + "-ics"}
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
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="12" height="12" rx="2"></rect>
                <path d="M5 15V5a2 2 0 0 1 2-2h10"></path>
              </svg>
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
