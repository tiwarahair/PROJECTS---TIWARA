// Studio → Settings values (prototype renderVals: settingsRows / settingsGroups, setGroups, rules, pause, hourRows,
// blockedList / closedList, the profile editor, the embedded pages' callbacks and the save actions).
import type { ChangeEvent } from "react";
import type { BusinessValue } from "../../components/business-details/business-details-logic";
import type { PolicyValue } from "../../components/payment-policy/payment-policy-logic";
import type { TaxDetails } from "../../components/tax-details-form/tax-details-logic";
import { BOOKING_LINK, GATE_REASON, MONS3 } from "./studio-data";
import { copyText, fmtDur, fmtMin } from "./studio-format";
import {
  getAllClients,
  getBlockColour,
  hasTwoFactor,
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
const MIN_OPTIONS: [number, string][] = [
  [0, "Immediately"],
  [30, "30 minutes"],
  [60, "1 hour"],
  [120, "2 hours"],
  [180, "3 hours"],
  [240, "4 hours"],
  [300, "5 hours"],
  [420, "7 hours"],
  [720, "12 hours"],
  [1440, "24 hours"],
  [2880, "48 hours"],
  [4320, "3 days"],
  [5760, "4 days"],
  [7200, "5 days"],
  [10080, "1 week"],
  [20160, "2 weeks"],
];

export interface SettingsRow {
  key: string;
  label: string;
  sub: string;
  icon: SettingsIcon;
  path: string;
  isLocked: boolean;
  go: () => void;
}

export const getSettingsView = (
  studio: StudioController,
  navigate: (to: string) => void,
) => {
  const { state, setState, props, isWide, isDesk, isNew, actions, context } =
    studio;
  const {
    toastMsg,
    openSub,
    openSheet,
    openTf,
    scrollBody,
    leavePage,
    checkDone,
  } = actions;
  const isSetupOn = props.setup ?? true;
  const live = isLive(state);
  const isGate = isSetupOn && !live;
  const copyLink = () => {
    if (isGate) {
      toastMsg(GATE_REASON);
      return;
    }
    copyText(BOOKING_LINK);
    toastMsg("Booking link copied");
  };

  // ---- the narrow root menu ----
  const business = state.business;
  const policyModes: Record<string, string> = {
    deposit: state.policy.deposit + "% deposit",
    full: "Full payment",
    card: "Card protection",
    none: "No protection",
  };
  const clientCount = isNew
    ? state.extraClients.length
    : getAllClients(state).length;
  const rows: SettingsRow[] = [
    {
      key: "business",
      label: "Business details",
      sub:
        (
          {
            shop: "Shop / salon",
            chair: "Chair rental",
            home: "Home-based",
            mobile: "Mobile",
          } as Record<string, string>
        )[business.type] +
        " · " +
        (business.type === "mobile" ? business.v.basePc : business.v.pc),
      icon: "shop",
      path: "",
      isLocked: false,
      go: () => openSub("business"),
    },
    {
      key: "availability",
      label: "Manage availability",
      sub: "Hours, blocked time, closed periods",
      icon: "clock",
      path: "",
      isLocked: false,
      go: () => openSub("availability"),
    },
    {
      key: "rules",
      label: "Booking rules",
      sub:
        "Booking window, extra time" +
        (state.profile.mobile ? ", travel buffer" : ""),
      icon: "rules",
      path: "",
      isLocked: false,
      go: () => openSub("rules"),
    },
    {
      key: "policy",
      label: "Payment policy",
      sub:
        (policyModes[state.policy.mode] || "") +
        " · " +
        (state.policy.window < 1 ? "30 min" : state.policy.window + "h") +
        " cancellation window",
      icon: "card",
      path: "",
      isLocked: false,
      go: () => openSub("policy"),
    },
    ...(isWide
      ? []
      : [
          {
            key: "clients",
            label: "Clients",
            sub: clientCount
              ? clientCount + (clientCount === 1 ? " client" : " clients")
              : "No clients yet",
            icon: "people" as SettingsIcon,
            path: "",
            isLocked: false,
            go: () => {
              setState({ tab: "clients", cliSel: null });
              scrollBody(0, false);
            },
          },
        ]),
    {
      key: "link",
      label: "Booking link",
      sub: isGate ? "Off until setup is complete" : BOOKING_LINK,
      icon: "link",
      path: "",
      isLocked: isGate,
      go: copyLink,
    },
    {
      key: "profile",
      label: "View public profile",
      sub: isGate
        ? "Off until setup is complete"
        : "See your page as clients do",
      icon: "eye",
      path: "",
      isLocked: isGate,
      go: () => {
        if (isGate) {
          toastMsg(GATE_REASON);
          return;
        }
        navigate("/stylist?stylist=amara-beauty");
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
    ] as [keyof typeof PATHS, string, string][]
  ).map(([key, label, sub]) => ({
    key,
    label,
    sub,
    icon: "",
    path: PATHS[key],
    isLocked: false,
    go: () => openSub(key),
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
    go: () => {
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

  // ---- booking rules ----
  const rules = state.rules;
  const setRules = (patch: Partial<typeof rules>) =>
    setState(({ rules: current }) => ({ rules: { ...current, ...patch } }));
  const minLabel = (MIN_OPTIONS.find(
    ([value]) => value === rules.minNotice * 60,
  ) ?? [0, "24 hours"])[1];
  const example = state.services.find(
    ({ st, durH, durM }) => st === "active" && (durH || durM),
  ) ?? {
    name: "silk press",
    durH: 2,
    durM: 30,
  };
  const exampleMinutes = (example.durH || 0) * 60 + (example.durM || 0);
  const asBlock = (minutes: number) =>
    fmtDur(Math.floor(minutes / 60), minutes % 60);
  const saveRules = () => {
    toastMsg("Booking rules saved");
    if (state.page) leavePage();
    else actions.closeSub();
  };

  // ---- pause online bookings ----
  const pause = state.pause || { on: false, until: "" };
  const setPause = (patch: Partial<typeof pause>) =>
    setState({ pause: { ...pause, ...patch } });
  const untilDate = pause.until ? new Date(pause.until + "T00:00") : null;
  const untilLabel =
    untilDate && !isNaN(untilDate.getTime())
      ? untilDate.getDate() + " " + MONS3[untilDate.getMonth()]
      : "";

  // ---- profile editor ----
  const readFile = (
    event: ChangeEvent<HTMLInputElement>,
    done: (url: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result));
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const store = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage can be blocked
    }
  };
  const setProfile = (patch: Partial<typeof state.profile>) =>
    setState(({ profile }) => ({ profile: { ...profile, ...patch } }));

  return {
    isRootMobile: !isWide && state.tab === "settings" && !state.page,
    isPage: state.tab === "settings" && (isWide || !!state.page),
    rootGroups,
    navGroups,
    page,
    pageTitle: page ? TITLES[page] : "",
    isAvail: isOn && page === "availability",
    isProfile: isOn && page === "profile",
    isRules: isOn && page === "rules",
    isPolicy: isOn && page === "policy",
    isBusiness: isOn && page === "business",
    hasOwnFooter:
      isOn && !!page && ["availability", "profile", "rules"].includes(page),
    accountPage: isAccountPage
      ? (page as
          "personal" | "security" | "notifications" | "payouts" | "calendar")
      : "personal",
    isAccountShown: isOn && isAccountPage,
    hasAccountSave:
      isOn && !!page && ["personal", "security", "payouts"].includes(page),
    isNavDesk: isDesk,
    copyLink,
    isShareLive: !isSetupOn || live,
    signOut: () => toastMsg("Signed out. See you soon."),
    // rules
    rulesMaxLabel:
      rules.maxNotice + (rules.maxNotice === 1 ? " month" : " months"),
    rulesMinLabel:
      rules.minNotice === 0 ? "the moment" : minLabel.toLowerCase() + " before",
    rulesMaxOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((months) => ({
      v: String(months),
      label: months + (months === 1 ? " month" : " months"),
    })),
    onRulesMax: (event: ChangeEvent<HTMLSelectElement>) =>
      setRules({ maxNotice: parseInt(event.target.value) }),
    rulesMinOptions: MIN_OPTIONS.map(([value, label]) => ({
      v: String(value),
      label,
    })),
    onRulesMin: (event: ChangeEvent<HTMLSelectElement>) =>
      setRules({ minNotice: parseInt(event.target.value) / 60 }),
    rulesExtra: fmtMin(rules.extra),
    rulesExtraDown: () => setRules({ extra: Math.max(0, rules.extra - 5) }),
    rulesExtraUp: () => setRules({ extra: Math.min(30, rules.extra + 5) }),
    rulesExtraExample: rules.extra
      ? "A " +
        asBlock(exampleMinutes) +
        " " +
        example.name.toLowerCase() +
        " blocks " +
        asBlock(exampleMinutes + rules.extra) +
        " in your calendar."
      : "Services block only their own duration unless you set extra time on them.",
    rulesTravel: fmtMin(rules.travel),
    rulesTravelDown: () => setRules({ travel: Math.max(0, rules.travel - 5) }),
    rulesTravelUp: () => setRules({ travel: Math.min(120, rules.travel + 5) }),
    saveRules,
    // pause
    pause,
    togglePause: () => {
      setPause({ on: !pause.on });
      toastMsg(
        pause.on ? "Online bookings are back on" : "Online bookings paused",
      );
    },
    onPauseUntil: (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setPause({ until: value });
      if (value) {
        const date = new Date(value + "T00:00");
        toastMsg(
          "Paused until " + date.getDate() + " " + MONS3[date.getMonth()],
        );
      }
    },
    clearPauseUntil: () => setPause({ until: "" }),
    pauseBanner:
      "Online bookings are paused" +
      (untilLabel ? " until " + untilLabel : "") +
      ". Clients see ‘Not taking online bookings right now’.",
    // availability
    hourRows: state.hours.map((hours, index) => ({
      key: hours.d,
      ...hours,
      toggle: () =>
        setState({
          hours: state.hours.map((item, itemIndex) =>
            itemIndex === index ? { ...item, on: !item.on } : item,
          ),
        }),
      setStart: (event: ChangeEvent<HTMLSelectElement>) =>
        setState({
          hours: state.hours.map((item, itemIndex) =>
            itemIndex === index ? { ...item, s: event.target.value } : item,
          ),
        }),
      setEnd: (event: ChangeEvent<HTMLSelectElement>) =>
        setState({
          hours: state.hours.map((item, itemIndex) =>
            itemIndex === index ? { ...item, e: event.target.value } : item,
          ),
        }),
    })),
    blockedList: state.blocked.map((block) => ({
      key: block.id,
      day: block.day,
      span: block.span,
      reason: block.reason || "No reason given",
      hex: getBlockColour().hex,
      edit: () => actions.editBlock(block),
      remove: () => actions.removeBlock(block),
    })),
    closedList: state.closed.map((period) => ({
      key: period.id,
      span: period.span,
      reason: period.reason || "Closed for booking",
      edit: () =>
        openSheet("closed", {
          closedDraft: {
            from: period.from || "",
            to: period.to || "",
            reason: period.reason || "",
            editId: period.id,
          },
        }),
      remove: () =>
        setState({
          confirm: {
            body: period.span + " will open up for online booking again.",
            yes: () => {
              setState(({ closed }) => ({
                closed: closed.filter(({ id }) => id !== period.id),
                confirm: null,
              }));
              toastMsg("Closed period removed");
            },
          },
        }),
    })),
    openBlock: () =>
      openSheet("block", {
        blockDraft: { day: 0, start: "13:00", end: "14:00", reason: "" },
      }),
    openClosed: () =>
      openSheet("closed", { closedDraft: { from: "", to: "", reason: "" } }),
    saveAvail: () => {
      setState({ check: { ...state.check, avail: true } });
      toastMsg("Availability saved");
      leavePage();
      checkDone();
    },
    // profile
    onCoverFile: (event: ChangeEvent<HTMLInputElement>) =>
      readFile(event, (url) => {
        setState({ coverUrl: url });
        store("studio.cover", url);
      }),
    onAvatarFile: (event: ChangeEvent<HTMLInputElement>) =>
      readFile(event, (url) => {
        setState({ avatarUrl: url });
        store("studio.avatar", url);
      }),
    setProfile,
    portfolio: state.portfolio.map(({ id, src }) => ({
      key: id,
      src,
      remove: () =>
        setState(({ portfolio }) => ({
          portfolio: portfolio.filter((item) => item.id !== id),
        })),
    })),
    portCount: state.portfolio.length + " of 20",
    canAddPhotos: state.portfolio.length < 20,
    onPortFiles: (event: ChangeEvent<HTMLInputElement>) => {
      const room = 20 - state.portfolio.length;
      const files = Array.from(event.target.files || []).slice(0, room);
      event.target.value = "";
      void Promise.all(
        files.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.readAsDataURL(file);
            }),
        ),
      ).then((urls) => {
        if (urls.length)
          setState(({ portfolio }) => ({
            portfolio: portfolio.concat(
              urls.map((src, index) => ({
                id: "pf" + Date.now() + index,
                src,
              })),
            ),
          }));
      });
    },
    saveProfile: () => {
      setState({ check: { ...state.check, profile: true } });
      toastMsg("Profile saved");
      leavePage();
      checkDone();
    },
    // embedded pages
    policyValue: state.policy,
    policyBookings: state.bookings.filter(
      ({ off, status }) => (off || 0) >= 0 && status !== "cancelled",
    ).length,
    onPolicySave: (value: PolicyValue) => {
      setState({ policy: { ...state.policy, ...value } });
      toastMsg("Payment policy saved");
    },
    // the embedded page reports whether it can save; the mobile header button calls back into it
    onPolicyState: (api: { canSave: boolean; save: () => void }) => {
      context.memo.polApi = api;
      if (!!api.canSave !== !!context.getState().polCanSave)
        setState({ polCanSave: !!api.canSave });
    },
    savePolicyHeader: () => {
      if (context.memo.polApi?.canSave) context.memo.polApi.save();
    },
    onBusinessSave: (value: BusinessValue) => {
      setState({
        business: value,
        profile: { ...state.profile, mobile: value.type === "mobile" },
      });
      toastMsg("Business details saved");
    },
    onBusinessState: (api: { canSave: boolean; save: () => void }) => {
      context.memo.bizApi = api;
      if (!!api.canSave !== !!context.getState().bizCanSave)
        setState({ bizCanSave: !!api.canSave });
    },
    saveBusinessHeader: () => {
      if (context.memo.bizApi?.canSave) context.memo.bizApi.save();
    },
    onAccountState: (api: { canSave: boolean; save: () => void }) => {
      context.memo.accApi = api;
      if (!!api.canSave !== !!context.getState().accCanSave)
        setState({ accCanSave: !!api.canSave });
    },
    saveAccountHeader: () => {
      if (context.memo.accApi?.canSave) context.memo.accApi.save();
    },
    connectStripe: () => openSheet("stripe"),
    editTaxFromBusiness: () => {
      setState({ page: "payouts" });
      scrollBody(0, false);
    },
    payoutStatus: (!state.check?.stripe
      ? "none"
      : props.payouts || "active") as
      "none" | "verifying" | "action" | "paused" | "active",
    accountUpcoming: isNew
      ? 0
      : state.bookings.filter(
          ({ off, status }) => (off || 0) >= 0 && status !== "cancelled",
        ).length,
    onAccountNav: (to: "business" | "earnings") => {
      if (to === "earnings") {
        setState({ tab: "earnings", page: null });
        scrollBody(0, false);
      } else openSub(to);
    },
    onTaxEdit: () => openTf("taxcode", { flow: "info" }),
    onTaxAdd: () => {
      if (!hasTwoFactor(state)) {
        openTf("secure");
        return;
      }
      setState({ taxEdit: true });
    },
    onTaxSave: (value: TaxDetails) => {
      setState({ tax: value, taxEdit: false });
      toastMsg("Tax details saved");
      checkDone();
    },
    onTaxCancel: () => setState({ taxEdit: false }),
    onTaxLearn: () => openTf("learn", { flow: "info" }),
    onTfaTurnOn: () => openTf("method", { flow: "settings" }),
    onTfaAddBackup: () => openTf("backup", { flow: "add" }),
    onTfaRemove: (name: string) => openTf("remove", { name }),
  };
};

export type SettingsView = ReturnType<typeof getSettingsView>;
