import type { AccountSecurity } from "../../lib/account-security";
import { getTimeAgo, SHORT_MONTHS } from "../../utils/dates";
import type { AccountSettingsBackend } from "./backend";
import type { SettingsSession, SettingsState } from "./logic";

type SessionRow = AccountSecurity["sessions"][number];

export const toSettingsSession = (
  {
    id,
    device,
    kind,
    signed_in_at: signedInAt,
    active_at: activeAt,
    is_current: isCurrent,
  }: SessionRow,
  now = new Date(),
): SettingsSession => {
  const signedIn = new Date(signedInAt);

  return {
    id,
    device,
    kind,
    isCurrent,
    signedIn: `Signed in ${signedIn.getDate()} ${SHORT_MONTHS[signedIn.getMonth()]}`,
    last: isCurrent ? "Active now" : getTimeAgo(new Date(activeAt), now),
  };
};

interface SessionsContext {
  backend: AccountSettingsBackend;
  setState: (patch: (current: SettingsState) => Partial<SettingsState>) => void;
  toast: (text: string) => void;
  latestLoad: { current: number };
}

/** Settings → Security: reads and ends the account's sign-ins, and saves the new-device alerts switch. */
export const getSessionsActions = ({
  backend,
  setState,
  toast,
  latestLoad,
}: SessionsContext) => {
  // a sign-out makes any list still loading out of date
  const forgetLoads = () => {
    latestLoad.current += 1;
  };

  // the skeleton only shows until the first list arrives; later visits refresh in place
  const load = () => {
    latestLoad.current += 1;
    const loadId = latestLoad.current;

    setState(({ sessions }) => ({
      sessionsLoading: !sessions.length,
      sessionsFailed: false,
    }));

    return backend.getSecurity().then(
      ({ sessions, login_alerts: alerts }) =>
        setState((current) => ({
          sessions:
            loadId === latestLoad.current
              ? sessions.map((row) => toSettingsSession(row))
              : current.sessions,
          alerts: current.alerts ?? alerts,
          sessionsLoading: false,
        })),
      () =>
        setState(() => ({
          sessionsLoading: false,
          sessionsFailed: loadId === latestLoad.current,
        })),
    );
  };

  const signOut = ({ id, device }: SettingsSession) =>
    backend.signOutSession(id).then(
      () => {
        forgetLoads();

        setState(({ sessions }) => ({
          sessions: sessions.filter((item) => item.id !== id),
        }));

        toast(`Signed out of ${device}`);
      },
      () => toast("That session couldn’t be signed out. Try again."),
    );

  const signOutOthers = () =>
    backend.signOutOthers().then(
      () => {
        forgetLoads();

        setState(({ sessions }) => ({
          sessions: sessions.filter(({ isCurrent }) => isCurrent),
        }));

        toast("Signed out of other sessions");
      },
      () => toast("Your other sessions couldn’t be signed out. Try again."),
    );

  const toggleAlerts = (isOn: boolean) => {
    setState(() => ({ alerts: isOn }));

    return backend.saveLoginAlerts(isOn).then(
      () => toast(isOn ? "Login alerts on" : "Login alerts off"),
      () => {
        setState(() => ({ alerts: !isOn }));
        toast("Login alerts couldn’t be saved. Try again.");
      },
    );
  };

  return { load, signOut, signOutOthers, toggleAlerts };
};
