// Studio → Settings navigation: the narrow root menu, the wide nav, page titles and the share rows.
import { GATE_REASON, STUDIO_STYLIST_ID } from "./studio-data";
import { copyText } from "./studio-format";
import {
  getAllClients,
  getBookingLink,
  hasPublicProfile,
  isLive,
} from "./studio-model";
import type { StudioPage } from "./studio-types";
import type { StudioController } from "./use-studio";

export type SettingsIcon =
  | "clock"
  | "rules"
  | "card"
  | "shop"
  | "people"
  | "link"
  | "eye"
  | "user"
  | "scis"
  | "";

const PATHS = {
  personal: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  security: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  notifications:
    "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0",
  payouts: "M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18M12 3l9 5H3z",
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
};

const TITLES: Record<StudioPage, string> = {
  availability: "Availability",
  profile: "Your profile",
  business: "Business details",
  rules: "Booking rules",
  policy: "Payment policy",
  personal: "Personal details",
  security: "Security",
  notifications: "Notifications",
  payouts: "Payouts",
  calendar: "Calendar sync",
};

const ACCOUNT_PAGES: StudioPage[] = [
  "personal",
  "security",
  "notifications",
  "payouts",
  "calendar",
];

interface SettingsRow {
  key: string;
  label: string;
  subtitle: string;
  icon: SettingsIcon;
  path: string;
  isLocked: boolean;
  onSelect: () => void;
}

export const getSettingsNav = (
  studio: StudioController,
  navigate: (to: string) => void,
) => {
  const { state, setState, props, isWide, isNew, actions } = studio;
  const { showToast, openSubpage, scrollBody } = actions;

  const isSetupOn = props.setup ?? true;
  const live = isLive(state);
  const isGate = isSetupOn && !live;

  const copyLink = () => {
    if (isGate) {
      showToast(GATE_REASON);

      return;
    }

    copyText(getBookingLink(state));
    showToast("Booking link copied");
  };

  // ---- the narrow root menu ----
  const business = state.business;

  const policyModes: Record<string, string> = {
    deposit: `${state.policy.deposit}% deposit`,
    full: "Full payment",
    card: "Card protection",
    none: "No protection",
  };

  const clientCount = isNew
    ? state.extraClients.length
    : getAllClients(state).length;

  const businessTypes: Record<string, string> = {
    shop: "Shop / salon",
    chair: "Chair rental",
    home: "Home-based",
    mobile: "Mobile",
  };

  const businessType = businessTypes[business.type];

  const businessArea =
    business.type === "mobile"
      ? business.details.basePostcode
      : business.details.postcode;

  const travelNote = state.profile.mobile ? ", travel buffer" : "";
  const policyMode = policyModes[state.policy.mode] || "";

  const policyWindow =
    state.policy.window < 1 ? "30 min" : `${state.policy.window}h`;

  const allRows: SettingsRow[] = [
    {
      key: "business",
      label: "Business details",
      subtitle: `${businessType} · ${businessArea}`,
      icon: "shop",
      path: "",
      isLocked: false,
      onSelect: () => openSubpage("business"),
    },
    {
      key: "availability",
      label: "Manage availability",
      subtitle: "Hours, blocked time, closed periods",
      icon: "clock",
      path: "",
      isLocked: false,
      onSelect: () => openSubpage("availability"),
    },
    {
      key: "rules",
      label: "Booking rules",
      subtitle: `Booking window, extra time${travelNote}`,
      icon: "rules",
      path: "",
      isLocked: false,
      onSelect: () => openSubpage("rules"),
    },
    {
      key: "policy",
      label: "Payment policy",
      subtitle: `${policyMode} · ${policyWindow} cancellation window`,
      icon: "card",
      path: "",
      isLocked: false,
      onSelect: () => openSubpage("policy"),
    },
    ...(isWide
      ? []
      : [
          {
            key: "clients",
            label: "Clients",
            subtitle: clientCount
              ? clientCount + (clientCount === 1 ? " client" : " clients")
              : "No clients yet",
            icon: "people" as SettingsIcon,
            path: "",
            isLocked: false,
            onSelect: () => {
              setState({ tab: "clients", selectedClientId: null });
              scrollBody(0, false);
            },
          },
        ]),
    {
      key: "link",
      label: "Booking link",
      subtitle: isGate ? "Off until setup is complete" : getBookingLink(state),
      icon: "link",
      path: "",
      isLocked: isGate,
      onSelect: copyLink,
    },
    {
      key: "profile",
      label: "View public profile",
      subtitle: isGate
        ? "Off until setup is complete"
        : "See your page as clients do",
      icon: "eye",
      path: "",
      isLocked: isGate,
      onSelect: () => {
        if (isGate) {
          showToast(GATE_REASON);

          return;
        }

        navigate(`/stylist?stylist=${STUDIO_STYLIST_ID}`);
      },
    },
  ];

  const rows = allRows.filter(
    ({ key }) => key !== "profile" || hasPublicProfile(state),
  );

  const accountRows: SettingsRow[] = (
    [
      ["personal", "Personal details", "Name, login email and phone"],
      ["security", "Security", "Password, two-factor, sessions"],
      ["notifications", "Notifications", "Email and SMS alerts"],
      ["payouts", "Payouts", "Stripe, bank account, tax details"],
      ["calendar", "Calendar sync", "Google, Apple, Outlook"],
    ] as [keyof typeof PATHS, string, string][]
  ).map(([key, label, subtitle]) => ({
    key,
    label,
    subtitle,
    icon: "",
    path: PATHS[key],
    isLocked: false,
    onSelect: () => openSubpage(key),
  }));

  const pick = (labels: string[]) =>
    rows.filter(({ label }) => labels.includes(label));

  const rootGroups = [
    {
      key: "studio",
      label: "Your studio",
      rows: pick(["Business details", "Manage availability"]),
    },
    {
      key: "bookings",
      label: "Bookings",
      rows: pick(["Booking rules", "Payment policy", "Clients"]),
    },
    { key: "account", label: "Account", rows: accountRows },
    {
      key: "more",
      label: "Share",
      rows: pick(["Booking link", "View public profile"]),
    },
  ];

  // ---- the wide settings nav ----
  const page: StudioPage | null = isWide ? state.page || "profile" : state.page;
  const isOn = state.tab === "settings";

  const navItem = (
    id: StudioPage,
    label: string,
    icon: SettingsIcon,
    path = "",
  ) => ({
    key: id,
    label,
    icon,
    path,
    isCurrent: page === id,
    onSelect: () => {
      setState({ page: id, pageFromSetup: false });
      scrollBody(0, false);
    },
  });

  const navGroups = [
    {
      key: "studio",
      label: "Your studio",
      isFirst: true,
      items: [
        navItem("profile", "Profile", "user"),
        navItem("business", "Business details", "shop"),
        navItem("availability", "Availability", "clock"),
      ],
    },
    {
      key: "bookings",
      label: "Bookings",
      isFirst: false,
      items: [
        navItem("rules", "Booking rules", "rules"),
        navItem("policy", "Payment policy", "card"),
      ],
    },
    {
      key: "account",
      label: "Account",
      isFirst: false,
      items: [
        navItem("personal", "Personal details", "", PATHS.personal),
        navItem("security", "Security", "", PATHS.security),
        navItem("notifications", "Notifications", "", PATHS.notifications),
        navItem("payouts", "Payouts", "", PATHS.payouts),
        navItem("calendar", "Calendar sync", "", PATHS.calendar),
      ],
    },
  ];

  const isAccountPage = !!page && ACCOUNT_PAGES.includes(page);

  return {
    rootGroups,
    navGroups,
    page,
    isOn,
    isAccountPage,
    pageTitle: page ? TITLES[page] : "",
    copyLink,
    isShareLive: !isSetupOn || live,
  };
};
