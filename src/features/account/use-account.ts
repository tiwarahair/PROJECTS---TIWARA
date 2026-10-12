import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { ACCOUNT_TAB_EVENT } from "../../components/account-menu/account-menu";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { logOut } from "../../stores/session-slice";
import type { SavedAddress } from "../../types/address";
import { formatPostcode, isAddressValid } from "../../utils/address";
import type { AddressValue } from "../../types/address";
import { getSearchParams } from "../../utils/page-flags";
import { checkPassword, getPasswordMin } from "../../utils/password";
import { getSavedAddresses, saveAddresses } from "../../utils/saved-addresses";
import {
  DEMO_PHOTO,
  getSeedBookings,
  LEGACY_TABS,
  SEED_PROFILE,
  SECTION_IDS,
  SEED_CARDS,
  SHARED_ENTRIES,
} from "./account-data";
import type { AccountBooking, Profile, SavedCard } from "./account-data";
import { getCardErrors, validateEdit } from "./account-logic";
import type { EditKey } from "./account-logic";

export type DialogState =
  | { kind: "receipt"; id: string }
  | { kind: "allergy"; index: number }
  | { kind: "card"; id: string }
  | { kind: "address"; id: string }
  | { kind: "addCard" | "logoutAll" | "sync" | "cookies" | "delete" };

export interface AddressForm {
  mode: "add" | "edit";
  id?: string;
  label: string;
  address: (AddressValue & { source?: string }) | null;
  isDefault: boolean;
  tried: boolean;
}

export interface PasswordState {
  has: boolean;
  open: boolean;
  current: string;
  next: string;
  show: boolean;
  tried: boolean;
  blur: boolean;
  currentError: string;
  changed?: boolean;
}

export interface AccountState {
  fixture: string;
  sectionId: string | null;
  wide: boolean;
  menuOpen: boolean;
  dialog: DialogState | null;
  toast: string;
  bookings: AccountBooking[];
  bookingsTab?: "up" | "past";
  entries: { id: string; text: string }[];
  allergyEdit: number;
  allergyDraft: string;
  profile: Profile;
  photo: string | null;
  photoError: string;
  quiz: boolean;
  edit: EditKey | null;
  draft: Profile;
  fieldErrors: Record<string, string>;
  emailStep: "" | "code";
  pendingEmail?: string;
  code: string[];
  codeError: string;
  shake: number;
  resendIn: number;
  password: PasswordState;
  googleConnected: boolean;
  appleConnected: boolean;
  cards: SavedCard[];
  cardForm: { number: string; expiry: string; cvc: string; isDefault: boolean };
  cardFormErrors: Record<string, string>;
  addresses: SavedAddress[];
  addressForm: AddressForm | null;
  addressMenu?: string | null;
  marketing: boolean;
  sync: string;
  cookies: { analytics: boolean; marketing: boolean };
  cookiesDraft: { analytics: boolean; marketing: boolean };
  deleteText: string;
  loggedOut: boolean;
  deleted: boolean;
}

type StatePatch =
  Partial<AccountState> | ((state: AccountState) => Partial<AccountState>);

export interface AccountProps {
  section?: string;
  fixture?: string;
  /** Hair quiz taken (?quiz=0|1). */
  hairQuiz?: boolean;
  /** Has a profile photo (?photo=0|1). */
  photo?: boolean;
  /** Marketing emails on (?mkt=0|1). */
  marketing?: boolean;
}

const EMPTY_CODE = ["", "", "", "", "", ""];
const CORRECT_CODE = "123456";
const EXPIRED_CODE = "000000";
const CURRENT_PASSWORD = "sunflower9";
const TOAST_MS = 3200;
const WIDE_PX = 960;

// Card brand by the number's first digit
const CARD_BRANDS: Record<string, string> = {
  "4": "Visa",
  "5": "Mastercard",
  "3": "Amex",
};

/** ?section= (or legacy ?tab=), else the prop; only real sections. */
const readSection = (propSection?: string): string | null => {
  const params = getSearchParams();
  let section = params.get("section") || params.get("tab") || propSection || "";

  section = LEGACY_TABS[section] || section;

  return SECTION_IDS.includes(section) ? section : null;
};

const getInitialState = ({
  section,
  fixture: propFixture,
  hairQuiz = true,
  photo = false,
  marketing = false,
}: AccountProps): AccountState => {
  const params = getSearchParams();
  const fixture = params.get("fixture") || propFixture || "";

  const flag = (key: string, fallback: boolean) =>
    params.has(key) ? params.get(key) === "1" : fallback;

  const state: AccountState = {
    fixture,
    sectionId: readSection(section),
    wide: window.innerWidth >= WIDE_PX,
    menuOpen: false,
    dialog: null,
    toast: "",
    bookings: getSeedBookings(fixture),
    entries: SHARED_ENTRIES.map((entry) => ({ ...entry })),
    allergyEdit: -1,
    allergyDraft: "",
    profile: SEED_PROFILE,
    photo: flag("photo", photo) ? DEMO_PHOTO : null,
    photoError: "",
    quiz: flag("quiz", hairQuiz),
    edit: null,
    draft: { ...SEED_PROFILE },
    fieldErrors: {},
    emailStep: "",
    code: EMPTY_CODE,
    codeError: "",
    shake: 0,
    resendIn: 0,
    password: {
      has: true,
      open: false,
      current: "",
      next: "",
      show: false,
      tried: false,
      blur: false,
      currentError: "",
    },
    googleConnected: true,
    appleConnected: false,
    cards: SEED_CARDS.map((card) => ({ ...card })),
    cardForm: { number: "", expiry: "", cvc: "", isDefault: false },
    cardFormErrors: {},
    addresses: getSavedAddresses(),
    addressForm: null,
    marketing: flag("mkt", marketing),
    sync: "k7f2m9qx",
    cookies: { analytics: false, marketing: false },
    cookiesDraft: { analytics: false, marketing: false },
    deleteText: "",
    loggedOut: false,
    deleted: false,
  };

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

  const fromUrl = readSection(section);

  if (fromUrl) state.sectionId = fromUrl;

  return state;
};

/** Account state and actions. */
export const useAccount = (props: AccountProps) => {
  const [state, setRawState] = useState(() => getInitialState(props));
  const stateRef = useRef(state);

  stateRef.current = state;
  const afterCommit = useRef<(() => void)[]>([]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const sessionLoggedIn = useAppSelector((root) => root.session.loggedIn);

  const refs = useMemo(
    () => ({
      dialog: createRef<HTMLDivElement>(),
      first: createRef<HTMLInputElement>(),
      email: createRef<HTMLInputElement>(),
      mobile: createRef<HTMLInputElement>(),
      current: createRef<HTMLInputElement>(),
      next: createRef<HTMLInputElement>(),
      deleteConfirm: createRef<HTMLInputElement>(),
      file: createRef<HTMLInputElement>(),
      addressLabel: createRef<HTMLInputElement>(),
      code: EMPTY_CODE.map(() => createRef<HTMLInputElement>()),
    }),
    [],
  );

  const returnFocus = useRef<Element | null>(null);
  const toastTimer = useRef(0);
  const resendTimer = useRef(0);

  usePasswordChecker();

  const setState = useCallback((patch: StatePatch, callback?: () => void) => {
    if (callback) afterCommit.current.push(callback);

    setRawState((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));
  }, []);

  useEffect(() => {
    const callbacks = afterCommit.current.splice(0);

    for (const callback of callbacks) callback();
  });

  const focusables = (root: HTMLElement) =>
    [
      ...root.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => element.offsetParent !== null);

  const focusDialog = useCallback(() => {
    const dialog = refs.dialog.current;

    if (!dialog) return;

    const elements = focusables(dialog);

    const preferred = dialog.querySelector<HTMLElement>(
      "input:not([type=checkbox])",
    );

    (preferred || elements[1] || elements[0] || dialog).focus();
  }, [refs]);

  /** Focus after the render settles. */
  const focusLater = useCallback(
    (target: string) => {
      window.setTimeout(() => {
        const current = stateRef.current;

        if (target === "title")
          document.getElementById("ac-title")?.focus({ preventScroll: true });

        if (target.startsWith("row:"))
          document.getElementById(`ac-row-${target.slice(4)}`)?.focus();

        if (target === "dialog") focusDialog();

        if (target === "returnFocus") {
          const element = returnFocus.current as HTMLElement | null;

          if (element?.focus && document.contains(element)) element.focus();
        }

        if (target === "edit") {
          const ref = {
            name: refs.first,
            email: refs.email,
            mobile: refs.mobile,
          }[current.edit ?? "name"];

          ref?.current?.focus();
        }

        if (target === "code") refs.code[0]?.current?.focus();

        if (target === "password")
          (current.password.has ? refs.current : refs.next).current?.focus();

        if (target === "address") refs.addressLabel.current?.focus();
      }, 40);
    },
    [focusDialog, refs],
  );

  const showToast = useCallback(
    (toast: string) => {
      window.clearTimeout(toastTimer.current);
      // clear first so screen readers announce a repeated message
      setState({ toast: "" }, () => setState({ toast }));

      toastTimer.current = window.setTimeout(
        () => setState({ toast: "" }),
        TOAST_MS,
      );
    },
    [setState],
  );

  const startResendCountdown = useCallback(() => {
    window.clearInterval(resendTimer.current);

    resendTimer.current = window.setInterval(
      () =>
        setState((current) => {
          if (current.resendIn <= 1) window.clearInterval(resendTimer.current);

          return { resendIn: Math.max(0, current.resendIn - 1) };
        }),
      1000,
    );
  }, [setState]);

  const stopResendCountdown = () => window.clearInterval(resendTimer.current);

  /** Switch section: replace the URL on wide screens, push it (and scroll up) on narrow ones. */
  const goToSection = useCallback(
    (id: string | null) => {
      if (id && !SECTION_IDS.includes(id)) return;

      const { sectionId: previous, wide } = stateRef.current;

      setState(
        {
          sectionId: id,
          menuOpen: false,
          edit: null,
          allergyEdit: -1,
          addressForm: null,
        },
        () => focusLater(id ? "title" : `row:${previous}`),
      );

      const params = new URLSearchParams(window.location.search);

      params.delete("tab");

      if (id) params.set("section", id);
      else params.delete("section");

      const search = params.toString();

      navigate(
        { search: search ? `?${search}` : "" },
        { replace: wide, preventScrollReset: wide },
      );

      if (!wide) window.scrollTo(0, 0);
    },
    [focusLater, navigate, setState],
  );

  useEffect(() => {
    const handleTab = (event: Event) =>
      goToSection((event as CustomEvent<string>).detail);

    const handlePop = () => setState({ sectionId: readSection() });

    const handleResize = () => {
      const wide = window.innerWidth >= WIDE_PX;

      if (wide !== stateRef.current.wide) setState({ wide });
    };

    window.addEventListener(ACCOUNT_TAB_EVENT, handleTab);
    window.addEventListener("popstate", handlePop);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(ACCOUNT_TAB_EVENT, handleTab);
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("resize", handleResize);
    };
  }, [goToSection, setState]);

  const closeDialog = useCallback(
    () =>
      setState({ dialog: null, deleteText: "", cardFormErrors: {} }, () =>
        focusLater("returnFocus"),
      ),
    [focusLater, setState],
  );

  // Escape closes the dialog (Tab stays inside it), then the address menu, then the mobile menu
  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      const current = stateRef.current;

      if (current.dialog) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeDialog();

          return;
        }

        if (event.key === "Tab") {
          const dialog = refs.dialog.current;

          if (!dialog) return;

          const elements = focusables(dialog);
          const first = elements[0];
          const last = elements[elements.length - 1];

          if (!first || !last) return;

          if (!dialog.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }

        return;
      }

      if (event.key === "Escape" && current.addressMenu) {
        setState({ addressMenu: null });

        return;
      }

      if (event.key === "Escape" && current.menuOpen)
        setState({ menuOpen: false });
    };

    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, [closeDialog, refs, setState]);

  // fixtures that start mid-flow: run the resend countdown, focus an open dialog
  useEffect(() => {
    const { resendIn, dialog } = stateRef.current;

    if (resendIn > 0) startResendCountdown();

    if (dialog) focusLater("dialog");

    return () => {
      window.clearTimeout(toastTimer.current);
      window.clearInterval(resendTimer.current);
    };
  }, [focusLater, startResendCountdown]);

  const openDialog = (dialog: DialogState) => {
    returnFocus.current = document.activeElement;
    setState({ dialog }, () => focusLater("dialog"));
  };

  const checkCode = () => {
    const current = stateRef.current;
    const code = current.code.join("");

    if (code.length < 6)
      return setState({ codeError: "Enter the 6-digit code" });

    if (code === EXPIRED_CODE)
      return setState({
        codeError: "That code has expired. Send a new one.",
        resendIn: 0,
      });

    if (code !== CORRECT_CODE)
      return setState(({ shake }) => ({
        codeError: "That code isn’t right",
        shake: shake + 1,
      }));

    const previous = current.profile.email;

    setState({
      profile: {
        ...current.profile,
        email: current.draft.email.trim().toLowerCase(),
      },
      pendingEmail: "",
      edit: null,
      emailStep: "",
      codeError: "",
    });

    stopResendCountdown();
    showToast(`Email updated. We’ve let ${previous} know.`);
  };

  const saveEdit = () => {
    const current = stateRef.current;
    const key = current.edit;

    if (!key) return;

    if (key === "email" && current.emailStep === "code") return checkCode();

    const errors = validateEdit(key, current.draft, current.profile.email);

    if (Object.keys(errors).length) return setState({ fieldErrors: errors });

    if (key === "email") {
      setState(
        {
          emailStep: "code",
          pendingEmail: current.draft.email.trim().toLowerCase(),
          code: EMPTY_CODE,
          codeError: "",
          resendIn: 30,
          fieldErrors: {},
        },
        () => focusLater("code"),
      );

      startResendCountdown();

      return;
    }

    const profile = { ...current.profile };

    if (key === "name") {
      profile.first = current.draft.first.trim();
      profile.last = current.draft.last.trim();
    }

    if (key === "mobile") {
      const digits = current.draft.mobile.replace(/\D/g, "").replace(/^0/, "");

      profile.mobile = `${digits.slice(0, 4)} ${digits.slice(4)}`;
    }

    setState({ profile, edit: null, fieldErrors: {} });
    showToast("Your details are updated");
  };

  const fillCode = (digits: string) => {
    const code = digits.slice(0, 6).split("");

    while (code.length < 6) code.push("");

    setState({ code, codeError: "" }, () => {
      refs.code[Math.min(digits.length, 5)]?.current?.focus();

      if (digits.length >= 6) checkCode();
    });
  };

  const setCode = (index: number, value: string) => {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length > 1) return fillCode(digits);

    setState(
      ({ code }) => {
        const next = code.slice();

        next[index] = digits;

        return { code: next, codeError: "" };
      },
      () => {
        if (digits && index < 5) refs.code[index + 1]?.current?.focus();

        if (
          digits &&
          index === 5 &&
          stateRef.current.code.join("").length === 6
        )
          checkCode();
      },
    );
  };

  const savePassword = () => {
    const { password, profile } = stateRef.current;

    const check = checkPassword(password.next, {
      min: getPasswordMin("client"),
      first: profile.first,
      last: profile.last,
      email: profile.email,
    });

    const wrongCurrentError = password.current
      ? "That password isn’t right"
      : "Enter your current password";

    const currentError =
      password.has && password.current !== CURRENT_PASSWORD
        ? wrongCurrentError
        : "";

    if (currentError || !check.valid) {
      setState({ password: { ...password, tried: true, currentError } }, () =>
        (currentError ? refs.current : refs.next).current?.focus(),
      );

      return;
    }

    const hadPassword = password.has;

    setState({
      password: {
        has: true,
        open: false,
        current: "",
        next: "",
        show: false,
        tried: false,
        blur: false,
        currentError: "",
        changed: true,
      },
    });

    showToast(
      hadPassword ? "Your password is updated" : "Your password is set",
    );
  };

  const saveCard = () => {
    const { cardForm, cards } = stateRef.current;
    const errors = getCardErrors(cardForm);

    if (Object.keys(errors).length) return setState({ cardFormErrors: errors });

    const number = cardForm.number.replace(/\D/g, "");
    const expiry = cardForm.expiry.replace(/\D/g, "");
    const brand = CARD_BRANDS[number.charAt(0)] ?? "Card";
    const isDefault = !cards.length || cardForm.isDefault;

    const card: SavedCard = {
      id: `c${Date.now()}`,
      brand,
      last4: number.slice(-4),
      expiry: `${expiry.slice(0, 2)}/${expiry.slice(2, 4)}`,
      isDefault,
    };

    setState(
      (current) => ({
        cards: [
          ...current.cards.map((item) =>
            isDefault ? { ...item, isDefault: false } : item,
          ),
          card,
        ],
        dialog: null,
        cardForm: { number: "", expiry: "", cvc: "", isDefault: false },
        cardFormErrors: {},
      }),
      () => focusLater("returnFocus"),
    );

    showToast("Card saved");
  };

  const setAddresses = (list: SavedAddress[]) => {
    saveAddresses(list);
    setState({ addresses: list });
  };

  const saveAddress = () => {
    const { addressForm, addresses } = stateRef.current;

    if (!addressForm) return;

    const address = addressForm.address;

    if (!address || !isAddressValid(address))
      return setState({ addressForm: { ...addressForm, tried: true } });

    const clean = {
      line1: address.line1 ?? "",
      line2: address.line2 || "",
      town: address.town ?? "",
      postcode: formatPostcode(address.postcode),
    };

    const label = addressForm.label.trim() || "Address";
    let list = addresses.slice();
    const isDefault = !list.length || addressForm.isDefault;

    if (addressForm.mode === "edit")
      list = list.map((item) =>
        item.id === addressForm.id
          ? { ...item, ...clean, label, isDefault: isDefault || item.isDefault }
          : item,
      );
    else list.push({ id: `a${Date.now()}`, label, ...clean, isDefault });

    if (isDefault) {
      const id =
        addressForm.mode === "edit"
          ? addressForm.id
          : list[list.length - 1]?.id;

      list = list.map((item) => ({ ...item, isDefault: item.id === id }));
    }

    setAddresses(list);
    setState({ addressForm: null });
    showToast("Address saved");
  };

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!/^image\/(jpeg|png)$/.test(file.type))
      return setState({ photoError: "Choose a JPG, JPEG or PNG photo." });

    if (file.size > 10 * 1024 * 1024)
      return setState({
        photoError: "That photo is too big. Choose one under 10MB.",
      });

    const reader = new FileReader();

    reader.onload = () => {
      setState({ photo: String(reader.result), photoError: "" });
      showToast("Your photo is updated");
    };

    reader.readAsDataURL(file);
  };

  const copy = (text: string, message: string) => {
    const done = () => showToast(message);

    try {
      navigator.clipboard.writeText(text).then(done, done);
    } catch {
      done();
    }
  };

  /** Ends the session without leaving the page (log out everywhere, delete account). */
  const endSession = () => dispatch(logOut());

  const logout = () => {
    endSession();
    navigate("/");
  };

  return {
    state,
    refs,
    loggedIn: sessionLoggedIn && !state.loggedOut && !state.deleted,
    actions: {
      setState,
      goToSection,
      openDialog,
      closeDialog,
      focusLater,
      showToast,
      startResendCountdown,
      stopResendCountdown,
      saveEdit,
      checkCode,
      setCode,
      fillCode,
      pasteCode: (event: ClipboardEvent) => {
        const digits = (event.clipboardData.getData("text") || "").replace(
          /\D/g,
          "",
        );

        if (!digits) return;

        event.preventDefault();
        fillCode(digits);
      },
      codeKey: (index: number, event: KeyboardEvent) => {
        const { code } = stateRef.current;

        if (event.key === "Backspace" && !code[index] && index > 0) {
          event.preventDefault();
          refs.code[index - 1]?.current?.focus();
        }

        if (event.key === "Enter") checkCode();
      },
      savePassword,
      saveCard,
      saveAddress,
      setAddresses,
      onPhoto,
      copy,
      endSession,
      logout,
    },
  };
};

export type AccountController = ReturnType<typeof useAccount>;
