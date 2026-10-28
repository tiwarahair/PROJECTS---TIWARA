// Studio → Settings navigation: the narrow root menu, the wide nav, page titles and the share rows.
import {
  Bell,
  Calendar,
  CreditCard,
  Clock,
  Eye,
  Landmark,
  Link2,
  ListChecks,
  Shield,
  ShieldCheck,
  Star,
  Store,
  User,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STUDIO_ADMIN_URL } from "../../admin/shell/nav-items";
import { GATE_REASON } from "../core/constants";
import { copyText } from "../core/format";
import {
  getAllClients,
  getBookingLink,
  getProfilePath,
  isLive,
} from "../core/model";
import type { StudioPage } from "../core/types";
import type { StudioController } from "../core/use-studio";

const ACCOUNT_ICONS = {
  personal: UserRound,
  security: Shield,
  notifications: Bell,
  payouts: Landmark,
  calendar: Calendar,
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
  icon: LucideIcon;
  isLocked: boolean;
  onSelect: () => void;
}

export const getSettingsNav = (
  studio: StudioController,
  navigate: (to: string) => void,
  isAdmin = false,
) => {
  const { state, setState, isWide, actions } = studio;
  const { showToast, openSubpage, scrollBody } = actions;

  const live = isLive(state);
  const isGate = !live;

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

  const clientCount = getAllClients(state).length;

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

  const rows: SettingsRow[] = [
    {
      key: "business",
      label: "Business details",
      subtitle: `${businessType} · ${businessArea}`,
      icon: Store,
      isLocked: false,
      onSelect: () => openSubpage("business"),
    },
    {
      key: "availability",
      label: "Manage availability",
      subtitle: "Hours, blocked time, closed periods",
      icon: Clock,
      isLocked: false,
      onSelect: () => openSubpage("availability"),
    },
    {
      key: "rules",
      label: "Booking rules",
      subtitle: `Booking window, extra time${travelNote}`,
      icon: ListChecks,
      isLocked: false,
      onSelect: () => openSubpage("rules"),
    },
    {
      key: "policy",
      label: "Payment policy",
      subtitle: `${policyMode} · ${policyWindow} cancellation window`,
      icon: CreditCard,
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
            icon: Users,
            isLocked: false,
            onSelect: () => {
              setState({ tab: "clients", selectedClientId: null });
              scrollBody(0, false);
            },
          },
          {
            key: "reviews",
            label: "Reviews",
            subtitle: "What clients say, and your replies",
            icon: Star,
            isLocked: false,
            onSelect: () => {
              setState({ tab: "reviews" });
              scrollBody(0, false);
            },
          },
        ]),
    {
      key: "link",
      label: "Booking link",
      subtitle: isGate ? "Off until setup is complete" : getBookingLink(state),
      icon: Link2,
      isLocked: isGate,
      onSelect: copyLink,
    },
    {
      key: "profile",
      label: "View public profile",
      subtitle: isGate
        ? "Off until setup is complete"
        : "See your page as clients do",
      icon: Eye,
      isLocked: isGate,
      onSelect: () => {
        if (isGate) {
          showToast(GATE_REASON);

          return;
        }

        navigate(getProfilePath(state));
      },
    },
  ];

  const accountRows: SettingsRow[] = (
    [
      ["personal", "Personal details", "Name, login email and phone"],
      ["security", "Security", "Password, two-factor, sessions"],
      ["notifications", "Notifications", "Email and SMS alerts"],
      ["payouts", "Payouts", "Stripe, bank account, tax details"],
      ["calendar", "Calendar sync", "Google, Apple, Outlook"],
    ] as [keyof typeof ACCOUNT_ICONS, string, string][]
  ).map(([key, label, subtitle]) => ({
    key,
    label,
    subtitle,
    icon: ACCOUNT_ICONS[key],
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
      rows: pick(["Booking rules", "Payment policy", "Clients", "Reviews"]),
    },
    { key: "account", label: "Account", rows: accountRows },
    {
      key: "more",
      label: "Share",
      rows: pick(["Booking link", "View public profile"]),
    },
    ...(isAdmin
      ? [
          {
            key: "admin",
            label: "Tiwára’s House",
            rows: [
              {
                key: "admin",
                label: "Admin",
                subtitle: "Reported reviews and appeals",
                icon: ShieldCheck,
                isLocked: false,
                onSelect: () => navigate(STUDIO_ADMIN_URL),
              },
            ],
          },
        ]
      : []),
  ];

  // ---- the wide settings nav ----
  const page: StudioPage | null = isWide ? state.page || "profile" : state.page;
  const isOn = state.tab === "settings";

  const navItem = (id: StudioPage, label: string, icon: LucideIcon) => ({
    key: id,
    label,
    icon,
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
        navItem("profile", "Profile", User),
        navItem("business", "Business details", Store),
        navItem("availability", "Availability", Clock),
      ],
    },
    {
      key: "bookings",
      label: "Bookings",
      isFirst: false,
      items: [
        navItem("rules", "Booking rules", ListChecks),
        navItem("policy", "Payment policy", CreditCard),
      ],
    },
    {
      key: "account",
      label: "Account",
      isFirst: false,
      items: [
        navItem("personal", "Personal details", ACCOUNT_ICONS.personal),
        navItem("security", "Security", ACCOUNT_ICONS.security),
        navItem("notifications", "Notifications", ACCOUNT_ICONS.notifications),
        navItem("payouts", "Payouts", ACCOUNT_ICONS.payouts),
        navItem("calendar", "Calendar sync", ACCOUNT_ICONS.calendar),
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
    isShareLive: live,
  };
};
