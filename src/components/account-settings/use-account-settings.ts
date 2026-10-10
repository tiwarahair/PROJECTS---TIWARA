import { useCallback, useEffect, useRef, useState } from "react";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { checkPassword, getPasswordView } from "../../utils/password";
import type {
  TaxBusiness,
  TaxDetails,
} from "../tax-details-form/tax-details-logic";
import { getInitialSettingsState } from "./account-settings-logic";
import type {
  ConfirmDialog,
  PayoutStatus,
  SettingsPage,
  SettingsState,
  SignIn,
  TfaDevice,
} from "./account-settings-logic";

const TOAST_MS = 2400;
const SESSIONS_LOAD_MS = 700;
const PASSWORD_MIN = 8;

/** What the host (Studio) gets after every render to drive its own save button. */
export interface AccountSettingsApi {
  canSave: boolean;
  save: () => void;
}

export interface AccountSettingsProps {
  page?: SettingsPage;
  payoutStatus?: PayoutStatus;
  signIn?: SignIn;
  isNew?: boolean;
  upcoming?: number;
  /** Money owed on the account blocks closing it. */
  owed?: boolean;
  pauseReason?: string;
  embedded?: boolean;
  hideSave?: boolean;
  /** Account name, used by the password checker when the name fields are empty. */
  name?: string;
  legalName?: string;
  /** Host-managed two-step devices (Studio); otherwise the component keeps its own list. */
  tfaDevices?: TfaDevice[];
  tax?: Partial<TaxDetails> | null;
  taxEditing?: boolean;
  taxBusiness?: TaxBusiness | null;
  taxLegalName?: string;
  taxBusinessName?: string;
  onState?: (api: AccountSettingsApi) => void;
  onToast?: (text: string) => void;
  onNav?: (to: "business" | "earnings") => void;
  onConnectStripe?: () => void;
  onTfaRemove?: (name: string) => void;
  onTfaTurnOn?: () => void;
  onTfaAddBackup?: () => void;
  onTaxEdit?: () => void;
  onTaxAdd?: () => void;
  onTaxSave?: (details: TaxDetails) => void;
  onTaxCancel?: () => void;
  onTaxLearnMore?: () => void;
}

export type DialogPhase = "idle" | "open" | "closing";

/** AccountSettings state and actions (prototype class Component: init, toast, ask, maybeLoad, report, save). */
export const useAccountSettings = (props: AccountSettingsProps) => {
  const { page = "personal", signIn, isNew = false } = props;
  const [state, setRawState] = useState(() =>
    getInitialSettingsState(isNew, window.location.search),
  );
  const [dialog, setDialog] = useState<ConfirmDialog>({
    title: "",
    body: "",
    cta: "",
  });
  const [dialogPhase, setDialogPhase] = useState<DialogPhase>("idle");
  const dialogRun = useRef<(() => void) | null>(null);
  const dialogReturn = useRef<HTMLElement | null>(null);
  const toastTimer = useRef(0);
  const googleTimer = useRef(0);
  const hasLoaded = useRef(false);
  usePasswordChecker();

  const setState = (
    patch:
      | Partial<SettingsState>
      | ((current: SettingsState) => Partial<SettingsState>),
  ) =>
    setRawState((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));

  const toast = (text: string) => {
    if (props.onToast) return props.onToast(text);
    window.clearTimeout(toastTimer.current);
    setState({ toast: true, toastText: text });
    toastTimer.current = window.setTimeout(
      () => setState({ toast: false }),
      TOAST_MS,
    );
  };

  const ask = (next: ConfirmDialog, run: () => void) => {
    dialogRun.current = run;
    dialogReturn.current = document.activeElement as HTMLElement | null;
    setDialog(next);
    setDialogPhase("open");
  };
  const closeDialog = useCallback(() => {
    setDialogPhase("closing");
    dialogReturn.current?.focus?.();
  }, []);
  const confirmDialog = () => {
    const run = dialogRun.current;
    closeDialog();
    run?.();
  };

  // the sessions list "loads" once, the first time the security page shows
  useEffect(() => {
    if (page !== "security" || hasLoaded.current) return;
    hasLoaded.current = true;
    let isDone = false;
    setState({ sessLoading: true });
    const timer = window.setTimeout(() => {
      isDone = true;
      setState({ sessLoading: false });
    }, SESSIONS_LOAD_MS);
    return () => {
      window.clearTimeout(timer);
      // interrupted (a remount, or leaving the page early): load again next time
      if (isDone) return;
      hasLoaded.current = false;
      setState({ sessLoading: false });
    };
  }, [page]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(googleTimer.current);
    },
    [],
  );

  // ---- security: the password checker (min 8 for stylists' account settings)
  const isSocial = !!signIn && signIn !== "email";
  const showPasswordFields = !isSocial || state.setPw;
  const nameParts = String(props.name || props.legalName || "")
    .trim()
    .split(/\s+/);
  const passwordCheck = checkPassword(state.pw.nw, {
    min: PASSWORD_MIN,
    first: state.first || nameParts[0],
    last: state.last || nameParts.slice(1).join(" "),
    email: state.email,
  });
  const passwordView = getPasswordView(passwordCheck, {
    show: state.pwTouched || state.pwNwBlur,
    errColor: "var(--accent-700)",
  });
  const passwordErrors = {
    cur:
      state.pwTouched && !isSocial && !state.pw.cur
        ? "Enter your current password."
        : "",
    nw: passwordView.hasErr ? passwordCheck.error : "",
    conf:
      state.pwTouched && state.pw.conf !== state.pw.nw
        ? "Passwords don’t match."
        : "",
  };

  // ---- personal
  const getNameError = (key: "first" | "last") =>
    state.nameTouched && !state[key].trim()
      ? "Enter your " + (key === "first" ? "first" : "last") + " name."
      : "";
  const isNameDirty =
    state.first !== state.savedName[0] || state.last !== state.savedName[1];

  // ---- save bar (only pages with typed fields)
  const isPasswordDirty =
    showPasswordFields && !!(state.pw.cur || state.pw.nw || state.pw.conf);
  const isDirty =
    page === "personal"
      ? isNameDirty
      : page === "security"
        ? isPasswordDirty
        : false;
  const hasSave =
    page === "personal" || (page === "security" && showPasswordFields);
  const hasBarError =
    page === "personal"
      ? !!(getNameError("first") || getNameError("last"))
      : page === "security"
        ? !!(passwordErrors.cur || passwordErrors.nw || passwordErrors.conf)
        : false;

  const save = () => {
    if (page === "personal") {
      if (!state.first.trim() || !state.last.trim())
        return setState({ nameTouched: true });
      setState({
        savedName: [state.first.trim(), state.last.trim()],
        nameTouched: false,
      });
      toast("Personal details saved");
    }
    if (page === "security") {
      if (
        (!isSocial && !state.pw.cur) ||
        !passwordCheck.ok ||
        state.pw.conf !== state.pw.nw
      )
        return setState({ pwTouched: true });
      const others = state.signOthers
        ? state.sessions.filter(({ cur }) => !cur).length
        : 0;
      setState({
        pw: { cur: "", nw: "", conf: "" },
        pwTouched: false,
        pwNwBlur: false,
        setPw: false,
        sessions: state.signOthers
          ? state.sessions.filter(({ cur }) => cur)
          : state.sessions,
      });
      toast(
        isSocial
          ? "Password set"
          : others
            ? "Password updated. Signed out of " +
              others +
              " other device" +
              (others === 1 ? "" : "s")
            : "Password updated",
      );
    }
  };

  // report after every render, like the prototype's componentDidMount / componentDidUpdate
  useEffect(() => {
    props.onState?.({ canSave: isDirty && hasSave, save });
  });

  const connectGoogle = () => {
    setState(({ g }) => ({ g: { ...g, state: "connecting" } }));
    window.clearTimeout(googleTimer.current);
    googleTimer.current = window.setTimeout(() => {
      setState(({ g }) => ({ g: { ...g, state: "on" } }));
      toast("Google Calendar connected");
    }, 1200);
  };

  return {
    page,
    state,
    setState,
    toast,
    ask,
    dialog,
    dialogPhase,
    closeDialog,
    confirmDialog,
    isSocial,
    showPasswordFields,
    passwordView,
    passwordErrors,
    getNameError,
    isDirty,
    hasSave,
    hasBarError,
    save,
    connectGoogle,
  };
};

export type AccountSettingsController = ReturnType<typeof useAccountSettings>;
