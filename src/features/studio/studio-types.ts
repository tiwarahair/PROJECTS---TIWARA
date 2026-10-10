// Studio state shapes (prototype Studio.dc.html: class Component state, CLIENTS, PAST, seed services/add-ons).
import type { BusinessValue } from "../../components/business-details/business-details-logic";
import type { PolicyValue } from "../../components/payment-policy/payment-policy-logic";
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

export interface ClientNotes {
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
  addr?: string;
  since?: string;
  sens?: string;
  notes?: ClientNotes | null;
  blocked?: boolean;
  deleted?: boolean;
  walkIn?: boolean;
}

export interface BookingAddon {
  aid?: string;
  id?: string;
  name?: string;
  price?: number;
  mins?: number;
  qty?: number;
}

export interface StudioBooking {
  id: number;
  off: number;
  time: string;
  dur: string;
  client: string | null;
  svc: string;
  price: number;
  note?: string;
  pending: boolean;
  status: string;
  paid: string;
  protect?: string;
  protMode?: string;
  resends?: number;
  linkSentAt?: number;
  expiresAt?: number;
  stylistNote?: string;
  addr?: string;
  walkIn?: boolean;
  movedByClient?: boolean;
  autoDone?: boolean;
  ckUnpaid?: boolean;
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
    sub: string;
    base: number;
    adj: number;
    reason: string;
  }[];
  mode: string;
  paid: number;
}

export interface PastRecord {
  pid?: string | number;
  client: string | null;
  svc: string;
  price: number;
  when: string;
  time: string;
  status: string;
  dur?: string;
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
  orig?: StudioBooking;
  ck?: CheckoutRecord;
  total?: number;
  paid?: number;
  method?: string;
}

export interface VariationRow {
  label: string;
  on: boolean;
  neg?: boolean;
  dp: string;
  dh: string;
  dm: string;
}

export interface OwnOption {
  label: string;
  neg?: boolean;
  dp: string;
  dm: string;
}

export interface OwnGroup {
  name: string;
  options: OwnOption[];
}

export interface ServiceAddonLink {
  aid: string;
  ovP: string | number | null;
  ovH: string | number | null;
  ovM: string | number | null;
}

export interface StudioService {
  id: string;
  cat: string | null;
  sub: string;
  typeId?: string | null;
  categoryId: string | null;
  own?: OwnGroup[];
  name: string;
  desc: string;
  price: number;
  durH: number;
  durM: number;
  dur: string;
  extra?: number;
  extraCustom?: boolean;
  st: string;
  sizesOn: boolean;
  lengthsOn: boolean;
  sizes: VariationRow[];
  lengths: VariationRow[];
  addons: ServiceAddonLink[];
}

export interface StudioAddon {
  id: string;
  cat?: string;
  categoryId: string | null;
  name: string;
  price: number | string;
  hr: number | string;
  min: number | string;
  st?: string;
}

export interface StudioCategory {
  id: string;
  name: string;
  sort: number;
  colour: string;
}

export interface BlockedTime {
  id: number;
  day: string;
  dayIdx: number;
  span: string;
  reason: string;
  freq?: string;
  ends?: string;
  endOff?: number | null;
  color?: string;
}

export interface ClosedPeriod {
  id: number;
  from: string;
  to: string;
  span: string;
  reason: string;
}

export interface WorkingHours {
  d: string;
  on: boolean;
  s: string;
  e: string;
}

export interface StudioProfile {
  salon: string;
  about: string;
  addr: string;
  mobile: boolean;
  site: string;
  ig: string;
  tiktok: string;
  email: string;
  youtube?: string;
}

export interface StudioRules {
  maxNotice: number;
  minNotice: number;
  extra: number;
  travel: number;
}

export type StudioPolicy = Omit<PolicyValue, "extras"> & {
  extras: PolicyValue["extras"];
};

export interface TwoFactorDevice {
  name: string;
  backup: boolean;
}

export interface TwoFactorFlow {
  step: string;
  kind: string;
  name: string;
  code: string;
  err: string;
  errMsg: string;
  keyOn: boolean;
  opt: string;
  skipWarn: boolean;
  flow: string;
  from?: string;
  fx?: string;
}

export interface ConfirmDialog {
  title?: string;
  body: string;
  yesLabel?: string;
  noLabel?: string;
  yes: () => void;
  no?: () => void;
}

export interface ActionItem {
  label: string;
  d: string;
  sub?: string;
  off?: boolean;
  danger?: boolean;
  run: () => void;
}

export interface ActionAnchor {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface ActionSheet {
  title: string;
  sub: string;
  anchor?: ActionAnchor | null;
  items: ActionItem[];
}

export interface Popover {
  kind?: "block";
  time?: string;
  x: number;
  y: number;
  warn?: boolean;
  title?: string;
  sub?: string;
  b?: BlockedTime;
}

export interface Tooltip {
  key: string;
  text: string;
  x: number;
  y: number;
  below?: boolean;
}

export interface BlockDraft {
  day: number;
  start: string;
  end: string;
  reason: string;
  allDay?: boolean;
  freq?: string;
  ends?: string;
  endOff?: number | null;
  color?: string;
  editId?: number;
  force?: boolean;
}

export interface ClosedDraft {
  from: string;
  to: string;
  reason: string;
  editId?: number;
}

export interface ClientEditDraft {
  id: string | null;
  first: string;
  last: string;
  phone: string;
  email: string;
  type: string;
  size: string;
  length: string;
  products: string;
  sens: string;
  img?: string;
}

export interface NewClientDraft {
  first: string;
  last: string;
  email: string;
  phone: string;
}

export interface AddNewClient {
  name: string;
  contact: string;
  email: string;
  addr: string;
}

export interface EditServiceDraft {
  svcId: string | null;
  svcName: string;
  cat: string | null;
  time: number;
  dur: number;
  price: string;
  price0: string;
  priceOpen: boolean;
  priceReason: string;
  extra: number | null;
  addons: BookingAddon[];
}

export interface AddonEditDraft {
  ctx?: "add";
  id?: string;
  idx?: number;
  name: string;
  price: string;
  hrs: string;
  mins: string;
  qty: string;
}

export interface CategoryDraft {
  name: string;
  colour: string;
  err: string;
}

export interface CategoriesUi {
  newName: string;
  newColour: string;
  newErr: string;
  editId: string | null;
  editName: string;
  editColour: string | null;
  editErr: string;
}

export interface AddonQuickDraft {
  name: string;
  price: string;
  hr: string;
  min: string;
  categoryId?: string | null;
}

export interface OwnEditDraft {
  idx: number;
  name: string;
  options: OwnOption[];
  err: string;
}

export interface WizardDraft {
  name: string;
  desc: string;
  cat: string | null;
  sub: string | null;
  typeId: string | null;
  categoryId: string | null;
  own: OwnGroup[];
  price: string;
  durH: string;
  durM: string;
  sizesOn: boolean;
  lengthsOn: boolean;
  sizes: VariationRow[];
  lengths: VariationRow[];
  addons: ServiceAddonLink[];
  st: string;
  extra: string;
}

export interface WizardState {
  mode: "add" | "edit";
  step: number;
  sugg: boolean;
  flash: Record<string, number> | null;
  editId: string | null;
  search: string;
  other: boolean;
  review: boolean;
  openAddon: string | null;
  newAddon: AddonQuickDraft | null;
  aq: string;
  draft: WizardDraft;
  catF?: string;
  pickGroup?: boolean;
  newCat?: CategoryDraft | null;
  ownEd?: OwnEditDraft | null;
  pendAddons?: StudioAddon[];
  aCat?: string | null;
  subTip?: boolean;
}

export interface Taxonomy {
  id: string;
  name: string;
  types: ServiceType[];
  subs: string[];
  other?: string;
  sizes: string[] | null;
  lengths: string[] | null;
}

export interface StudioCheck {
  avail: boolean;
  profile: boolean;
  stripe: boolean;
}

export interface StudioState {
  avatarUrl: string | null;
  coverUrl: string | null;
  tab: StudioTab;
  cliSel: string | null;
  cliQ: string;
  cliSort: string;
  cliFilt: string;
  cliApptTab: string;
  cliOv: Record<string, Partial<StudioClient>>;
  ce: ClientEditDraft | null;
  ceFromView?: boolean;
  range: "today" | "week" | "month";
  sheet: SheetKind | null;
  out: boolean;
  sub: string | null;
  subOut: boolean;
  toast: string | null;
  pop: Popover | null;
  check: StudioCheck;
  tfa: { devices: TwoFactorDevice[] };
  tax: Partial<TaxDetails> | null;
  taxEdit: boolean;
  tf: TwoFactorFlow | null;
  tfOut: boolean;
  shareTip: boolean;
  stripeBusy: boolean;
  nudge: boolean;
  svcNudge: boolean;
  celebrated: boolean;
  page: StudioPage | null;
  pageFromSetup: boolean;
  setupMin: boolean;
  setupExit: "hold" | "out" | null;
  linkCard: boolean;
  lastDone: string | null;
  portfolio: { id: string; src: string }[];
  chartIdx: number | null;
  dayIdx: number;
  bview: string;
  calMode?: string;
  wkOff?: number;
  listScope: string;
  bkQ: string;
  fRange: string;
  fStatus: string;
  fPay: string;
  filtOpen: boolean;
  filtOut: boolean;
  dpOpen: boolean;
  notifAllRead: boolean;
  clientQuery: string;
  earnSel: number;
  bkStep: BookingStep;
  rsDay: number | null;
  rsTime: string | null;
  rsCustom?: boolean;
  pastNew: PastRecord[];
  pastOv?: Record<string, Partial<PastRecord>>;
  bkDoneB: StudioBooking | null;
  bkEdit: boolean;
  svcHov: boolean;
  cliHov: boolean;
  ccQ: string;
  cFromB: number | null;
  cFromP?: string | number | null;
  fromCli?: string | null;
  newClient: NewClientDraft | null;
  bkOut: boolean;
  bkBack: boolean;
  es: EditServiceDraft | null;
  csQ: string;
  aaQ: string;
  aaCat?: string | null;
  esAddon: AddonEditDraft | null;
  bkNoteOn: boolean;
  bkNoteDraft: string;
  bkLocOn: boolean;
  bkAddrDraft: string;
  cxWho: string;
  cxFee: boolean;
  cxReason: string;
  coMethod: string | null;
  nsCharge: string;
  toastUndo: (() => void) | null;
  extraClients: StudioClient[];
  clientAddrs: Record<string, string>;
  sheetBId?: number | null;
  sheetCId?: string | null;
  pastSel?: string | number | null;
  pastCk?: string | null;
  stMenu?: boolean;
  addRebook?: boolean;
  addStep: number;
  addClient: string | null;
  addSvc: string | null;
  addDay: number | null;
  addTime: string | null;
  addCustom: boolean;
  addQ: string;
  addSvcQ: string;
  addNew: AddNewClient | null;
  addDur: number | null;
  addPrice: string | number | null;
  addOverlapOk: boolean;
  addNote: string;
  addDep: string;
  addAddr: string;
  addWalkIn: boolean;
  addProt: string;
  addEditSvc?: boolean;
  addAoPick?: boolean;
  addAddons?: string[];
  addAoOv?: Record<string, { price: number; mins: number; qty: number }>;
  addExtra?: number;
  calOpen: boolean;
  calM: number | null;
  calY: number | null;
  rsCalOpen: boolean;
  rsCalM: number | null;
  rsCalY: number | null;
  bkCal: boolean;
  bkCalM: number | null;
  bkCalY: number | null;
  pastFilter: string;
  svcQuery: string;
  svcStatusFilter: string;
  svcCat: string;
  addonCat?: string;
  svcSel?: string | null;
  svcStatOpen?: boolean;
  confirm: ConfirmDialog | null;
  confirmOut: boolean;
  acts: ActionSheet | null;
  actsOut: boolean;
  blCalOpen: boolean;
  blCalM: number | null;
  blCalY: number | null;
  endCal: boolean;
  endCalOut: boolean;
  ecM: number | null;
  ecY: number | null;
  qa: { time: string | null } | null;
  qaOut: boolean;
  svcTab: string;
  wiz: WizardState | null;
  addonDraft: StudioAddon | null;
  adNewCat?: CategoryDraft | null;
  catsUi?: CategoriesUi;
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
  sbOpen?: boolean | null;
  calEmptyHidden?: boolean;
  slideFrom?: number | null;
  tip?: Tooltip | null;
  pause?: { on: boolean; until: string };
  stripeBusyAt?: number;
  polCanSave?: boolean;
  accCanSave?: boolean;
  bizCanSave?: boolean;
}

export type StudioPatch =
  Partial<StudioState> | ((current: StudioState) => Partial<StudioState>);
