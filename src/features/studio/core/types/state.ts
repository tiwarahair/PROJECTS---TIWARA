import type { BusinessValue } from "../../../../components/business-details/types";
import type {
  NotificationSettings,
  PayoutStatus,
} from "../../../../components/account-settings/logic";
import type { TaxDetails } from "../../../../components/tax-details-form/logic";
import type { PastCursor } from "../../../../lib/studio-api/bookings";
import type { NOTIFS } from "../seed-dashboard";
import type {
  BlockDraft,
  BlockedTime,
  ClosedDraft,
  ClosedPeriod,
  WorkingHours,
} from "./availability";
import type {
  AddonEditDraft,
  DisputeForm,
  EditServiceDraft,
  PastRecord,
  StudioBooking,
} from "./bookings";
import type {
  AddNewClient,
  ClientEditDraft,
  NewClientDraft,
  StudioClient,
} from "./clients";
import type { ActionSheet, ConfirmDialog, Popover, Tooltip } from "./overlays";
import type {
  CategoriesUi,
  CategoryDraft,
  StudioAddon,
  StudioCategory,
  StudioService,
  WizardState,
} from "./services";
import type {
  StudioCheck,
  StudioPolicy,
  StudioProfile,
  StudioRules,
  TwoFactorDevice,
  TwoFactorFlow,
} from "./settings";
import type { BookingStep, SheetKind, StudioPage, StudioTab } from "./views";

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
  /** A real account's Stripe status and payout bank (demo boards derive the status from check.stripe). */
  payoutStatus: PayoutStatus | null;
  payoutBank: string | null;
  /** A real account's saved notification choices (Settings → Notifications). */
  notificationPrefs: Partial<NotificationSettings>;
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
  bookingClients: StudioClient[];
  /** Where the next page of a real account's Past starts; null once it's all loaded. */
  pastCursor: PastCursor | null;
  isPastLoading: boolean;
  clientAddresses: Record<string, string>;
  sheetBookingId?: number | null;
  sheetClientId?: string | null;
  selectedPastId?: string | number | null;
  pastCheckoutPanel?: string | null;
  correctPayment?: { amount: string; tip: string; via: string } | null;
  disputeForm?: DisputeForm | null;
  answeredDisputes?: Record<string, string>;
  isOwedSettling?: boolean;
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
  addUnpaidFee?: { bookingId: string; amount: number; kind: string } | null;
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
