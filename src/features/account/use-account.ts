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
  ME,
  SECTION_IDS,
  SEED_CARDS,
  SHARED_ENTRIES,
} from "./account-data";
import type { AccountBooking, Profile, SavedCard } from "./account-data";
import { getCardErrors, validateEdit } from "./account-logic";
import type { EditKey } from "./account-logic";

export type DialogState =
  | { k: "receipt"; id: string }
  | { k: "alg"; i: number }
  | { k: "card"; id: string }
  | { k: "addr"; id: string }
  | { k: "addCard" | "logoutAll" | "sync" | "cookies" | "delete" };

export interface AddressForm {
  mode: "add" | "edit";
  id?: string;
  label: string;
  addr: (AddressValue & { source?: string }) | null;
  def: boolean;
  tried: boolean;
}

export interface PasswordState {
  has: boolean;
  open: boolean;
  cur: string;
  next: string;
  show: boolean;
  tried: boolean;
  blur: boolean;
  curErr: string;
  changed?: boolean;
}

export interface AccountState {
  fx: string;
  sec: string | null;
  wide: boolean;
  menuOpen: boolean;
  dlg: DialogState | null;
  toast: string;
  bookings: AccountBooking[];
  bkTab?: "up" | "past";
  entries: { id: string; text: string }[];
  algEdit: number;
  algDraft: string;
  me: Profile;
  photo: string | null;
  photoErr: string;
  quiz: boolean;
  edit: EditKey | null;
  draft: Profile;
  err: Record<string, string>;
  emailStep: "" | "code";
  pendingEmail?: string;
  code: string[];
  codeErr: string;
  shake: number;
  resendIn: number;
  pw: PasswordState;
  gg: boolean;
  ap: boolean;
  cards: SavedCard[];
  cf: { num: string; exp: string; cvc: string; def: boolean };
  cfErr: Record<string, string>;
  addrs: SavedAddress[];
  addrForm: AddressForm | null;
  addrMenu?: string | null;
  mkt: boolean;
  sync: string;
  cookies: { an: boolean; mk: boolean };
  ckDraft: { an: boolean; mk: boolean };
  delText: string;
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
    fx: fixture,
    sec: readSection(section),
    wide: window.innerWidth >= WIDE_PX,
    menuOpen: false,
    dlg: null,
    toast: "",
    bookings: getSeedBookings(fixture),
    entries: SHARED_ENTRIES.map((entry) => ({ ...entry })),
    algEdit: -1,
    algDraft: "",
    me: ME,
    photo: flag("photo", photo) ? DEMO_PHOTO : null,
    photoErr: "",
    quiz: flag("quiz", hairQuiz),
    edit: null,
    draft: { ...ME },
    err: {},
    emailStep: "",
    code: EMPTY_CODE,
    codeErr: "",
    shake: 0,
    resendIn: 0,
    pw: {
      has: true,
      open: false,
      cur: "",
      next: "",
      show: false,
      tried: false,
      blur: false,
      curErr: "",
    },
    gg: true,
    ap: false,
    cards: SEED_CARDS.map((card) => ({ ...card })),
    cf: { num: "", exp: "", cvc: "", def: false },
    cfErr: {},
    addrs: getSavedAddresses(),
    addrForm: null,
    mkt: flag("mkt", marketing),
    sync: "k7f2m9qx",
    cookies: { an: false, mk: false },
    ckDraft: { an: false, mk: false },
    delText: "",
    loggedOut: false,
    deleted: false,
  };
  const pwOpen = {
    ...state.pw,
    open: true,
    cur: CURRENT_PASSWORD,
    next: "braids in the sun on sunday",
  };
  const pendingDraft = { ...ME, email: "nia.okafor@outlook.com" };
  const fixtures: Record<string, Partial<AccountState>> = {
    "ov-empty": { sec: "overview" },
    "bk-empty": { sec: "bookings" },
    "bk-past": { sec: "bookings", bkTab: "past" },
    "bk-none": { sec: "bookings" },
    receipt: { sec: "bookings", dlg: { k: "receipt", id: "TH-47702" } },
    "quiz-none": { sec: "hair", quiz: false },
    "alg-edit": { sec: "shared", algEdit: 0, algDraft: "Sensitive scalp" },
    "profile-full": {
      sec: "personal",
      photo: DEMO_PHOTO,
    },
    "photo-error": {
      sec: "personal",
      photoErr: "That photo is too big. Choose one under 10MB.",
    },
    "personal-edit": { sec: "personal", edit: "name" },
    "email-edit": {
      sec: "personal",
      edit: "email",
      draft: { ...ME, email: "" },
    },
    "email-invalid": {
      sec: "personal",
      edit: "email",
      draft: { ...ME, email: "nia.okafor@gmail" },
      err: { email: "Enter an email address like name@example.com" },
    },
    "email-same": {
      sec: "personal",
      edit: "email",
      draft: { ...ME, email: "nia.okafor@gmail.com" },
      err: { email: "That’s already your email" },
    },
    "email-taken": {
      sec: "personal",
      edit: "email",
      draft: { ...ME, email: "kemi.a@icloud.com" },
      err: { email: "This email is already used by another account" },
    },
    "email-wrong": {
      sec: "personal",
      edit: "email",
      emailStep: "code",
      pendingEmail: "nia.okafor@outlook.com",
      resendIn: 18,
      code: ["1", "1", "1", "1", "1", "1"],
      codeErr: "That code isn’t right",
      draft: pendingDraft,
    },
    "email-expired": {
      sec: "personal",
      edit: "email",
      emailStep: "code",
      pendingEmail: "nia.okafor@outlook.com",
      resendIn: 0,
      code: ["0", "0", "0", "0", "0", "0"],
      codeErr: "That code has expired. Send a new one.",
      draft: pendingDraft,
    },
    "email-pending": {
      sec: "personal",
      pendingEmail: "nia.okafor@outlook.com",
    },
    "email-done": {
      sec: "personal",
      me: { ...ME, email: "nia.okafor@outlook.com" },
      toast: "Email updated. We’ve let nia.okafor@gmail.com know.",
    },
    "email-code": {
      sec: "personal",
      edit: "email",
      emailStep: "code",
      pendingEmail: "nia.okafor@outlook.com",
      resendIn: 24,
      draft: pendingDraft,
    },
    "pw-open": { sec: "security", pw: pwOpen },
    nopw: { sec: "security", pw: { ...state.pw, has: false } },
    "logout-all": { sec: "security", dlg: { k: "logoutAll" } },
    "cards-empty": { sec: "payments", cards: [] },
    "card-remove": { sec: "payments", dlg: { k: "card", id: "c2" } },
    "add-card": { sec: "payments", dlg: { k: "addCard" } },
    "addr-empty": { sec: "addresses", addrs: [] },
    "addr-add": {
      sec: "addresses",
      addrForm: {
        mode: "add",
        label: "Mum’s",
        addr: null,
        def: false,
        tried: false,
      },
    },
    "addr-edit": { sec: "addresses" },
    "addr-remove": { sec: "addresses" },
    "mkt-on": { sec: "communication", mkt: true },
    "sync-reset": { sec: "communication", dlg: { k: "sync" } },
    cookies: { sec: "privacy", dlg: { k: "cookies" } },
    "delete-blocked": { sec: "privacy", dlg: { k: "delete" } },
    "delete-allowed": { sec: "privacy", dlg: { k: "delete" } },
    deleted: { deleted: true },
  };
  Object.assign(state, fixtures[fixture] ?? {});
  const [first, second] = state.addrs;
  if (fixture === "addr-edit" && first)
    state.addrForm = {
      mode: "edit",
      id: first.id,
      label: first.label,
      addr: {
        line1: first.line1,
        line2: first.line2,
        town: first.town,
        postcode: first.postcode,
        source: "manual",
      },
      def: first.def,
      tried: false,
    };
  if (fixture === "addr-remove" && second)
    state.dlg = { k: "addr", id: second.id };
  const fromUrl = readSection(section);
  if (fromUrl) state.sec = fromUrl;
  return state;
};

/** Account state and actions (prototype Account.dc.html class Component). */
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
      mob: createRef<HTMLInputElement>(),
      current: createRef<HTMLInputElement>(),
      next: createRef<HTMLInputElement>(),
      del: createRef<HTMLInputElement>(),
      file: createRef<HTMLInputElement>(),
      addrLabel: createRef<HTMLInputElement>(),
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

  /** Focus after the render settles (prototype fx()). */
  const focusLater = useCallback(
    (target: string) => {
      window.setTimeout(() => {
        const current = stateRef.current;
        if (target === "title")
          document.getElementById("ac-title")?.focus({ preventScroll: true });
        if (target.startsWith("row:"))
          document.getElementById("ac-row-" + target.slice(4))?.focus();
        if (target === "dlg") focusDialog();
        if (target === "undlg") {
          const element = returnFocus.current as HTMLElement | null;
          if (element?.focus && document.contains(element)) element.focus();
        }
        if (target === "edit") {
          const ref = {
            name: refs.first,
            email: refs.email,
            mob: refs.mob,
          }[current.edit ?? "name"];
          ref?.current?.focus();
        }
        if (target === "code") refs.code[0]?.current?.focus();
        if (target === "pw")
          (current.pw.has ? refs.current : refs.next).current?.focus();
        if (target === "addr") refs.addrLabel.current?.focus();
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
  const go = useCallback(
    (id: string | null) => {
      if (id && !SECTION_IDS.includes(id)) return;
      const { sec: previous, wide } = stateRef.current;
      setState(
        { sec: id, menuOpen: false, edit: null, algEdit: -1, addrForm: null },
        () => focusLater(id ? "title" : "row:" + previous),
      );
      const params = new URLSearchParams(window.location.search);
      params.delete("tab");
      if (id) params.set("section", id);
      else params.delete("section");
      const search = params.toString();
      navigate(
        { search: search ? "?" + search : "" },
        { replace: wide, preventScrollReset: wide },
      );
      if (!wide) window.scrollTo(0, 0);
    },
    [focusLater, navigate, setState],
  );

  useEffect(() => {
    const handleTab = (event: Event) =>
      go((event as CustomEvent<string>).detail);
    const handlePop = () => setState({ sec: readSection() });
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
  }, [go, setState]);

  const closeDialog = useCallback(
    () =>
      setState({ dlg: null, delText: "", cfErr: {} }, () =>
        focusLater("undlg"),
      ),
    [focusLater, setState],
  );

  // Escape closes the dialog (Tab stays inside it), then the address menu, then the mobile menu
  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      const current = stateRef.current;
      if (current.dlg) {
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
      if (event.key === "Escape" && current.addrMenu) {
        setState({ addrMenu: null });
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
    const { resendIn, dlg } = stateRef.current;
    if (resendIn > 0) startResendCountdown();
    if (dlg) focusLater("dlg");
    return () => {
      window.clearTimeout(toastTimer.current);
      window.clearInterval(resendTimer.current);
    };
  }, [focusLater, startResendCountdown]);

  const openDialog = (dlg: DialogState) => {
    returnFocus.current = document.activeElement;
    setState({ dlg }, () => focusLater("dlg"));
  };

  const checkCode = () => {
    const current = stateRef.current;
    const code = current.code.join("");
    if (code.length < 6) return setState({ codeErr: "Enter the 6-digit code" });
    if (code === EXPIRED_CODE)
      return setState({
        codeErr: "That code has expired. Send a new one.",
        resendIn: 0,
      });
    if (code !== CORRECT_CODE)
      return setState(({ shake }) => ({
        codeErr: "That code isn’t right",
        shake: shake + 1,
      }));
    const previous = current.me.email;
    setState({
      me: { ...current.me, email: current.draft.email.trim().toLowerCase() },
      pendingEmail: "",
      edit: null,
      emailStep: "",
      codeErr: "",
    });
    stopResendCountdown();
    showToast("Email updated. We’ve let " + previous + " know.");
  };

  const saveEdit = () => {
    const current = stateRef.current;
    const key = current.edit;
    if (!key) return;
    if (key === "email" && current.emailStep === "code") return checkCode();
    const errors = validateEdit(key, current.draft, current.me.email);
    if (Object.keys(errors).length) return setState({ err: errors });
    if (key === "email") {
      setState(
        {
          emailStep: "code",
          pendingEmail: current.draft.email.trim().toLowerCase(),
          code: EMPTY_CODE,
          codeErr: "",
          resendIn: 30,
          err: {},
        },
        () => focusLater("code"),
      );
      startResendCountdown();
      return;
    }
    const me = { ...current.me };
    if (key === "name") {
      me.first = current.draft.first.trim();
      me.last = current.draft.last.trim();
    }
    if (key === "mob") {
      const digits = current.draft.mob.replace(/\D/g, "").replace(/^0/, "");
      me.mob = digits.slice(0, 4) + " " + digits.slice(4);
    }
    setState({ me, edit: null, err: {} });
    showToast("Your details are updated");
  };

  const fillCode = (digits: string) => {
    const code = digits.slice(0, 6).split("");
    while (code.length < 6) code.push("");
    setState({ code, codeErr: "" }, () => {
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
        return { code: next, codeErr: "" };
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
    const { pw, me } = stateRef.current;
    const check = checkPassword(pw.next, {
      min: getPasswordMin("client"),
      first: me.first,
      last: me.last,
      email: me.email,
    });
    const curErr =
      pw.has && pw.cur !== CURRENT_PASSWORD
        ? pw.cur
          ? "That password isn’t right"
          : "Enter your current password"
        : "";
    if (curErr || !check.ok) {
      setState({ pw: { ...pw, tried: true, curErr } }, () =>
        (curErr ? refs.current : refs.next).current?.focus(),
      );
      return;
    }
    const hadPassword = pw.has;
    setState({
      pw: {
        has: true,
        open: false,
        cur: "",
        next: "",
        show: false,
        tried: false,
        blur: false,
        curErr: "",
        changed: true,
      },
    });
    showToast(
      hadPassword ? "Your password is updated" : "Your password is set",
    );
  };

  const saveCard = () => {
    const { cf, cards } = stateRef.current;
    const errors = getCardErrors(cf);
    if (Object.keys(errors).length) return setState({ cfErr: errors });
    const number = cf.num.replace(/\D/g, "");
    const expiry = cf.exp.replace(/\D/g, "");
    const brand =
      number[0] === "4"
        ? "Visa"
        : number[0] === "5"
          ? "Mastercard"
          : number[0] === "3"
            ? "Amex"
            : "Card";
    const isDefault = !cards.length || cf.def;
    const card: SavedCard = {
      id: "c" + Date.now(),
      brand,
      last4: number.slice(-4),
      exp: expiry.slice(0, 2) + "/" + expiry.slice(2, 4),
      def: isDefault,
    };
    setState(
      (current) => ({
        cards: [
          ...current.cards.map((item) =>
            isDefault ? { ...item, def: false } : item,
          ),
          card,
        ],
        dlg: null,
        cf: { num: "", exp: "", cvc: "", def: false },
        cfErr: {},
      }),
      () => focusLater("undlg"),
    );
    showToast("Card saved");
  };

  const setAddresses = (list: SavedAddress[]) => {
    saveAddresses(list);
    setState({ addrs: list });
  };

  const saveAddress = () => {
    const { addrForm, addrs } = stateRef.current;
    if (!addrForm) return;
    const address = addrForm.addr;
    if (!address || !isAddressValid(address))
      return setState({ addrForm: { ...addrForm, tried: true } });
    const clean = {
      line1: address.line1 ?? "",
      line2: address.line2 || "",
      town: address.town ?? "",
      postcode: formatPostcode(address.postcode),
    };
    const label = addrForm.label.trim() || "Address";
    let list = addrs.slice();
    const isDefault = !list.length || addrForm.def;
    if (addrForm.mode === "edit")
      list = list.map((item) =>
        item.id === addrForm.id
          ? { ...item, ...clean, label, def: isDefault || item.def }
          : item,
      );
    else list.push({ id: "a" + Date.now(), label, ...clean, def: isDefault });
    if (isDefault) {
      const id =
        addrForm.mode === "edit" ? addrForm.id : list[list.length - 1]?.id;
      list = list.map((item) => ({ ...item, def: item.id === id }));
    }
    setAddresses(list);
    setState({ addrForm: null });
    showToast("Address saved");
  };

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type))
      return setState({ photoErr: "Choose a JPG, JPEG or PNG photo." });
    if (file.size > 10 * 1024 * 1024)
      return setState({
        photoErr: "That photo is too big. Choose one under 10MB.",
      });
    const reader = new FileReader();
    reader.onload = () => {
      setState({ photo: String(reader.result), photoErr: "" });
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
      go,
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
