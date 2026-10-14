import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { useForm } from "react-hook-form";
import type { FieldPath, PathValue, UseFormReturn } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import type { NavigateFunction } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import type { FieldBinding } from "./onboarding-fields";
import { useIdentity } from "../../hooks/use-identity";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { getAssetUrl } from "../../utils/asset-url";
import { MODE_KEY, PHOTOS, STORAGE_KEY } from "./onboarding-data";
import { getStartState, readStorage } from "./onboarding-start";
import { getScreenSchema } from "./onboarding-screen-schemas";
import { useOnboardingAddress } from "./use-onboarding-address";
import { useOnboardingSubmit } from "./use-onboarding-submit";
import {
  EMPTY_CODE,
  getBackScreen,
  isCodeScreen,
  resolveProps,
} from "./onboarding-state";
import type {
  OnboardingForm,
  OnboardingProps,
  OnboardingState,
  ResolvedProps,
} from "./onboarding-state";

/** Form fields typed into text inputs. */
type TextFieldName = {
  [K in keyof OnboardingForm]: OnboardingForm[K] extends string ? K : never;
}[keyof OnboardingForm];

type StatePatch =
  | Partial<OnboardingState>
  | ((state: OnboardingState) => Partial<OnboardingState>);

/** What the submit and address hooks share with the main onboarding hook. */
export interface OnboardingCore {
  stateRef: RefObject<OnboardingState>;
  isUpgrade: boolean;
  setState: (patch: StatePatch, callback?: () => void) => void;
  goTo: (screen: string, direction?: "fwd" | "back") => void;
  later: (name: string, callback: () => void, delay: number) => void;
  save: () => void;
  clearSaved: () => void;
  navigate: NavigateFunction;
  resolved: ResolvedProps;
  startFlow: string | null;
  turnstileRef: RefObject<TurnstileInstance | null>;
  formApi: Pick<
    UseFormReturn<OnboardingForm>,
    "getValues" | "setValue" | "reset" | "handleSubmit"
  >;
}

const DEFAULT_LAT_LNG: [number, number] = [53.4486, -2.2237];

export const useOnboarding = (props: OnboardingProps) => {
  const location = useLocation();

  // read once: the start state comes from the URL the page opened with
  const [resolved] = useState(() => resolveProps(props, location.search));

  const [start] = useState(() => getStartState(resolved, location));
  // the start flow stays in state unused; only the mount effect below reads it
  const { form: startForm, touched: startTouched, ...startState } = start;
  const [state, setRawState] = useState<OnboardingState>(startState);

  const navigate = useNavigate();
  const stateRef = useRef(state);
  const identity = useIdentity();
  const isUpgrade = !!identity && !identity.user.isStylist;
  const isUpgradeRef = useRef(isUpgrade);

  isUpgradeRef.current = isUpgrade;

  stateRef.current = state;

  // the form's values, touched fields and errors; the rules come from the current screen's schema
  const {
    formState,
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
    trigger,
    watch,
  } = useForm<OnboardingForm>({
    defaultValues: startForm,
    mode: "onTouched",
    resolver: (values, context, options) =>
      zodResolver(
        getScreenSchema({
          ...stateRef.current,
          isUpgrade: isUpgradeRef.current,
          form: values,
        }),
      )(values, context, options),
  });

  const form = watch();
  const formStateRef = useRef(formState);

  formStateRef.current = formState;
  const afterCommit = useRef<(() => void)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const codeRefs = useMemo(
    () => EMPTY_CODE.map(() => createRef<HTMLInputElement>()),
    [],
  );

  const timers = useRef<Record<string, number>>({});
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const carouselHeld = useRef(false);
  const carouselTouchedAt = useRef(0);

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

  const later = (name: string, callback: () => void, delay: number) => {
    window.clearTimeout(timers.current[name]);
    timers.current[name] = window.setTimeout(callback, delay);
  };

  /** Saves wizard progress (never passwords); boards never save. */
  const save = useCallback(() => {
    if (resolved.board) return;

    const { addressOpen, pinLatLng, geocodedLatLng, area } = stateRef.current;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          form: { ...getValues(), password: "", passwordConfirm: "" },
          addressOpen,
          pinLatLng,
          geocodedLatLng,
          area,
        }),
      );
    } catch {
      // storage unavailable
    }
  }, [resolved.board, getValues]);

  const clearSaved = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
  };

  const setMode = useCallback(
    (mode: "light" | "dark") => {
      try {
        localStorage.setItem(MODE_KEY, mode);
      } catch {
        // storage unavailable
      }

      setState({ mode });
    },
    [setState],
  );

  // width drives desktop (≥900) / tablet (≥640) layouts
  useEffect(() => {
    const root = rootRef.current;

    if (!root || !window.ResizeObserver) return;

    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);

      if (Math.abs(width - stateRef.current.width) > 4) setState({ width });
    });

    observer.observe(root);

    return () => observer.disconnect();
  }, [setState]);

  // follow the system theme unless the user (or ?theme=) chose one
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");

    if (!query?.addEventListener) return;

    const handleChange = (event: MediaQueryListEvent) => {
      if (
        !readStorage(localStorage, MODE_KEY) &&
        (!resolved.theme || resolved.theme === "auto")
      )
        setMode(event.matches ? "dark" : "light");
    };

    query.addEventListener("change", handleChange);

    return () => query.removeEventListener("change", handleChange);
  }, [resolved.theme, setMode]);

  // preload the three photos; rotate the welcome benefits every 5s; count down resend
  useEffect(() => {
    const preload = window.setTimeout(() => {
      for (const [src] of Object.values(PHOTOS))
        new Image().src = getAssetUrl(src);
    }, 1200);

    const carousel = window.setInterval(() => {
      const { screen } = stateRef.current;

      if (screen !== "welcome" || carouselHeld.current || document.hidden)
        return;

      if (
        carouselTouchedAt.current &&
        Date.now() - carouselTouchedAt.current < 5000
      )
        return;

      setState((current) => ({ benefitIndex: (current.benefitIndex + 1) % 4 }));
    }, 5000);

    const tick = window.setInterval(() => {
      const { resendIn, screen } = stateRef.current;

      if (resendIn > 0 && (isCodeScreen(screen) || screen === "forgot-sent"))
        setState((current) => ({ resendIn: current.resendIn - 1 }));
    }, 1000);

    const pending = timers.current;

    return () => {
      window.clearTimeout(preload);
      window.clearInterval(carousel);
      window.clearInterval(tick);
      Object.values(pending).forEach((timer) => window.clearTimeout(timer));
    };
  }, [setState]);

  // code screens focus the first box once the slide-in has run
  useEffect(() => {
    if (!isCodeScreen(state.screen)) return;

    const timer = window.setTimeout(
      () => codeRefs[0]?.current?.focus({ preventScroll: true }),
      360,
    );

    return () => window.clearTimeout(timer);
  }, [state.screen, codeRefs]);

  // an empty field that loses focus isn't wrong yet: errors show once it's been changed, or on Continue
  const getShownErrors = () => {
    const { errors, dirtyFields, isSubmitted } = formState;

    return Object.fromEntries(
      Object.entries(errors).filter(
        ([key]) => isSubmitted || key in dirtyFields,
      ),
    );
  };

  const goTo = (screen: string, direction: "fwd" | "back" = "fwd") => {
    window.clearTimeout(timers.current.auto);
    reset(getValues());

    setState({
      screen,
      direction,
      serverErrors: {},
      busy: false,
      networkError: false,
      shake: 0,
      code: EMPTY_CODE,
      codeError: "",
      resendIn: 30,
      compact: false,
      passwordShown: false,
      captchaToken: null,
      resendArmed: false,
      submitArmed: false,
    });

    try {
      window.scrollTo({ top: 0 });
    } catch {
      // older browsers
    }
  };

  /** Binds a text input: react-hook-form tracks it, checking it on blur and then as it changes. */
  const field = (name: TextFieldName): FieldBinding => ({
    ...register(name),
    value: form[name],
  });

  /** Buttons and checkboxes set their value directly (touch: check it straight away). */
  const setField = <K extends FieldPath<OnboardingForm>>(
    key: K,
    value: PathValue<OnboardingForm, K>,
    touch = false,
  ) =>
    setValue(key, value, {
      shouldTouch: touch,
      shouldDirty: touch,
      shouldValidate: touch,
    });

  // any change: clear its server error, re-check what's already showing, save wizard progress
  useEffect(() => {
    const { unsubscribe } = watch((_values, { name }) => {
      if (!name) return;

      const { touchedFields, errors, isSubmitted } = formStateRef.current;
      const shown = Object.keys({ ...touchedFields, ...errors });

      if (isSubmitted) void trigger();
      else if (shown.length) void trigger(shown as FieldPath<OnboardingForm>[]);

      setState(
        (current) => ({
          serverErrors: {
            ...current.serverErrors,
            [name]: undefined,
            exists: undefined,
            noBusiness: undefined,
          },
        }),
        () => {
          if (stateRef.current.screen?.[0] === "w") save();
        },
      );
    });

    return unsubscribe;
  }, [watch, trigger, setState, save]);

  // fixture boards open with some fields already showing their errors
  useEffect(() => {
    const keys = Object.keys(startTouched) as FieldPath<OnboardingForm>[];

    if (keys.length) void trigger(keys);
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a signed-in account's own details fill (and lock) the account step
  const { first, last, email, mobile } = identity ?? {};

  useEffect(() => {
    if (!isUpgrade || !identity?.isLoaded) return;

    setValue("first", first ?? "");
    setValue("last", last ?? "");
    setValue("email", email ?? "");
    setValue("mobile", mobile ?? "");
    // only a newly loaded identity refills the fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpgrade, identity?.isLoaded]);

  const core: OnboardingCore = {
    stateRef,
    isUpgrade,
    setState,
    goTo,
    later,
    save,
    clearSaved,
    navigate,
    resolved,
    startFlow: start.flow,
    turnstileRef,
    formApi: { getValues, setValue, reset, handleSubmit },
  };

  const { geocode, setAddress } = useOnboardingAddress(core);

  const { submit, resend, sendAgain, socialSignIn, toStudio, createStylist } =
    useOnboardingSubmit({
      ...core,
      geocode,
    });

  /** One digit per box: advance on input, submit when all six are filled. */
  const setCodeDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "");

    setState(
      (current) => {
        const code = current.code.slice();

        code[index] = digit.slice(-1);

        return { code, codeError: "" };
      },
      () => {
        if (digit && index < 5) codeRefs[index + 1]?.current?.focus();

        if (digit && index === 5 && stateRef.current.code.every(Boolean))
          submit();
      },
    );
  };

  const handleCodeKey = (index: number, event: KeyboardEvent) => {
    const { code } = stateRef.current;

    if (event.key === "Backspace" && !code[index] && index > 0) {
      codeRefs[index - 1]?.current?.focus();
      setCodeDigit(index - 1, "");
    } else if (event.key === "ArrowLeft" && index > 0)
      codeRefs[index - 1]?.current?.focus();
    else if (event.key === "ArrowRight" && index < 5)
      codeRefs[index + 1]?.current?.focus();
    else if (event.key === "Enter") submit();
  };

  const pasteCode = (event: ClipboardEvent) => {
    const text = (event.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!text.length) return;

    event.preventDefault();
    const code = EMPTY_CODE.slice();

    text.split("").forEach((digit, index) => (code[index] = digit));

    setState({ code, codeError: "" }, () => {
      codeRefs[Math.min(5, text.length)]?.current?.focus();

      if (text.length === 6) submit();
    });
  };

  const back = () => {
    const target = getBackScreen(stateRef.current);
    const { screen } = stateRef.current;

    if (target) goTo(target, "back");
    else if (screen === "chooser" || screen === "welcome") navigate("/");
    else goTo("chooser", "back");
  };

  return {
    state: { ...state, form },
    formErrors: getShownErrors(),
    props: resolved,
    rootRef: rootRef as RefObject<HTMLDivElement>,
    turnstileRef,
    codeRefs,
    actions: {
      setState,
      goTo,
      back,
      field,
      setField,
      submit,
      socialSignIn,
      resend,
      setCaptchaToken: (captchaToken: string | null) => {
        const { resendArmed, submitArmed } = stateRef.current;

        if (captchaToken && resendArmed) sendAgain(captchaToken);
        else if (!submitArmed) setState({ captchaToken });
        else if (captchaToken)
          setState({ captchaToken, busy: false, submitArmed: false }, submit);
        else setState({ busy: false, submitArmed: false, networkError: true });
      },
      setCodeDigit,
      handleCodeKey,
      pasteCode,
      setAddress,

      save,
      toStudio,
      skipSource: () => createStylist(true),
      setMode,
      autoNext: (to: string, after?: () => void) =>
        later(
          "auto",
          () => {
            after?.();
            goTo(to);
          },
          300,
        ),
      holdCarousel: (held: boolean) => {
        carouselHeld.current = held;
      },
      showBenefit: (index: number) => {
        carouselTouchedAt.current = Date.now();
        setState({ benefitIndex: index });
      },
      compactLater: (callback: () => void) => later("compact", callback, 140),
      cancelCompact: () => window.clearTimeout(timers.current.compact),
    },
    defaultLatLng: DEFAULT_LAT_LNG,
    isUpgrade,
  };
};

export type OnboardingController = ReturnType<typeof useOnboarding>;
