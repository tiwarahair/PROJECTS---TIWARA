import type { NOTIFS } from "./studio-data";
// Studio state shapes: component state, clients, past bookings, seed services/add-ons.
import type { BusinessValue } from "../../components/business-details/business-details-logic";
import type { PolicyValue } from "../../components/payment-policy/payment-policy-logic";
import type { TwoFactorEnrolment } from "../../lib/two-factor";
import type { TaxDetails } from "../../components/tax-details-form/tax-details-logic";
import type { ServiceType } from "../../types/service-type";

export type StudioTab =
  "home" | "bookings" | "services" | "earnings" | "clients" | "settings";
export type StudioPage =
  | "availability"
  | "profile"
  | "business"
  | "rules"
  | "policy"
  | "personal"
  | "security"
  | "notifications"
  | "payouts"
  | "calendar";
export type SheetKind =
  | "booking"
  | "past"
  | "add"
  | "svcwiz"
  | "addon"
  | "cats"
  | "notif"
  | "profile"
  | "stripe"
  | "block"
  | "closed"
  | "client"
  | "clientEdit"
  | "cliView";
export type BookingStep =
  | "view"
  | "resched"
  | "cancel"
  | "editsvc"
  | "changesvc"
  | "addaddon"
  | "changeclient"
  | "checkout"
  | "noshow"
  | "payment"
  | "done";

interface ClientNotes {
  type?: string;
  size?: string;
  length?: string;
  products?: string;
}

export interface StudioClient {
  id: string | null;
  name: string;
  first?: string;
  area?: string;
  img?: string;
  visits?: number;
  last?: string;
  spent?: number;
  fav?: string;
  phone?: string;
  email?: string;
  address?: string;
  since?: string;
  sensitivities?: string;
  notes?: ClientNotes | null;
  blocked?: boolean;
  deleted?: boolean;
  walkIn?: boolean;
}

export interface BookingAddon {
  addonId?: string;
  id?: string;
  name?: string;
  price?: number;
  minutes?: number;
  quantity?: number;
}

export interface StudioBooking {
  id: number;
  dayOffset: number;
  time: string;
  duration: string;
  client: string | null;
  service: string;
  price: number;
  note?: string;
  pending: boolean;
  status: string;
  paid: string;
  protect?: string;
  protectionMode?: string;
  resends?: number;
  linkSentAt?: number;
  expiresAt?: number;
  stylistNote?: string;
  address?: string;
  walkIn?: boolean;
  movedByClient?: boolean;
  autoDone?: boolean;
  checkoutUnpaid?: boolean;
  extra?: number;
  addons?: BookingAddon[];
  priceReason?: string;
}

export interface CheckoutRecord {
  method: string;
  via: string;
  charged: number;
  tip: number;
  refundAuto: number;
  total: number;
  lines: {
    name: string;
    subtitle: string;
    base: number;
    adjustment: number;
    reason: string;
  }[];
  mode: string;
  paid: number;
}

export interface PastRecord {
  pastId?: string | number;
  client: string | null;
  service: string;
  price: number;
  when: string;
  time: string;
  status: string;
  duration?: string;
  at?: number;
  note?: string;
  meta?: string;
  feeKept?: boolean;
  feePending?: boolean;
  feeUnpaid?: boolean;
  feeLabel?: string;
  feeTries?: number;
  waived?: boolean;
  refunded?: number;
  refundReason?: string;
  linkPaid?: boolean;
  linkVia?: string;
  original?: StudioBooking;
  checkout?: CheckoutRecord;
  total?: number;
  paid?: number;
  method?: string;
}

export interface VariationRow {
  label: string;
  on: boolean;
  negative?: boolean;
  priceDelta: string;
  hoursDelta: string;
  minutesDelta: string;
}

export interface OwnOption {
  label: string;
  negative?: boolean;
  priceDelta: string;
  minutesDelta: string;
}

export interface OwnGroup {
  name: string;
  options: OwnOption[];
}

interface ServiceAddonLink {
  addonId: string;
  priceOverride: string | number | null;
  hoursOverride: string | number | null;
  minutesOverride: string | number | null;
}

export interface StudioService {
  id: string;
  taxonomyId: string | null;
  subcategory: string;
  typeId?: string | null;
  categoryId: string | null;
  own?: OwnGroup[];
  name: string;
  description: string;
  price: number;
  durationHours: number;
  durationMinutes: number;
  duration: string;
  extra?: number;
  extraCustom?: boolean;
  status: string;
  sizesOn: boolean;
  lengthsOn: boolean;
  sizes: VariationRow[];
  lengths: VariationRow[];
  addons: ServiceAddonLink[];
}

export interface StudioAddon {
  id: string;
  taxonomyId?: string;
  categoryId: string | null;
  name: string;
  price: number | string;
  hours: number | string;
  min: number | string;
  status?: string;
}

export interface StudioCategory {
  id: string;
  name: string;
  sort: number;
  colour: string;
}

export interface BlockedTime {
  id: string;
  day: string;
  dayIndex: number;
  span: string;
  reason: string;
  frequency?: string;
  ends?: string;
  endDayOffset?: number | null;
  color?: string;
  /** The reason as typed (reason adds the repeat label). */
  note?: string;
}

interface ClosedPeriod {
  id: string;
  from: string;
  to: string;
  span: string;
  reason: string;
}

interface WorkingHours {
  day: string;
  on: boolean;
  start: string;
  end: string;
}

interface StudioProfile {
  salon: string;
  about: string;
  address: string;
  mobile: boolean;
  site: string;
  instagram: string;
  tiktok: string;
  email: string;
  youtube?: string;
}

interface StudioRules {
  maxNotice: number;
  minNotice: number;
  extra: number;
  travel: number;
}

type StudioPolicy = Omit<PolicyValue, "extras"> & {
  extras: PolicyValue["extras"];
};

interface TwoFactorDevice {
  /** The Supabase factor; demo boards have none. */
  id?: string;
  name: string;
  backup: boolean;
}

export interface TwoFactorFlow {
  step: string;
  kind: string;
  name: string;
  code: string;
  error: string;
  errorMessage: string;
  keyShown: boolean;
  option: string;
  skipWarn: boolean;
  flow: string;
  from?: string;
  fixture?: string;
  /** A real account's app being added: its QR code and key. */
  enrolment?: TwoFactorEnrolment | null;
  isBusy?: boolean;
}

export interface ConfirmDialog {
  title?: string;
  body: string;
  yesLabel?: string;
  noLabel?: string;
  yes: () => void;
  onNo?: () => void;
}

export interface ActionItem {
  label: string;
  iconPath: string;
  subtitle?: string;
  disabled?: boolean;
  danger?: boolean;
  run: () => void;
}

interface ActionAnchor {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface ActionSheet {
  title: string;
  subtitle: string;
  anchor?: ActionAnchor | null;
  items: ActionItem[];
}

interface Popover {
  kind?: "block";
  time?: string;
  x: number;
  y: number;
  warn?: boolean;
  title?: string;
  subtitle?: string;
  block?: BlockedTime;
}

interface Tooltip {
  key: string;
  text: string;
  x: number;
  y: number;
  below?: boolean;
}

interface BlockDraft {
  day: number;
  start: string;
  end: string;
  reason: string;
  allDay?: boolean;
  frequency?: string;
  ends?: string;
  endDayOffset?: number | null;
  color?: string;
  editId?: string;
  force?: boolean;
}

interface ClosedDraft {
  from: string;
  to: string;
  reason: string;
  editId?: string;
}

interface ClientEditDraft {
  id: string | null;
  first: string;
  last: string;
  phone: string;
  email: string;
  type: string;
  size: string;
  length: string;
  products: string;
  sensitivities: string;
  img?: string;
}

interface NewClientDraft {
  first: string;
  last: string;
  email: string;
  phone: string;
}

interface AddNewClient {
  name: string;
  contact: string;
  email: string;
  address: string;
}

interface EditServiceDraft {
  serviceId: string | null;
  serviceName: string;
  taxonomyId: string | null;
  time: number;
  duration: number;
  price: string;
  originalPrice: string;
  priceOpen: boolean;
  priceReason: string;
  extra: number | null;
  addons: BookingAddon[];
}

export interface AddonEditDraft {
  context?: "add";
  id?: string;
  index?: number;
  name: string;
  price: string;
  hours: string;
  minutes: string;
  quantity: string;
}

interface CategoryDraft {
  name: string;
  colour: string;
  error: string;
}

export interface CategoriesUi {
  newName: string;
  newColour: string;
  newError: string;
  editId: string | null;
  editName: string;
  editColour: string | null;
  editError: string;
}

interface AddonQuickDraft {
  name: string;
  price: string;
  hours: string;
  min: string;
  categoryId?: string | null;
}

interface OwnEditDraft {
  index: number;
  name: string;
  options: OwnOption[];
  error: string;
}

export interface WizardDraft {
  name: string;
  description: string;
  taxonomyId: string | null;
  subcategory: string | null;
  typeId: string | null;
  categoryId: string | null;
  own: OwnGroup[];
  price: string;
  durationHours: string;
  durationMinutes: string;
  sizesOn: boolean;
  lengthsOn: boolean;
  sizes: VariationRow[];
  lengths: VariationRow[];
  addons: ServiceAddonLink[];
  status: string;
  extra: string;
}

export interface WizardState {
  mode: "add" | "edit";
  step: number;
  suggestionsOpen: boolean;
  flash: Record<string, number> | null;
  editId: string | null;
  search: string;
  other: boolean;
  review: boolean;
  openAddon: string | null;
  newAddon: AddonQuickDraft | null;
  addonQuery: string;
  draft: WizardDraft;
  categoryFilter?: string;
  pickGroup?: boolean;
  newCategory?: CategoryDraft | null;
  ownEdit?: OwnEditDraft | null;
  pendingAddons?: StudioAddon[];
  addonCategory?: string | null;
  subcategoryTipOpen?: boolean;
}

export interface Taxonomy {
  id: string;
  name: string;
  types: ServiceType[];
  subcategories: string[];
  other?: string;
  sizes: string[] | null;
  lengths: string[] | null;
}

interface StudioCheck {
  availability: boolean;
  profile: boolean;
  stripe: boolean;
}

export interface StudioState {
  /** A real stylist's ids (null on demo boards, which never save). */
  account: {
    stylistId: string;
    slug: string;
    slugChangedAt: string | null;
  } | null;
  /** The signed-in stylist (demo: Amara). */
  owner: {
    first: string;
    last: string;
    name: string;
    area: string;
    email: string;
    phone: string;
  };
  /** Home feed and notifications sheet; a new account has none. */
  notifications: typeof NOTIFS;
  avatarUrl: string | null;
  coverUrl: string | null;
  tab: StudioTab;
  selectedClientId: string | null;
  clientListQuery: string;
  clientSort: string;
  clientFilter: string;
  clientAppointmentsTab: string;
  clientOverrides: Record<string, Partial<StudioClient>>;
  clientEdit: ClientEditDraft | null;
  clientEditFromView?: boolean;
  range: "today" | "week" | "month";
  sheet: SheetKind | null;
  out: boolean;
  toast: string | null;
  pop: Popover | null;
  check: StudioCheck;
  twoFactorSettings: { devices: TwoFactorDevice[] };
  tax: Partial<TaxDetails> | null;
  taxEdit: boolean;
  twoFactor: TwoFactorFlow | null;
  twoFactorOut: boolean;
  shareTip: boolean;
  stripeBusy: boolean;
  nudge: boolean;
  serviceNudge: boolean;
  celebrated: boolean;
  page: StudioPage | null;
  pageFromSetup: boolean;
  setupMinimised: boolean;
  setupExit: "hold" | "out" | null;
  linkCard: boolean;
  lastDone: string | null;
  portfolio: { id: string; src: string; path?: string }[];
  chartIndex: number | null;
  dayIndex: number;
  bookingsLayout: string;
  calendarMode?: string;
  weekOffset?: number;
  listScope: string;
  bookingsQuery: string;
  filterRange: string;
  filterStatus: string;
  filterPayment: string;
  filterOpen: boolean;
  filterOut: boolean;
  datePickerOpen: boolean;
  notifAllRead: boolean;
  clientQuery: string;
  earningsSelection: number;
  bookingStep: BookingStep;
  rescheduleDay: number | null;
  rescheduleTime: string | null;
  rescheduleCustom?: boolean;
  pastNew: PastRecord[];
  pastOverrides?: Record<string, Partial<PastRecord>>;
  doneBooking: StudioBooking | null;
  bookingEdit: boolean;
  serviceHover: boolean;
  clientHover: boolean;
  changeClientQuery: string;
  clientFromBookingId: number | null;
  clientFromPastId?: string | number | null;
  fromClientId?: string | null;
  newClient: NewClientDraft | null;
  bookingStepOut: boolean;
  bookingStepBack: boolean;
  serviceEdit: EditServiceDraft | null;
  changeServiceQuery: string;
  addAddonQuery: string;
  addAddonCategory?: string | null;
  addonEdit: AddonEditDraft | null;
  bookingNoteOn: boolean;
  bookingNoteDraft: string;
  bookingAddressOn: boolean;
  bookingAddressDraft: string;
  cancelWho: string;
  cancelFee: boolean;
  cancelReason: string;
  checkoutMethod: string | null;
  noShowCharge: string;
  toastUndo: (() => void) | null;
  extraClients: StudioClient[];
  clientAddresses: Record<string, string>;
  sheetBookingId?: number | null;
  sheetClientId?: string | null;
  selectedPastId?: string | number | null;
  pastCheckoutPanel?: string | null;
  statusMenuOpen?: boolean;
  addRebook?: boolean;
  addStep: number;
  addClient: string | null;
  addService: string | null;
  addDay: number | null;
  addTime: string | null;
  addCustom: boolean;
  addClientQuery: string;
  addServiceQuery: string;
  addNew: AddNewClient | null;
  addDuration: number | null;
  addPrice: string | number | null;
  addOverlapAllowed: boolean;
  addNote: string;
  addDeposit: string;
  addAddress: string;
  addWalkIn: boolean;
  addProtection: string;
  addEditService?: boolean;
  addAddonPickerOpen?: boolean;
  addAddons?: string[];
  addAddonOverrides?: Record<
    string,
    { price: number; minutes: number; quantity: number }
  >;
  addExtra?: number;
  calendarOpen: boolean;
  calendarMonth: number | null;
  calendarYear: number | null;
  rescheduleCalendarOpen: boolean;
  rescheduleCalendarMonth: number | null;
  rescheduleCalendarYear: number | null;
  bookingCalendarOpen: boolean;
  bookingCalendarMonth: number | null;
  bookingCalendarYear: number | null;
  pastFilter: string;
  serviceQuery: string;
  serviceStatusFilter: string;
  serviceCategoryFilter: string;
  addonCategoryFilter?: string;
  selectedServiceId?: string | null;
  serviceStatusOpen?: boolean;
  confirm: ConfirmDialog | null;
  confirmOut: boolean;
  actionSheet: ActionSheet | null;
  actionSheetOut: boolean;
  blockCalendarOpen: boolean;
  blockCalendarMonth: number | null;
  blockCalendarYear: number | null;
  endCalendarOpen: boolean;
  endCalendarOut: boolean;
  endCalendarMonth: number | null;
  endCalendarYear: number | null;
  quickAdd: { time: string | null } | null;
  quickAddOut: boolean;
  servicesTab: string;
  wizard: WizardState | null;
  addonDraft: StudioAddon | null;
  addonNewCategory?: CategoryDraft | null;
  categoriesUi?: CategoriesUi;
  blockDraft: BlockDraft;
  closedDraft: ClosedDraft;
  bookings: StudioBooking[];
  categories: StudioCategory[];
  services: StudioService[];
  addons: StudioAddon[];
  blocked: BlockedTime[];
  closed: ClosedPeriod[];
  hours: WorkingHours[];
  profile: StudioProfile;
  business: BusinessValue;
  policy: StudioPolicy;
  rules: StudioRules;
  sidebarOpen?: boolean | null;
  calendarEmptyHidden?: boolean;
  slideFrom?: number | null;
  tip?: Tooltip | null;
  pause?: { on: boolean; until: string };
  stripeBusyAt?: number;
  policyCanSave?: boolean;
  accountCanSave?: boolean;
  businessCanSave?: boolean;
}

export type StudioPatch =
  Partial<StudioState> | ((current: StudioState) => Partial<StudioState>);
