import type { CSSProperties } from "react";
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  House,
  Link2,
  PanelLeft,
  Plus,
  PoundSterling,
  Scissors,
  Settings,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { Avatar } from "../../../components/ds/avatar";
import { getAssetUrl } from "../../../utils/asset-url";
import { joinClassNames } from "../../../utils/class-names";
import { copyText } from "../core/format";
import {
  getBookingLink,
  getProfilePath,
  getSteps,
  isLive,
} from "../core/model";
import type { StudioTab } from "../core/types";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/shell/index.module.css";
import { SHORT_MONTHS, SHORT_WEEKDAYS } from "../../../utils/dates";

interface NavDefinition {
  id: StudioTab;
  label: string;
  icon: LucideIcon;
}

/** The navigation entries and which one is current. */
const getNavItems = (studio: StudioController) => {
  const { state, isWide, setState, actions } = studio;

  const navDefinitions: NavDefinition[] = [
    { id: "home", label: "Home", icon: House },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "services", label: "Services", icon: Scissors },
    { id: "earnings", label: "Earnings", icon: PoundSterling },
    ...(isWide
      ? ([
          { id: "clients", label: "Clients", icon: Users },
          { id: "settings", label: "Settings", icon: Settings },
        ] as NavDefinition[])
      : ([
          { id: "settings", label: "More", icon: Ellipsis },
        ] as NavDefinition[])),
  ];

  return navDefinitions.map((navDefinition) => ({
    ...navDefinition,
    isOn:
      state.tab === navDefinition.id ||
      (!isWide && navDefinition.id === "settings" && state.tab === "clients"),
    onSelect: () => {
      setState({ tab: navDefinition.id, selectedClientId: null, page: null });
      actions.scrollBody(0, false);

      if (navDefinition.id === "bookings" && state.bookingsLayout !== "list")
        actions.scrollCalendarToNow();
    },
  }));
};

export const StudioSidebar = ({ studio }: { studio: StudioController }) => {
  const { state, isDesktop, setState } = studio;
  const isOpen = state.sidebarOpen == null ? isDesktop : state.sidebarOpen;

  return (
    <aside
      className={joinClassNames(
        styles.sidebar,
        isOpen ? styles.sidebarOpen : styles.sidebarClosed,
      )}
      data-screen-label="Sidebar"
    >
      <div className={styles.logoRow}>
        {isOpen && (
          <img
            className={styles.logo}
            src={getAssetUrl("logos/logo-crimson-sm.png")}
            alt="Tiwára's House"
          />
        )}
        <button
          className={joinClassNames(
            styles.toggle,
            isOpen ? styles.toggleOpen : styles.toggleClosed,
          )}
          onClick={() => setState({ sidebarOpen: !isOpen })}
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={18} strokeWidth={1.8} />
        </button>
      </div>
      <nav className={styles.nav}>
        {getNavItems(studio).map(
          ({ id, label, icon: NavItemIcon, isOn, onSelect }) => (
            <button
              key={id}
              className={joinClassNames(
                styles.navButton,
                isOpen ? styles.navOpen : styles.navClosed,
                isOn ? styles.navOn : styles.navOff,
              )}
              onClick={onSelect}
              title={label}
            >
              <span className={styles.navIcon}>
                <NavItemIcon size={19} strokeWidth={1.8} />
              </span>
              {isOpen && <span className={styles.navLabel}>{label}</span>}
            </button>
          ),
        )}
      </nav>
      <div className={styles.spacer}></div>
      <button
        className={joinClassNames(
          styles.profileButton,
          isOpen ? styles.profileOpen : styles.profileClosed,
        )}
        onClick={() => setState({ tab: "settings", page: null })}
        title="Profile"
      >
        <Avatar
          className={styles.profileAvatar}
          src={state.avatarUrl ?? undefined}
          name={state.owner.name}
          size={32}
          isDecorative
        />
        {isOpen && (
          <span className={styles.grow}>
            <span className={styles.profileName}>{state.owner.first}</span>
            <span className={styles.profileArea}>{state.owner.area}</span>
          </span>
        )}
      </button>
    </aside>
  );
};

const getDayPart = (hour: number) => {
  if (hour < 12) return "Morning";

  return hour < 18 ? "Afternoon" : "Evening";
};

export const StudioTopBar = ({ studio }: { studio: StudioController }) => {
  const { state, isWide, isDesktop, setState, actions } = studio;
  const now = new Date();
  const hour = now.getHours();
  const greeting = `${getDayPart(hour)}, ${state.owner.first}`;
  const hasUnread = !state.notifAllRead;

  const isHidden =
    !isWide && (state.tab === "settings" || state.tab === "clients");

  return (
    <div
      className={joinClassNames(
        styles.topBar,
        isDesktop ? styles.topBarDesk : isWide && styles.topBarWide,
        isHidden && styles.topBarHidden,
      )}
      data-screen-label="Top bar"
    >
      {!isWide && (
        <button
          className={styles.avatarButton}
          onClick={() => setState({ tab: "settings", page: null })}
          aria-label="Profile and settings"
        >
          <Avatar
            className={styles.avatar42}
            src={state.avatarUrl ?? undefined}
            name={state.owner.name}
            size={42}
          />
        </button>
      )}
      <div className={styles.grow}>
        <div className={styles.title}>{greeting}</div>
        <div className={styles.dateLine}>
          {`${SHORT_WEEKDAYS[now.getDay()]} ${now.getDate()} ${SHORT_MONTHS[now.getMonth()]}`}
        </div>
      </div>
      <button
        className={styles.bell}
        onClick={() => actions.openSheet("notif")}
        aria-label="Notifications"
      >
        <Bell size={19} strokeWidth={1.7} />
        {hasUnread && <span className={styles.unreadDot}></span>}
      </button>
      {isWide && !(state.tab === "clients" && state.selectedClientId) && (
        <button
          className={styles.newBooking}
          onClick={() => actions.openSheet("add")}
        >
          <Plus size={14} strokeWidth={2.2} /> New booking
        </button>
      )}
    </div>
  );
};

export const FooterNav = ({ studio }: { studio: StudioController }) => (
  <nav className={styles.footerNav}>
    {getNavItems(studio).map(
      ({ id, label, icon: NavItemIcon, isOn, onSelect }) => (
        <button
          key={id}
          className={joinClassNames(
            styles.footerButton,
            isOn && styles.footerOn,
          )}
          onClick={onSelect}
        >
          <span className={styles.footerPill}>
            <NavItemIcon size={19} strokeWidth={1.8} />
          </span>
          <span className={styles.footerLabel}>{label}</span>
        </button>
      ),
    )}
  </nav>
);

const SETUP_KEYS = ["availability", "profile", "secure", "services"] as const;

/** The four setup steps with their actions. */
export const getSetupRows = (studio: StudioController) => {
  const { setState, actions } = studio;

  const rows: [(typeof SETUP_KEYS)[number], string, string, () => void][] = [
    [
      "availability",
      "Set up availability",
      "Working days and hours, blocked time, closed periods",
      () => actions.openPage("availability", true),
    ],
    [
      "profile",
      "Set up your profile",
      "Cover photo, description, portfolio and contact links",
      () => actions.openPage("profile", true),
    ],
    [
      "secure",
      "Get paid: 2FA, tax details and Stripe",
      "Secure your account and set up payouts. Takes about 5 minutes.",
      () => actions.openTwoFactor("secure"),
    ],
    [
      "services",
      "Add services",
      "Finish your 2 starter services or add your own. You need at least one to take bookings.",
      () => {
        setState({
          tab: "services",
          servicesTab: "services",
          page: null,
          serviceStatusFilter: "all",
        });

        actions.scrollBody(0, false);
      },
    ],
  ];

  return rows;
};

export const getSetupProgress = (studio: StudioController) => {
  const steps = getSteps(studio.state);
  const doneCount = SETUP_KEYS.filter((key) => steps[key]).length;

  return {
    steps,
    doneCount,
    isComplete: doneCount === 4,
    isSetupOn: studio.props.setup ?? true,
  };
};

export const SetupCard = ({ studio }: { studio: StudioController }) => {
  const { state, setState } = studio;
  const { steps, doneCount, isComplete } = getSetupProgress(studio);

  // runtime: the progress bar's fill
  const progressStyle = {
    "--setup-frac": String(doneCount / 4),
  } as CSSProperties;

  return (
    <div
      className={joinClassNames(
        styles.floatCard,
        state.setupExit === "out" ? styles.setupOut : styles.setupIn,
      )}
      role="region"
      aria-label="Set up your studio"
      data-screen-label="Setup checklist"
    >
      <div className={styles.cardHead}>
        <div className={styles.grow}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitle}>
              {isComplete ? "You’re ready for bookings" : "Set up your studio"}
            </div>
            <div className={styles.cardCount}>{`${doneCount} of 4 done`}</div>
          </div>
          <div className={styles.cardSub}>
            Four steps and clients can book you.
          </div>
        </div>
        <button
          className={styles.cardClose}
          onClick={() => setState({ setupMinimised: true })}
          aria-label="Minimise checklist"
        >
          <ChevronDown size={18} strokeWidth={2} />
        </button>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressBar} style={progressStyle}></div>
      </div>
      <div className={styles.column}>
        {getSetupRows(studio).map(([key, label, subtitle, onSelect]) => {
          const isDone = !!steps[key];

          return (
            <button key={key} className={styles.setupRow} onClick={onSelect}>
              <span
                className={joinClassNames(
                  styles.tick,
                  isDone && styles.tickDone,
                  isDone && state.lastDone === key && styles.tickPop,
                )}
              >
                <Check
                  className={styles.tickMark}
                  size={11}
                  strokeWidth={3.2}
                />
              </span>
              <span
                className={joinClassNames(
                  styles.rowText,
                  isDone && styles.rowTextDone,
                )}
              >
                <span className={styles.rowLabel}>{label}</span>
                <span className={styles.rowSub}>{subtitle}</span>
              </span>
              <ChevronRight
                className={styles.noShrink}
                size={15}
                strokeWidth={1.7}
                color="rgba(246,240,228,.55)"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const SetupPill = ({ studio }: { studio: StudioController }) => (
  <button
    className={styles.setupPill}
    onClick={() => studio.setState({ setupMinimised: false })}
    aria-label="Open setup checklist"
  >
    <span className={styles.pillCount}>
      {`${getSetupProgress(studio).doneCount}/4`}
    </span>
    <span>Finish setup</span>
  </button>
);

/** "Your booking link is ready to share" — the wide floating card, or (narrow) the Home banner's body. */
export const LinkCardBody = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions } = studio;

  return (
    <>
      <div className={styles.cardHead}>
        <span className={styles.linkIcon}>
          <Link2 size={18} strokeWidth={1.9} />
        </span>
        <div className={styles.grow}>
          <div className={styles.linkTitle}>
            Your booking link is ready to share
          </div>
          <div className={styles.linkSub}>
            Clients can find and book you from it now.
          </div>
        </div>
        <button
          className={styles.cardClose}
          onClick={() => setState({ linkCard: false })}
          aria-label="Dismiss"
        >
          <X size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div className={styles.linkUrl}>{getBookingLink(state)}</div>
      <div className={styles.linkActions}>
        <Link className={styles.previewProfile} to={getProfilePath(state)}>
          Preview profile
        </Link>
        <button
          className={styles.copyLink}
          onClick={() => {
            copyText(getBookingLink(state));
            actions.showToast("Booking link copied");
            setState({ linkCard: false });
          }}
        >
          Copy link
        </button>
      </div>
    </>
  );
};

export const LinkCard = ({ studio }: { studio: StudioController }) => (
  <div
    className={joinClassNames(styles.floatCard, styles.setupIn)}
    role="status"
    data-screen-label="Booking link card"
  >
    <LinkCardBody studio={studio} />
  </div>
);

export const Fab = ({ studio }: { studio: StudioController }) => {
  const { state, actions, serviceActions } = studio;

  const getLabel = () => {
    if (state.tab !== "services") return "New booking";

    return state.servicesTab === "addons" ? "Add add-on" : "Add service";
  };

  const label = getLabel();

  const onAdd = () => {
    if (state.tab === "services") {
      if (state.servicesTab === "addons")
        actions.openSheet("addon", {
          addonDraft: {
            id: "",
            categoryId: null,
            name: "",
            price: "",
            hours: "",
            min: "",
          },
        });
      else serviceActions.openWizard("add");
    } else actions.openSheet("add");
  };

  return (
    <button className={styles.fab} onClick={onAdd} aria-label={label}>
      <Plus size={24} strokeWidth={2.2} />
    </button>
  );
};

/** Whether the go-live gate applies: setup is on and the account can't take bookings yet. */
export const isGated = (studio: StudioController) =>
  (studio.props.setup ?? true) && !isLive(studio.state);
