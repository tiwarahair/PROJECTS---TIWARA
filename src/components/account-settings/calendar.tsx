import { Check, ChevronDown, Copy } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import { CheckRow, SettingsSection } from "./fields";
import shared from "../../styles/components/account-settings/index.module.css";
import calendar from "../../styles/components/account-settings/calendar.module.css";

interface SettingsCalendarProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

const GOOGLE_EMAIL = "amara.okonkwo@gmail.com";

export const SettingsCalendar = ({
  settings: { state, setState, toast, ask, connectGoogle },
  uid,
}: SettingsCalendarProps) => {
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
