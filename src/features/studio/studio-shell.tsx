import type { CSSProperties } from "react";
import { Link } from "react-router";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { BOOKING_LINK, STUDIO_STYLIST_ID } from "./studio-data";
import { copyText } from "./studio-format";
import { getSteps, isLive } from "./studio-model";
import type { StudioTab } from "./studio-types";
import type { StudioController } from "./use-studio";
import styles from "../../styles/features/studio/studio-shell.module.css";
import { SHORT_MONTHS, SHORT_WEEKDAYS } from "../../utils/dates";

type NavIconName =
  "home" | "cal" | "scis" | "pound" | "gear" | "people" | "more";

interface NavDefinition {
  id: StudioTab;
  label: string;
  icon: NavIconName;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const NavIcon = ({ icon }: { icon: NavIconName }) => {
  if (icon === "more")
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="1.9"></circle>
        <circle cx="12" cy="12" r="1.9"></circle>
        <circle cx="19" cy="12" r="1.9"></circle>
      </svg>
    );

  return (
    <svg width="19" height="19" viewBox="0 0 24 24" {...STROKE}>
      {icon === "home" && (
        <>
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        </>
      )}
      {icon === "cal" && (
        <>
          <path d="M8 2v4"></path>
          <path d="M16 2v4"></path>
          <rect width="18" height="18" x="3" y="4" rx="2"></rect>
          <path d="M3 10h18"></path>
        </>
      )}
      {icon === "scis" && (
        <>
          <path d="M20 4 8.12 15.88"></path>
          <path d="M14.47 14.48 20 20"></path>
          <path d="M8.12 8.12 12 12"></path>
          <circle cx="6" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
        </>
      )}
      {icon === "pound" && (
        <>
          <path d="M18 7c0-5.333-8-5.333-8 0"></path>
          <path d="M10 7v14"></path>
          <path d="M6 21h12"></path>
          <path d="M6 13h10"></path>
        </>
      )}
      {icon === "gear" && (
        <>
          <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </>
      )}
      {icon === "people" && (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
        </>
      )}
    </svg>
  );
};

/** The navigation entries and which one is current. */
const getNavItems = (studio: StudioController) => {
  const { state, isWide, setState, actions } = studio;

  const navDefinitions: NavDefinition[] = [
    { id: "home", label: "Home", icon: "home" },
    { id: "bookings", label: "Bookings", icon: "cal" },
    { id: "services", label: "Services", icon: "scis" },
    { id: "earnings", label: "Earnings", icon: "pound" },
    ...(isWide
      ? ([
          { id: "clients", label: "Clients", icon: "people" },
          { id: "settings", label: "Settings", icon: "gear" },
        ] as NavDefinition[])
      : ([{ id: "settings", label: "More", icon: "more" }] as NavDefinition[])),
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

export const getAvatarSrc = ({ avatarUrl }: { avatarUrl: string | null }) =>
  avatarUrl || getAssetUrl("site/old-hero.jpg");

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
            src={getAssetUrl("logos/logo-crimson.png")}
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
          <svg width="18" height="18" viewBox="0 0 24 24" {...STROKE}>
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M9 3v18"></path>
          </svg>
        </button>
      </div>
      <nav className={styles.nav}>
        {getNavItems(studio).map(({ id, label, icon, isOn, onSelect }) => (
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
              <NavIcon icon={icon} />
            </span>
            {isOpen && <span className={styles.navLabel}>{label}</span>}
          </button>
        ))}
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
        <img
          className={styles.profileAvatar}
          src={getAvatarSrc(state)}
          alt=""
        />
        {isOpen && (
          <span className={styles.grow}>
            <span className={styles.profileName}>Amara</span>
            <span className={styles.profileArea}>Ancoats</span>
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
  const greeting = `${getDayPart(hour)}, Amara`;
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
          <img
            className={styles.avatar42}
            src={getAvatarSrc(state)}
            alt="Amara"
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
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          {...STROKE}
          strokeWidth="1.7"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.7 21a2 2 0 0 1-3.4 0"></path>
        </svg>
        {hasUnread && <span className={styles.unreadDot}></span>}
      </button>
      {isWide && !(state.tab === "clients" && state.selectedClientId) && (
        <button
          className={styles.newBooking}
          onClick={() => actions.openSheet("add")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14"></path>
          </svg>{" "}
          New booking
        </button>
      )}
    </div>
  );
};

export const FooterNav = ({ studio }: { studio: StudioController }) => (
  <nav className={styles.footerNav}>
    {getNavItems(studio).map(({ id, label, icon, isOn, onSelect }) => (
      <button
        key={id}
        className={joinClassNames(styles.footerButton, isOn && styles.footerOn)}
        onClick={onSelect}
      >
        <span className={styles.footerPill}>
          <NavIcon icon={icon} />
        </span>
        <span className={styles.footerLabel}>{label}</span>
      </button>
    ))}
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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6"></path>
          </svg>
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
                <svg
                  className={styles.tickMark}
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
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
              <svg
                className={styles.noShrink}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(246,240,228,.55)"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6"></path>
              </svg>
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

const LinkIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
    <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
    <line x1="8" x2="16" y1="12" y2="12"></line>
  </svg>
);

const CloseIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <path d="M18 6 6 18M6 6l12 12"></path>
  </svg>
);

/** "Your booking link is ready to share" — the wide floating card, or (narrow) the Home banner's body. */
export const LinkCardBody = ({ studio }: { studio: StudioController }) => {
  const { setState, actions } = studio;

  return (
    <>
      <div className={styles.cardHead}>
        <span className={styles.linkIcon}>
          <LinkIcon />
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
          <CloseIcon />
        </button>
      </div>
      <div className={styles.linkUrl}>{BOOKING_LINK}</div>
      <div className={styles.linkActions}>
        <Link
          className={styles.previewProfile}
          to={`/stylist?stylist=${STUDIO_STYLIST_ID}`}
        >
          Preview profile
        </Link>
        <button
          className={styles.copyLink}
          onClick={() => {
            copyText(BOOKING_LINK);
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
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14"></path>
      </svg>
    </button>
  );
};

/** Whether the go-live gate applies: setup is on and the account can't take bookings yet. */
export const isGated = (studio: StudioController) =>
  (studio.props.setup ?? true) && !isLive(studio.state);
