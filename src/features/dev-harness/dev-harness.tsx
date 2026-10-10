import type { ReactNode } from "react";
import { useParams } from "react-router";
import { AccountSettings } from "../../components/account-settings/account-settings";
import type { AccountSettingsProps } from "../../components/account-settings/account-settings";
import { AddressFinder } from "../../components/address-finder/address-finder";
import { AllergyField } from "../../components/allergy-field/allergy-field";
import { BusinessDetails } from "../../components/business-details/business-details";
import type { BusinessDetailsProps } from "../../components/business-details/business-details";
import { CheckoutSheet } from "../../components/checkout-sheet/checkout-sheet";
import type { CheckoutSheetProps } from "../../components/checkout-sheet/checkout-sheet";
import { Earnings } from "../../components/earnings/earnings";
import type { EarningsProps } from "../../components/earnings/earnings";
import { PaymentPolicy } from "../../components/payment-policy/payment-policy";
import type { PaymentPolicyProps } from "../../components/payment-policy/payment-policy";
import { SearchSelect } from "../../components/search-select/search-select";
import type { SearchSelectProps } from "../../components/search-select/search-select";
import { StylistCard } from "../../components/stylist-card/stylist-card";
import { TaxDetailsForm } from "../../components/tax-details-form/tax-details-form";
import type { TaxDetailsFormProps } from "../../components/tax-details-form/tax-details-form";
import type { StylistCardProps } from "../../components/stylist-card/stylist-card";
import type { AddressFixture } from "../../components/address-finder/use-address-finder";
import styles from "./dev-harness.module.css";

const ADDRESS_FIXTURES: AddressFixture[] = [
  "",
  "typing",
  "postcode",
  "typo",
  "nomatch",
  "summary",
  "manual",
  "errors",
  "manual-errors",
];

const ALLERGY_160 =
  "Sensitive scalp, allergic to tea tree oil and some edge controls. Please use fragrance-free products where possible and avoid tight tension at the nape of the n";
const ALLERGY_200 =
  "Allergic to latex and lanolin. Sensitive scalp after relaxers in the past, so please patch test new products. Fragrance-free where possible, and gentle on the edges and nape. Thanks very much!!       ";

const STYLIST_CARDS: { fixture: string; props: StylistCardProps }[] = [
  {
    fixture: "home-usage",
    props: {
      href: "/stylist?stylist=amara-beauty",
      cover: "img/w161154.jpg",
      stylistName: "Amara Beauty",
      rating: "4.8",
      reviews: 146,
      area: "Hulme, Manchester",
      from: "£81.70",
      verified: true,
    },
  },
  {
    fixture: "meta",
    props: {
      href: "/stylist?stylist=studio-zuri",
      cover: "img/w162031.jpg",
      stylistName: "Studio Zuri",
      rating: "4.8",
      reviews: 121,
      area: "Salford",
      meta: "1.2 mi",
      verified: false,
    },
  },
  {
    fixture: "rows",
    props: {
      href: "/stylist?stylist=naturallynia",
      cover: "img/IMG_0013.jpg",
      stylistName: "NaturallyNia",
      rating: "5.0",
      reviews: 98,
      area: "Moss Side, Manchester",
      verified: true,
      rows: [
        {
          name: "Silk press",
          meta: "2 hr · from £30.95",
          href: "/book?stylist=naturallynia",
        },
        { name: "Define curls", meta: "1 hr 45 · from £25.88", href: "#" },
      ],
      facts: [
        { text: "Travels to you", strong: true },
        { text: "Next: Tue 13 Oct", strong: false },
      ],
      bookHref: "/book?stylist=naturallynia",
    },
  },
  {
    fixture: "services",
    props: {
      href: "/stylist?stylist=braid-bar-mcr",
      cover: "img/w161244.jpg",
      stylistName: "The Braid Bar MCR",
      rating: "4.7",
      reviews: 183,
      area: "Northern Quarter, Manchester",
      from: 41.1,
      verified: true,
      services: [
        "Fulani braids",
        { name: "Feed-in braids", status: "active" },
        { name: "Draft", status: "draft" },
      ],
    },
  },
];

const CATEGORY_OPTIONS = [
  { label: "Signature braids", dot: "var(--accent-700)" },
  { label: "Natural & silk press", dot: "var(--accent-500)" },
  { label: "+ New category", action: true },
];
const TYPE_OPTIONS = [
  {
    label: "Knotless braids",
    group: "Braids & Twists",
    keywords: ["knotless"],
  },
  { label: "Box braids", group: "Braids & Twists" },
  { label: "Silk press", group: "Natural Hair", keywords: ["press"] },
  { label: "other natural hair", group: "Natural Hair" },
];
const SEARCH_SELECTS: { fixture: string; props: SearchSelectProps }[] = [
  {
    fixture: "placeholder",
    props: { options: CATEGORY_OPTIONS, value: "", placeholder: "No category" },
  },
  {
    fixture: "value-dot",
    props: {
      options: CATEGORY_OPTIONS,
      value: "Signature braids",
      placeholder: "No category",
    },
  },
  {
    fixture: "disabled",
    props: {
      options: CATEGORY_OPTIONS,
      value: "",
      placeholder: "No category",
      disabled: true,
    },
  },
  {
    fixture: "open",
    props: {
      options: TYPE_OPTIONS,
      value: "Knotless braids",
      placeholder: "Search service types",
    },
  },
];

const HOME_BUSINESS = {
  type: "home",
  v: {
    line1: "12 Dickenson Road",
    line2: "Flat 2",
    city: "Manchester",
    pc: "M14 5HP",
  },
};
const SHOP_BUSINESS = {
  type: "chair",
  v: { line1: "48 Oxford Road", line2: "", city: "Manchester", pc: "M1 5QA" },
};
const TAX_FORMS: { fixture: string; props: TaxDetailsFormProps }[] = [
  ...(
    [
      "",
      "name-no",
      "ltd",
      "err-empty",
      "err-initials",
      "err-dob",
      "err-under18",
      "err-ni",
      "err-conum",
      "err-pc",
    ] as const
  ).map((fixture) => ({ fixture: fixture || "default", props: { fixture } })),
  { fixture: "settings", props: { mode: "settings" } },
  { fixture: "home-same", props: { business: HOME_BUSINESS } },
  { fixture: "home-ltd", props: { fixture: "ltd", business: HOME_BUSINESS } },
  { fixture: "shop-ltd", props: { fixture: "ltd", business: SHOP_BUSINESS } },
  {
    fixture: "value-sole",
    props: {
      mode: "settings",
      value: {
        kind: "sole",
        nameYes: false,
        first: "Amara",
        middle: "Chi",
        last: "Okonkwo",
        d: "04",
        m: "11",
        y: "1992",
        ni: "QQ 12 34 56 C",
        addrSame: false,
        addr: {
          line1: "7 Wilmslow Road",
          line2: "",
          city: "Manchester",
          pc: "M14 5TB",
        },
      },
    },
  },
  {
    fixture: "value-ltd",
    props: {
      mode: "settings",
      value: {
        kind: "ltd",
        coName: "Amara Beauty Ltd",
        coNum: "SC123456",
        addrSame: true,
      },
    },
  },
];

const BUSINESS_DETAILS: {
  fixture: string;
  isWide: boolean;
  props: BusinessDetailsProps;
}[] = [
  ...(
    [
      "shop",
      "chair",
      "home",
      "mobile",
      "vatValid",
      "vatInvalid",
      "unsaved",
      "pcError",
    ] as const
  ).map((preset) => ({ fixture: preset, isWide: false, props: { preset } })),
  { fixture: "wide-shop", isWide: true, props: { preset: "shop" } },
  { fixture: "wide-home", isWide: true, props: { preset: "home" } },
  { fixture: "embedded", isWide: true, props: { embedded: true } },
  {
    fixture: "embedded-hide",
    isWide: true,
    props: { embedded: true, hideSave: true },
  },
  { fixture: "no-tax", isWide: false, props: { tax: null } },
  {
    fixture: "ltd-tax",
    isWide: false,
    props: {
      tax: { kind: "ltd", coName: "Amara Beauty Ltd", coNum: "SC123456" },
    },
  },
  {
    fixture: "seeded",
    isWide: false,
    props: {
      value: {
        type: "mobile",
        vatOn: true,
        v: { basePc: "M20 3BW", radius: "15", vat: "312456789" },
      },
    },
  },
];

const PAYMENT_POLICIES: {
  fixture: string;
  isWide: boolean;
  props: PaymentPolicyProps;
}[] = [
  ...(["default", "full", "card", "none", "error", "unsaved"] as const).map(
    (preset) => ({ fixture: preset, isWide: false, props: { preset } }),
  ),
  { fixture: "wide-default", isWide: true, props: { preset: "default" } },
  { fixture: "wide-unsaved", isWide: true, props: { preset: "unsaved" } },
  { fixture: "embedded", isWide: true, props: { embedded: true } },
  {
    fixture: "embedded-hide",
    isWide: true,
    props: { embedded: true, hideSave: true },
  },
  { fixture: "one-booking", isWide: false, props: { bookingsCount: 1 } },
  {
    fixture: "no-bookings",
    isWide: false,
    props: { bookingsCount: 0, stylistName: "Kemi" },
  },
  {
    fixture: "seeded",
    isWide: true,
    props: {
      value: {
        mode: "card",
        deposit: 30,
        refundable: false,
        window: 24,
        grace: 15,
        late: { on: true, kind: "pct", pct: 40 },
        ns: { on: true, kind: "pct", pct: 100 },
        extras: [
          { type: "prep", text: "Come with hair washed and detangled." },
          { type: "custom", text: "No extra guests, please." },
        ],
      },
    },
  },
];

const ONE_DEVICE = [{ name: "Main phone", backup: false }];
const TWO_DEVICES = [
  { name: "Main phone", backup: false },
  { name: "Old iPhone", backup: true },
];
const SOLE_TAX = {
  kind: "sole" as const,
  nameYes: true,
  legalName: "Amara Okonkwo",
  d: "04",
  m: "11",
  y: "1992",
  ni: "QQ123456C",
  addrSame: false,
  addr: {
    line1: "7 Wilmslow Road",
    line2: "",
    city: "Manchester",
    pc: "M14 5TB",
  },
};
const LTD_TAX = {
  kind: "ltd" as const,
  coName: "Amara Beauty Ltd",
  coNum: "SC123456",
  addrSame: true,
  addr: {
    line1: "48 Oxford Road",
    line2: "",
    city: "Manchester",
    pc: "M1 5QA",
  },
};
const ACCOUNT_SETTINGS: {
  fixture: string;
  isWide: boolean;
  props: AccountSettingsProps;
}[] = [
  { fixture: "personal", isWide: false, props: { page: "personal" } },
  { fixture: "personal-wide", isWide: true, props: { page: "personal" } },
  {
    fixture: "personal-upcoming",
    isWide: false,
    props: { page: "personal", upcoming: 2 },
  },
  {
    fixture: "personal-one",
    isWide: false,
    props: { page: "personal", upcoming: 1 },
  },
  {
    fixture: "personal-owed",
    isWide: false,
    props: { page: "personal", owed: true },
  },
  { fixture: "security", isWide: false, props: { page: "security" } },
  { fixture: "security-wide", isWide: true, props: { page: "security" } },
  {
    fixture: "security-google",
    isWide: false,
    props: { page: "security", signIn: "google" },
  },
  {
    fixture: "security-apple",
    isWide: false,
    props: { page: "security", signIn: "apple" },
  },
  {
    fixture: "security-tfa",
    isWide: false,
    props: { page: "security", tfaDevices: ONE_DEVICE },
  },
  {
    fixture: "security-tfa2",
    isWide: false,
    props: { page: "security", tfaDevices: TWO_DEVICES },
  },
  { fixture: "notifications", isWide: false, props: { page: "notifications" } },
  {
    fixture: "notifications-wide",
    isWide: true,
    props: { page: "notifications" },
  },
  { fixture: "payouts", isWide: false, props: { page: "payouts" } },
  {
    fixture: "payouts-none",
    isWide: false,
    props: { page: "payouts", payoutStatus: "none" },
  },
  {
    fixture: "payouts-verifying",
    isWide: false,
    props: { page: "payouts", payoutStatus: "verifying" },
  },
  {
    fixture: "payouts-action",
    isWide: false,
    props: { page: "payouts", payoutStatus: "action" },
  },
  {
    fixture: "payouts-paused",
    isWide: false,
    props: { page: "payouts", payoutStatus: "paused" },
  },
  {
    fixture: "payouts-review",
    isWide: false,
    props: { page: "payouts", payoutStatus: "paused", pauseReason: "review" },
  },
  {
    fixture: "payouts-new",
    isWide: true,
    props: { page: "payouts", isNew: true },
  },
  {
    fixture: "payouts-tax",
    isWide: true,
    props: { page: "payouts", tax: SOLE_TAX },
  },
  {
    fixture: "payouts-tax-ltd",
    isWide: false,
    props: { page: "payouts", tax: LTD_TAX },
  },
  {
    fixture: "payouts-editing",
    isWide: false,
    props: {
      page: "payouts",
      tax: SOLE_TAX,
      taxEditing: true,
      taxLegalName: "Amara Okonkwo",
      taxBusinessName: "Amara Beauty Ltd",
    },
  },
  { fixture: "calendar", isWide: false, props: { page: "calendar" } },
  {
    fixture: "calendar-new",
    isWide: true,
    props: { page: "calendar", isNew: true },
  },
  {
    fixture: "embedded",
    isWide: true,
    props: { page: "personal", embedded: true },
  },
  {
    fixture: "embedded-hide",
    isWide: true,
    props: { page: "security", embedded: true, hideSave: true },
  },
];

const EARNINGS: { fixture: string; isWide: boolean; props: EarningsProps }[] = [
  { fixture: "default", isWide: true, props: {} },
  { fixture: "default-auto-phone", isWide: false, props: {} },
  { fixture: "mobile", isWide: true, props: { layout: "mobile" } },
  { fixture: "payouts", isWide: true, props: { tab: "po" } },
  { fixture: "payouts-phone", isWide: false, props: { tab: "po" } },
  { fixture: "onhold", isWide: true, props: { scenario: "onhold" } },
  {
    fixture: "onhold-po",
    isWide: true,
    props: { scenario: "onhold", tab: "po" },
  },
  { fixture: "paused", isWide: true, props: { scenario: "paused" } },
  { fixture: "setup", isWide: true, props: { scenario: "setup" } },
  {
    fixture: "setup-tax",
    isWide: true,
    props: { scenario: "setup", taxHold: true },
  },
  { fixture: "empty", isWide: false, props: { scenario: "empty" } },
  {
    fixture: "empty-po",
    isWide: false,
    props: { scenario: "empty", tab: "po" },
  },
  { fixture: "month", isWide: true, props: { period: "month" } },
  { fixture: "lastmonth", isWide: true, props: { period: "lastmonth" } },
  { fixture: "filt-fees", isWide: true, props: { filt: "fees" } },
];

const LIVE_BOOKING = {
  client: "Ama Mensah",
  first: "Ama",
  svc: "Fulani braids",
  meta: "Medium, bum length",
  price: 90,
  addons: [],
  mode: "deposit" as const,
  paid: 18,
  card: "5555",
  brand: "Mastercard",
  paidOn: "Sat 5 Sep",
  phone: "07700 900888",
  email: "ama.mensah@gmail.com",
  day: "Thu 10 Sep",
  time: "14:00–18:00",
  arrived: "13:57",
};
const LIVE_DONE = {
  method: "card" as const,
  via: "sms",
  charged: 72,
  tip: 0,
  refundAuto: 0,
};
const CHECKOUT_SHEETS: { fixture: string; props: CheckoutSheetProps }[] = [
  { fixture: "arrived", props: { scenario: "arrived" } },
  { fixture: "items", props: { scenario: "items" } },
  { fixture: "tip", props: { scenario: "tip" } },
  { fixture: "review", props: { scenario: "review" } },
  { fixture: "done", props: { scenario: "done" } },
  { fixture: "reduce", props: { scenario: "reduce" } },
  { fixture: "reduce-review", props: { scenario: "reduce-review" } },
  { fixture: "link", props: { scenario: "link" } },
  { fixture: "awaiting", props: { scenario: "awaiting" } },
  { fixture: "cash", props: { scenario: "cash" } },
  { fixture: "unpaid", props: { scenario: "unpaid" } },
  { fixture: "declined", props: { scenario: "declined" } },
  { fixture: "declined-hard", props: { scenario: "declined-hard" } },
  { fixture: "paid", props: { scenario: "paid" } },
  { fixture: "refund", props: { scenario: "refund" } },
  { fixture: "receipt", props: { scenario: "receipt" } },
  { fixture: "resend", props: { scenario: "resend" } },
  { fixture: "fee-pending", props: { scenario: "fee-pending" } },
  { fixture: "fee-waived", props: { scenario: "fee-waived" } },
  { fixture: "fee-unpaid", props: { scenario: "fee-unpaid" } },
  { fixture: "fee-collected", props: { scenario: "fee-collected" } },
  { fixture: "waive-dep", props: { scenario: "waive-dep" } },
  { fixture: "waive-nonref", props: { scenario: "waive-nonref" } },
  { fixture: "waive-full", props: { scenario: "waive-full" } },
  { fixture: "waive-card", props: { scenario: "waive-card" } },
  {
    fixture: "desktop-arrived",
    props: { scenario: "arrived", layout: "desktop" },
  },
  {
    fixture: "desktop-review",
    props: { scenario: "review", layout: "desktop" },
  },
  { fixture: "embedded", props: { booking: LIVE_BOOKING, radius: "16px" } },
  {
    fixture: "embedded-done",
    props: { booking: LIVE_BOOKING, start: "done", done: LIVE_DONE },
  },
];

const HARNESSES: Record<string, () => ReactNode> = {
  "address-finder": () =>
    ADDRESS_FIXTURES.map((fixture) => (
      <div
        key={fixture || "default"}
        className={styles.box}
        data-fx={fixture || "default"}
      >
        <AddressFinder
          fixture={fixture}
          idPrefix={"hx-" + (fixture || "default")}
        />
      </div>
    )),
  "allergy-field": () =>
    [
      { fixture: "default", props: {} },
      {
        fixture: "count",
        props: { stylistName: "Crowned by Kemi", value: ALLERGY_160 },
      },
      {
        fixture: "full",
        props: { stylistName: "Crowned by Kemi", value: ALLERGY_200 },
      },
      {
        fixture: "privacy",
        props: { stylistName: "Studio Zuri", openPrivacy: true },
      },
    ].map(({ fixture, props }) => (
      <div key={fixture} className={styles.box} data-fx={fixture}>
        <AllergyField {...props} />
      </div>
    )),
  "stylist-card": () =>
    STYLIST_CARDS.map(({ fixture, props }) => (
      <div key={fixture} className={styles.cardBox} data-fx={fixture}>
        <StylistCard {...props} />
      </div>
    )),
  "tax-details-form": () =>
    TAX_FORMS.map(({ fixture, props }) => (
      <div key={fixture} className={styles.formBox} data-fx={fixture}>
        <TaxDetailsForm {...props} />
      </div>
    )),
  "business-details": () =>
    BUSINESS_DETAILS.map(({ fixture, isWide, props }) => (
      <div
        key={fixture}
        className={isWide ? styles.wideBox : styles.phoneBox}
        data-fx={fixture}
      >
        {/* the prototype's dc-import host block (height auto) */}
        <div data-dc-host="">
          <BusinessDetails {...props} />
        </div>
      </div>
    )),
  "payment-policy": () =>
    PAYMENT_POLICIES.map(({ fixture, isWide, props }) => (
      <div
        key={fixture}
        className={isWide ? styles.wideBox : styles.phoneBox}
        data-fx={fixture}
      >
        {/* the prototype's dc-import host block (height auto) */}
        <div data-dc-host="">
          <PaymentPolicy {...props} />
        </div>
      </div>
    )),
  "account-settings": () =>
    ACCOUNT_SETTINGS.map(({ fixture, isWide, props }) => (
      <div
        key={fixture}
        className={isWide ? styles.wideAutoBox : styles.phoneAutoBox}
        data-fx={fixture}
      >
        {/* the prototype's dc-import host block */}
        <div data-dc-host="">
          <AccountSettings {...props} />
        </div>
      </div>
    )),
  earnings: () =>
    EARNINGS.map(({ fixture, isWide, props }) => (
      <div
        key={fixture}
        className={isWide ? styles.earningsBox : styles.phoneAutoBox}
        data-fx={fixture}
      >
        {/* the prototype's dc-import host block */}
        <div data-dc-host="">
          <Earnings {...props} />
        </div>
      </div>
    )),
  "checkout-sheet": () =>
    CHECKOUT_SHEETS.map(({ fixture, props }) => (
      <div key={fixture} className={styles.sheetBox} data-fx={fixture}>
        {/* the prototype's dc-import host block */}
        <div data-dc-host="">
          <CheckoutSheet {...props} />
        </div>
      </div>
    )),
  "search-select": () =>
    SEARCH_SELECTS.map(({ fixture, props }) => (
      <div key={fixture} className={styles.selectBox} data-fx={fixture}>
        <SearchSelect {...props} />
      </div>
    )),
};

/** Dev-only: renders a component in every fixture state, mirroring the prototype harness page for diffing. */
export const DevHarness = () => {
  const { component = "" } = useParams();
  const render = HARNESSES[component];
  return (
    <div className={styles.page}>{render ? render() : "Unknown harness"}</div>
  );
};
