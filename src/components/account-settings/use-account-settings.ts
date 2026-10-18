import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "react-router";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import type { TaxBusiness, TaxDetails } from "../tax-details-form/logic";
import { DEMO_BACKEND } from "./backend";
import { nameSchema } from "./name-schema";
import { EMPTY_PASSWORD } from "./password-schema";
import { usePasswordForm } from "./use-password-form";
import type { NameValues } from "./name-schema";
import type { AccountSettingsBackend } from "./backend";
import { getInitialName, getInitialSettingsState } from "./logic";
import type { SettingsPerson, NotificationSettings } from "./logic";
import type {
  ConfirmDialog,
  PayoutStatus,
  SettingsPage,
  SettingsState,
  SignIn,
  TwoFactorDevice,
} from "./logic";

const TOAST_MS = 2400;
const SESSIONS_LOAD_MS = 700;
const PASSWORD_MIN = 8;

const PASSWORD_FAILURES: Record<string, string> = {
  reauthentication_not_valid: "That code isn’t right or has expired.",
  same_password: "That’s your current password. Choose a new one.",
  weak_password: "Choose a stronger password.",
  failed: "Your password couldn’t be changed. Try again.",
};

/** What the host (Studio) gets after every render to drive its own save button. */
export interface AccountSettingsApi {
  canSave: boolean;
  save: () => void;
  discard: () => void;
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
  /** Whose account this is (the demo stylist when not given). */
  person?: SettingsPerson;
  /** Saved email / SMS choices (Studio); missing events use the defaults. */
  notifications?: Partial<NotificationSettings>;
  /** Account name, used by the password checker when the name fields are empty. */
  name?: string;
  legalName?: string;
  /** Host-managed two-step devices (Studio); otherwise the component keeps its own list. */
  twoFactorDevices?: TwoFactorDevice[];
  tax?: Partial<TaxDetails> | null;
  taxEditing?: boolean;
  taxBusiness?: TaxBusiness | null;
  taxLegalName?: string;
  taxBusinessName?: string;
  onState?: (api: AccountSettingsApi) => void;
  onToast?: (text: string) => void;
  onNavigate?: (to: "business" | "earnings") => void;
  onConnectStripe?: () => void;
  onTwoFactorRemove?: (name: string) => void;
  onTwoFactorTurnOn?: () => void;
  onTwoFactorAddBackup?: () => void;
  onTaxEdit?: () => void;
  onTaxAdd?: () => void;
  onTaxSave?: (details: TaxDetails) => void;
  onTaxCancel?: () => void;
  onTaxDirty?: (isDirty: boolean) => void;
  /** Opens the stylist's Stripe Express dashboard. */
  onOpenStripe?: () => void;
  /** The payout bank Stripe reports, e.g. "Monzo •••• 4821". */
  payoutBank?: string | null;
  /** Where the changes save; demo boards leave it out. */
  backend?: AccountSettingsBackend;
  onTaxLearnMore?: () => void;
}

type DialogPhase = "idle" | "open" | "closing";

export const useAccountSettings = (props: AccountSettingsProps) => {
  const { page = "personal", signIn, isNew = false } = props;
  const { search } = useLocation();

  // read once: ?pwnew= only prefills the initial state
  const [state, setRawState] = useState(() =>
    getInitialSettingsState(isNew, search, props.person, props.notifications),
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

  const nameForm = useForm<NameValues>({
    defaultValues: getInitialName(props.person),
    resolver: zodResolver(nameSchema),
  });

  const {
    formState: { errors: nameErrors, isDirty: isNameDirty },
  } = nameForm;

  const [first, last] = nameForm.watch(["first", "last"]);

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

    setState({ sessionsLoading: true });

    const timer = window.setTimeout(() => {
      isDone = true;
      setState({ sessionsLoading: false });
    }, SESSIONS_LOAD_MS);

    return () => {
      window.clearTimeout(timer);

      // interrupted (a remount, or leaving the page early): load again next time
      if (isDone) return;

      hasLoaded.current = false;
      setState({ sessionsLoading: false });
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
  const showPasswordFields = !isSocial || state.isSettingPassword;

  const nameParts = String(props.name || props.legalName || "")
    .trim()
    .split(/\s+/);

  const { passwordForm, passwordView, passwordErrors, isPasswordFilled } =
    usePasswordForm({
      search,
      isCodeSent: state.isPasswordCodeSent,
      checkOptions: {
        min: PASSWORD_MIN,
        first: first || nameParts[0],
        last: last || nameParts.slice(1).join(" "),
        email: state.email,
      },
    });

  // ---- personal
  const getNameError = (key: keyof NameValues) =>
    nameErrors[key]?.message ?? "";

  // ---- save bar (only pages with typed fields)
  const isPasswordDirty = showPasswordFields && isPasswordFilled;

  const isDirty =
    page === "personal" ? isNameDirty : page === "security" && isPasswordDirty;

  const hasSave =
    page === "personal" || (page === "security" && showPasswordFields);

  const hasBarError =
    page === "personal"
      ? !!(nameErrors.first || nameErrors.last)
      : page === "security" &&
        !!(
          passwordErrors.code ||
          passwordErrors.next ||
          passwordErrors.confirm ||
          passwordErrors.server
        );

  const backend = props.backend ?? DEMO_BACKEND;

  const save = async () => {
    if (page === "personal")
      return nameForm.handleSubmit(async (name) => {
        try {
          await backend.saveName(name.first, name.last);
        } catch {
          return toast("Your name couldn’t be saved. Try again.");
        }

        nameForm.reset(name);
        toast("Personal details saved");
      })();

    if (page === "security")
      return passwordForm.handleSubmit(async ({ code, next }) => {
        const failure = await backend
          .changePassword(next, code, state.signOthers)
          .catch(() => "failed");

        // signed in over 24 hours ago: Supabase wants the emailed code first
        if (failure === "reauthentication_needed") return sendPasswordCode();

        if (failure)
          return passwordForm.setError(
            failure === "reauthentication_not_valid" ? "code" : "root",
            { message: PASSWORD_FAILURES[failure] ?? PASSWORD_FAILURES.failed },
          );

        const others = state.signOthers
          ? state.sessions.filter(({ isCurrent }) => !isCurrent).length
          : 0;

        passwordForm.reset(EMPTY_PASSWORD);

        setState({
          isPasswordCodeSent: false,
          isSettingPassword: false,
          sessions: state.signOthers
            ? state.sessions.filter(({ isCurrent }) => isCurrent)
            : state.sessions,
        });

        const deviceSuffix = others === 1 ? "" : "s";

        const updatedText = others
          ? `Password updated. Signed out of ${others} other device${deviceSuffix}`
          : "Password updated";

        toast(isSocial ? "Password set" : updatedText);
      })();
  };

  const discard = () => {
    nameForm.reset();
    passwordForm.reset(EMPTY_PASSWORD);
  };

  const sendPasswordCode = () =>
    backend
      .sendPasswordCode()
      .then(() => {
        passwordForm.clearErrors("root");
        setState({ isPasswordCodeSent: true });
        toast(`We emailed a code to ${state.email}`);
      })
      .catch(() => toast("The code couldn’t be sent. Try again."));

  // report after every render (on mount and on every update)
  useEffect(() => {
    props.onState?.({ canSave: isDirty && hasSave, save, discard });
  });

  const connectGoogle = () => {
    setState(({ google }) => ({ google: { ...google, state: "connecting" } }));
    window.clearTimeout(googleTimer.current);

    googleTimer.current = window.setTimeout(() => {
      setState(({ google }) => ({ google: { ...google, state: "on" } }));
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
    passwordForm,
    passwordView,
    passwordErrors,
    nameForm,
    getNameError,
    isDirty,
    hasSave,
    hasBarError,
    save,
    sendPasswordCode,
    backend,
    connectGoogle,
  };
};

export type AccountSettingsController = ReturnType<typeof useAccountSettings>;
