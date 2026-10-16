import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ACCOUNT_TAB_EVENT } from "../../components/site-menu/site-menu";
import { useIdentity } from "../../hooks/use-identity";
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { logOut } from "../../stores/session-slice";
import type { SavedAddress } from "../../types/address";
import { formatPostcode } from "../../utils/address";
import { getSearchParams } from "../../utils/page-flags";
import { getSavedAddresses, saveAddresses } from "../../utils/saved-addresses";
import { applyFixture } from "./fixtures";
import type { FixtureForms } from "./fixtures";
import { EMPTY_CARD, EMPTY_PASSWORD, useAccountForms } from "./forms";
import type { AddressFormValues, CardFormValues } from "./schemas";
import { getDiscardPatch, hasUnsavedEdits } from "./unsaved";
import {
  DEMO_PHOTO,
  getSeedBookings,
  LEGACY_TABS,
  SEED_PROFILE,
  SECTION_IDS,
  SEED_CARDS,
  SHARED_ENTRIES,
} from "./data";
import type { AccountBooking, Profile, SavedCard } from "./data";
import type { EditKey } from "./logic";

type DialogState =
  | { kind: "receipt"; id: string }
  | { kind: "discard"; then: () => void; keep?: () => void }
  | { kind: "allergy"; index: number }
  | { kind: "card"; id: string }
  | { kind: "address"; id: string }
  | { kind: "addCard" | "logoutAll" | "sync" | "cookies" | "delete" };

export interface AddressForm {
  mode: "add" | "edit";
  id?: string;
}

export interface PasswordState {
  has: boolean;
  open: boolean;
  show: boolean;
  changed?: boolean;
}

export interface AccountState {
  fixture: string;
  sectionId: string | null;
  wide: boolean;
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
const TOAST_MS = 3200;
const WIDE_PX = 960;

// Card brand by the number's first digit
const CARD_BRANDS: Record<string, string> = {
  "4": "Visa",
  "5": "Mastercard",
  "3": "Amex",
};

/** ?section= (or legacy ?tab=), else the prop; only real sections. */
const readSection = (
  params: URLSearchParams,
  propSection?: string,
): string | null => {
  let section = params.get("section") || params.get("tab") || propSection || "";

  section = LEGACY_TABS[section] || section;

  return SECTION_IDS.includes(section) ? section : null;
};

const EMPTY_PROFILE = { first: "", last: "", email: "", mobile: "" };

/** Demo data only on dev boards; a real account starts empty and fills in from the profile. */
const isDemoAccount = (params: URLSearchParams, fixture: string) =>
  import.meta.env.DEV && (!!fixture || params.get("board") === "true");

const getInitialState = (
  {
    section,
    fixture: propFixture,
    hairQuiz = true,
    photo = false,
    marketing = false,
  }: AccountProps,
  params: URLSearchParams,
): { state: AccountState; fixtureForms: FixtureForms } => {
  const fixture = params.get("fixture") || propFixture || "";
  const isDemo = isDemoAccount(params, fixture);

  const flag = (key: string, fallback: boolean) =>
    params.has(key) ? params.get(key) === "1" : fallback;

  const state: AccountState = {
    fixture,
    sectionId: readSection(params, section),
    wide: window.innerWidth >= WIDE_PX,
    dialog: null,
    toast: "",
    bookings: isDemo ? getSeedBookings(fixture) : [],
    entries: isDemo ? SHARED_ENTRIES.map((entry) => ({ ...entry })) : [],
    allergyEdit: -1,
    allergyDraft: "",
    profile: isDemo ? SEED_PROFILE : EMPTY_PROFILE,
    photo: isDemo && flag("photo", photo) ? DEMO_PHOTO : null,
    photoError: "",
    quiz: isDemo && flag("quiz", hairQuiz),
    edit: null,
    emailStep: "",
    code: EMPTY_CODE,
    codeError: "",
    shake: 0,
    resendIn: 0,
    password: { has: true, open: false, show: false },
    googleConnected: isDemo,
    appleConnected: false,
    cards: isDemo ? SEED_CARDS.map((card) => ({ ...card })) : [],
    addresses: getSavedAddresses(params.toString()),
    addressForm: null,
    marketing: flag("mkt", marketing),
    sync: "k7f2m9qx",
    cookies: { analytics: false, marketing: false },
    cookiesDraft: { analytics: false, marketing: false },
    deleteText: "",
    loggedOut: false,
    deleted: false,
  };

  // demo states are dev-only; production builds drop this branch and the fixtures module
  const fixtureForms =
    import.meta.env.DEV && fixture ? applyFixture(state, fixture) : {};

  const fromUrl = readSection(params, section);

  if (fromUrl) state.sectionId = fromUrl;

  return { state, fixtureForms };
};

export const useAccount = (props: AccountProps) => {
  const [searchParams] = useSearchParams();

  // read once: later URL changes move between sections via goToSection / popstate, not a re-initialise
  const [initial] = useState(() => getInitialState(props, searchParams));
  const [state, setRawState] = useState(initial.state);
  const stateRef = useRef(state);

  stateRef.current = state;

  const forms = useAccountForms(
    initial.fixtureForms.draft ?? { ...initial.state.profile },
    () => ({
      edit: stateRef.current.edit,
      profile: stateRef.current.profile,
      hasPassword: stateRef.current.password.has,
    }),
  );

  const afterCommit = useRef<(() => void)[]>([]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const sessionLoggedIn = useAppSelector((root) => root.session.loggedIn);

  const refs = useMemo(
    () => ({
      dialog: createRef<HTMLDivElement>(),
      deleteConfirm: createRef<HTMLInputElement>(),
      file: createRef<HTMLInputElement>(),
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

  useEffect(() => {
    const { draftError, password, address } = initial.fixtureForms;

    if (draftError)
      forms.edit.setError(draftError.field, { message: draftError.message });

    if (password) forms.password.reset(password);

    if (address) forms.address.reset(address);
  }, [initial, forms]);

  const identity = useIdentity();

  const signedIn =
    identity?.isLoaded && !isDemoAccount(searchParams, state.fixture)
      ? identity
      : null;

  // a real account shows the signed-in person's details and sign-in methods
  useEffect(() => {
    if (!signedIn) return;

    const { first, last, email, mobile, marketing, user } = signedIn;
    const profile = { first, last, email, mobile };

    forms.edit.reset({ ...profile }, { keepDirtyValues: true });

    setState(({ password }) => ({
      profile,
      marketing,
      password: { ...password, has: user.providers.includes("email") },
      googleConnected: user.providers.includes("google"),
    }));
    // once per signed-in account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn?.user.id, setState]);

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

        if (target === "edit")
          forms.edit.setFocus(
            ({ name: "first", email: "email", mobile: "mobile" } as const)[
              current.edit ?? "name"
            ],
          );

        if (target === "code") refs.code[0]?.current?.focus();

        if (target === "password")
          forms.password.setFocus(current.password.has ? "current" : "next");

        if (target === "address") forms.address.setFocus("label");
      }, 40);
    },
    [focusDialog, refs, forms],
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
  const showSection = useCallback(
    (id: string | null) => {
      if (id && !SECTION_IDS.includes(id)) return;

      const { sectionId: previous, wide } = stateRef.current;

      setState(
        {
          sectionId: id,
          edit: null,
          allergyEdit: -1,
          addressForm: null,
        },
        () => focusLater(id ? "title" : `row:${previous}`),
      );

      const params = new URLSearchParams(searchParams);

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
    [focusLater, navigate, searchParams, setState],
  );

  /** "Discard changes?": Discard closes the edit forms, then carries on. */
  const askDiscard = useCallback(
    (proceed: () => void, keep?: () => void) => {
      returnFocus.current = document.activeElement;

      setState({
        dialog: {
          kind: "discard",
          then: () => {
            forms.edit.clearErrors();
            forms.password.reset(EMPTY_PASSWORD);
            setState({ ...getDiscardPatch(stateRef.current), dialog: null });
            proceed();
          },
          keep,
        },
      });
    },
    [setState, forms],
  );

  const getFormValues = useCallback(
    () => ({
      draft: forms.edit.getValues(),
      password: forms.password.getValues(),
      address: forms.address.getValues(),
    }),
    [forms],
  );

  // an open edit with changes asks before it's dropped
  const goToSection = useCallback(
    (id: string | null) => {
      if (!hasUnsavedEdits(stateRef.current, getFormValues()))
        return showSection(id);

      askDiscard(() => showSection(id));
    },
    [askDiscard, showSection, getFormValues],
  );

  useEffect(() => {
    const handleTab = (event: Event) =>
      goToSection((event as CustomEvent<string>).detail);

    // popstate fires before the router has re-rendered with the new location, so the window URL is the current one here
    const handlePop = () =>
      setState({ sectionId: readSection(getSearchParams()) });

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

  const closeDialog = useCallback(() => {
    const { dialog } = stateRef.current;

    if (dialog?.kind === "discard") dialog.keep?.();

    forms.card.clearErrors();

    setState({ dialog: null, deleteText: "" }, () => focusLater("returnFocus"));
  }, [focusLater, setState, forms]);

  const hasUnsaved = useCallback(
    () => hasUnsavedEdits(stateRef.current, getFormValues()),
    [getFormValues],
  );

  const blocker = useUnsavedChanges(hasUnsaved);

  // leaving the page (links, back) with unsaved edits
  useEffect(() => {
    if (blocker.state !== "blocked" || stateRef.current.dialog) return;

    askDiscard(blocker.proceed, blocker.reset);
  }, [askDiscard, blocker]);

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

      if (event.key === "Escape" && current.addressMenu)
        setState({ addressMenu: null });
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
        email: forms.edit.getValues("email").trim().toLowerCase(),
      },
      pendingEmail: "",
      edit: null,
      emailStep: "",
      codeError: "",
    });

    stopResendCountdown();
    showToast(`Email updated. We’ve let ${previous} know.`);
  };

  const applyEdit = (key: EditKey, draft: Profile) => {
    if (key === "email") {
      setState(
        {
          emailStep: "code",
          pendingEmail: draft.email.trim().toLowerCase(),
          code: EMPTY_CODE,
          codeError: "",
          resendIn: 30,
        },
        () => focusLater("code"),
      );

      startResendCountdown();

      return;
    }

    const profile = { ...stateRef.current.profile };

    if (key === "name") {
      profile.first = draft.first.trim();
      profile.last = draft.last.trim();
    }

    if (key === "mobile") {
      const digits = draft.mobile.replace(/\D/g, "").replace(/^0/, "");

      profile.mobile = `${digits.slice(0, 4)} ${digits.slice(4)}`;
    }

    setState({ profile, edit: null });
    showToast("Your details are updated");
  };

  const saveEdit = () => {
    const { edit: key, emailStep } = stateRef.current;

    if (!key) return;

    if (key === "email" && emailStep === "code") return checkCode();

    void forms.edit.handleSubmit(() =>
      applyEdit(key, forms.edit.getValues()),
    )();
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

  const savePassword = forms.password.handleSubmit(() => {
    const hadPassword = stateRef.current.password.has;

    forms.password.reset(EMPTY_PASSWORD);

    setState({
      password: { has: true, open: false, show: false, changed: true },
    });

    showToast(
      hadPassword ? "Your password is updated" : "Your password is set",
    );
  });

  const saveCard = forms.card.handleSubmit((cardForm: CardFormValues) => {
    const { cards } = stateRef.current;
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

    forms.card.reset(EMPTY_CARD);

    setState(
      (current) => ({
        cards: [
          ...current.cards.map((item) =>
            isDefault ? { ...item, isDefault: false } : item,
          ),
          card,
        ],
        dialog: null,
      }),
      () => focusLater("returnFocus"),
    );

    showToast("Card saved");
  });

  const setAddresses = (list: SavedAddress[]) => {
    saveAddresses(list, searchParams.toString());
    setState({ addresses: list });
  };

  const saveAddress = forms.address.handleSubmit((form: AddressFormValues) => {
    const { addressForm, addresses } = stateRef.current;

    if (!addressForm || !form.address) return;

    const { address } = form;

    const clean = {
      line1: address.line1 ?? "",
      line2: address.line2 || "",
      town: address.town ?? "",
      postcode: formatPostcode(address.postcode),
    };

    const label = form.label.trim() || "Address";
    let list = addresses.slice();
    const isDefault = !list.length || form.isDefault;

    if (addressForm.mode === "edit")
      list = list.map((item) =>
        item.id === addressForm.id
          ? {
              ...item,
              ...clean,
              label,
              isDefault: isDefault || item.isDefault,
            }
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
  });

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
    forms,
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
