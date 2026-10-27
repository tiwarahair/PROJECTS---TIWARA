import { CalendarSubscribe } from "../calendar-subscribe";
import type { AccountSettingsController } from "./use-account-settings";
import { SettingsSection } from "./fields";
import shared from "../../styles/components/account-settings/index.module.css";
import calendar from "../../styles/components/account-settings/calendar.module.css";

interface SettingsCalendarProps {
  settings: AccountSettingsController;
}

export const SettingsCalendar = ({
  settings: { state, setState, toast, ask, backend, retryFeed },
}: SettingsCalendarProps) => {
  const { feedUrl, feedFailed } = state;

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
        {/* TO DO: google first needs to verify our app for this to work which can take weeks */}
        <div className={shared.card}>
          <span className={calendar.soonTag}>Coming soon</span>
          <p className={calendar.icsHelp}>
            Until then, the Google Calendar button below adds your bookings to
            it as a subscribed calendar.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        label="Calendar apps"
        heading="Subscribe in your calendar app"
      >
        <div className={shared.card}>
          <CalendarSubscribe
            feedUrl={feedUrl}
            isError={feedFailed}
            hint="Adds your bookings to your calendar. Updates can take a few hours depending on your calendar app. Anyone with this link can see your bookings, so reset it if it’s shared by mistake."
            onRetry={retryFeed}
            onCopy={(link) => {
              try {
                void navigator.clipboard.writeText(link);
              } catch {
                // clipboard unavailable
              }

              toast("Link copied");
            }}
            onReset={() =>
              ask(
                {
                  title: "Reset your subscribe link?",
                  body: "The old link stops working. You’ll need to add the new one to your calendar app again.",
                  cta: "Reset link",
                },
                () =>
                  backend.resetCalendarFeed().then(
                    (url) => {
                      setState({ feedUrl: url });
                      toast("New link ready. Add it to your calendar app");
                    },
                    () => toast("The link couldn’t be reset. Try again."),
                  ),
              )
            }
          />
        </div>
      </SettingsSection>
    </>
  );
};
