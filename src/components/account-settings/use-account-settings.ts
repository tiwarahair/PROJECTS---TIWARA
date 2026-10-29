import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { PASSWORD_FAILURES } from "../../lib/account-changes";
import type { TaxBusiness, TaxDetails } from "../tax-details-form/logic";
import { nameSchema } from "./name-schema";
import { EMPTY_PASSWORD } from "./password-schema";
import { usePasswordForm } from "./use-password-form";
import type { NameValues } from "./name-schema";
import type { AccountSettingsBackend } from "./backend";
import { getInitialName, getInitialSettingsState } from "./logic";
import { getSessionsActions } from "./sessions-actions";
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
const PASSWORD_MIN = 8;

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
  upcoming?: number;
  /** Money owed (pounds) and open disputes block closing the business. */
  owed?: number;
  hasOpenDispute?: boolean;
  /** The money and dispute checks haven't loaded yet. */
  isCloseChecking?: boolean;
  /** The checks failed to load: Close business stays off with a Try again. */
  onRetryCloseChecks?: () => void;
  onPayOwed?: () => void;
  isPayingOwed?: boolean;
  pauseReason?: string;
  embedded?: boolean;
  hideSave?: boolean;
  /** Whose account this is. */
  person: SettingsPerson;
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
  onTaxSave?: (details: TaxDetails) => void | Promise<void>;
  onTaxCancel?: () => void;
  onTaxDirty?: (isDirty: boolean) => void;
  /** Opens the stylist's Stripe Express dashboard. */
  onOpenStripe?: () => void;
  /** The payout bank Stripe reports, or null before there is one. */
  payoutBank?: string | null;
  /** Where the changes save. */
  backend: AccountSettingsBackend;
  onTaxLearnMore?: () => void;
}

type DialogPhase = "idle" | "open" | "closing";

export const useAccountSettings = (props: AccountSettingsProps) => {
  const { page = "personal", signIn } = props;

  const [state, setRawState] = useState(() =>
    getInitialSettingsState(props.person, props.notifications),
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
  const latestSessionsLoad = useRef(0);

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

  const sessions = getSessionsActions({
    backend: props.backend,
    setState,
    toast,
    latestLoad: latestSessionsLoad,
  });

  const loadSessions = useEffectEvent(() => sessions.load());

  useEffect(() => {
    if (page === "security") loadSessions();
  }, [page]);

  const loadFeed = () => {
    if (state.feedUrl) return;

    setState({ feedFailed: false });

    props.backend.getCalendarFeed().then(
      (feedUrl) => setState({ feedUrl }),
      () => setState({ feedFailed: true }),
    );
  };

  const loadFeedOnOpen = useEffectEvent(loadFeed);

  useEffect(() => {
    if (page === "calendar") loadFeedOnOpen();
  }, [page]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
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

  const { backend } = props;

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
          trustedDevices: [],
        });

        if (state.signOthers) sessions.load();

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
    sessions,
    retryFeed: loadFeed,
  };
};

export type AccountSettingsController = ReturnType<typeof useAccountSettings>;
