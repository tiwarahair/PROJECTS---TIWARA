// Account's ?fixture= board states (dev-only).
import { CURRENT_PASSWORD, DEMO_PHOTO, SEED_PROFILE } from "./account-data";
import type { AccountState } from "./use-account";

export const applyFixture = (state: AccountState, fixture: string): void => {
  const openPassword = {
    ...state.password,
    open: true,
    current: CURRENT_PASSWORD,
    next: "braids in the sun on sunday",
  };

  const pendingDraft = { ...SEED_PROFILE, email: "nia.okafor@outlook.com" };

  const fixtures: Record<string, Partial<AccountState>> = {
    "ov-empty": { sectionId: "overview" },
    "bk-empty": { sectionId: "bookings" },
    "bk-past": { sectionId: "bookings", bookingsTab: "past" },
    "bk-none": { sectionId: "bookings" },
    receipt: {
      sectionId: "bookings",
      dialog: { kind: "receipt", id: "TH-47702" },
    },
    "quiz-none": { sectionId: "hair", quiz: false },
    "alg-edit": {
      sectionId: "shared",
      allergyEdit: 0,
      allergyDraft: "Sensitive scalp",
    },
    "profile-full": {
      sectionId: "personal",
      photo: DEMO_PHOTO,
    },
    "photo-error": {
      sectionId: "personal",
      photoError: "That photo is too big. Choose one under 10MB.",
    },
    "personal-edit": { sectionId: "personal", edit: "name" },
    "email-edit": {
      sectionId: "personal",
      edit: "email",
      draft: { ...SEED_PROFILE, email: "" },
    },
    "email-invalid": {
      sectionId: "personal",
      edit: "email",
      draft: { ...SEED_PROFILE, email: "nia.okafor@gmail" },
      fieldErrors: { email: "Enter an email address like name@example.com" },
    },
    "email-same": {
      sectionId: "personal",
      edit: "email",
      draft: { ...SEED_PROFILE, email: "nia.okafor@gmail.com" },
      fieldErrors: { email: "That’s already your email" },
    },
    "email-taken": {
      sectionId: "personal",
      edit: "email",
      draft: { ...SEED_PROFILE, email: "kemi.a@icloud.com" },
      fieldErrors: { email: "This email is already used by another account" },
    },
    "email-wrong": {
      sectionId: "personal",
      edit: "email",
      emailStep: "code",
      pendingEmail: "nia.okafor@outlook.com",
      resendIn: 18,
      code: ["1", "1", "1", "1", "1", "1"],
      codeError: "That code isn’t right",
      draft: pendingDraft,
    },
    "email-expired": {
      sectionId: "personal",
      edit: "email",
      emailStep: "code",
      pendingEmail: "nia.okafor@outlook.com",
      resendIn: 0,
      code: ["0", "0", "0", "0", "0", "0"],
      codeError: "That code has expired. Send a new one.",
      draft: pendingDraft,
    },
    "email-pending": {
      sectionId: "personal",
      pendingEmail: "nia.okafor@outlook.com",
    },
    "email-done": {
      sectionId: "personal",
      profile: { ...SEED_PROFILE, email: "nia.okafor@outlook.com" },
      toast: "Email updated. We’ve let nia.okafor@gmail.com know.",
    },
    "email-code": {
      sectionId: "personal",
      edit: "email",
      emailStep: "code",
      pendingEmail: "nia.okafor@outlook.com",
      resendIn: 24,
      draft: pendingDraft,
    },
    "pw-open": { sectionId: "security", password: openPassword },
    nopw: {
      sectionId: "security",
      password: { ...state.password, has: false },
    },
    "logout-all": { sectionId: "security", dialog: { kind: "logoutAll" } },
    "cards-empty": { sectionId: "payments", cards: [] },
    "card-remove": {
      sectionId: "payments",
      dialog: { kind: "card", id: "c2" },
    },
    "add-card": { sectionId: "payments", dialog: { kind: "addCard" } },
    "addr-empty": { sectionId: "addresses", addresses: [] },
    "addr-add": {
      sectionId: "addresses",
      addressForm: {
        mode: "add",
        label: "Mum’s",
        address: null,
        isDefault: false,
        tried: false,
      },
    },
    "addr-edit": { sectionId: "addresses" },
    "addr-remove": { sectionId: "addresses" },
    "mkt-on": { sectionId: "communication", marketing: true },
    "sync-reset": { sectionId: "communication", dialog: { kind: "sync" } },
    cookies: { sectionId: "privacy", dialog: { kind: "cookies" } },
    "delete-blocked": { sectionId: "privacy", dialog: { kind: "delete" } },
    "delete-allowed": { sectionId: "privacy", dialog: { kind: "delete" } },
    deleted: { deleted: true },
  };

  Object.assign(state, fixtures[fixture] ?? {});
  const [first, second] = state.addresses;

  if (fixture === "addr-edit" && first)
    state.addressForm = {
      mode: "edit",
      id: first.id,
      label: first.label,
      address: {
        line1: first.line1,
        line2: first.line2,
        town: first.town,
        postcode: first.postcode,
        source: "manual",
      },
      isDefault: first.isDefault,
      tried: false,
    };

  if (fixture === "addr-remove" && second)
    state.dialog = { kind: "address", id: second.id };
};
