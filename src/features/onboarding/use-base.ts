import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useIdentity } from "../../hooks/use-identity";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { getStartState } from "./onboarding-start";
import { getScreenSchema } from "./onboarding-screen-schemas";
import { EMPTY_CODE, resolveProps } from "./onboarding-state";
import type {
  OnboardingForm,
  OnboardingProps,
  OnboardingState,
} from "./onboarding-state";

export type StatePatch =
  | Partial<OnboardingState>
  | ((state: OnboardingState) => Partial<OnboardingState>);

export const useOnboardingBase = (props: OnboardingProps) => {
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
  const formApi = useForm<OnboardingForm>({
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

  const form = formApi.watch();
  const formStateRef = useRef(formApi.formState);

  formStateRef.current = formApi.formState;
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

  const goTo = (screen: string, direction: "fwd" | "back" = "fwd") => {
    window.clearTimeout(timers.current.auto);
    formApi.reset(formApi.getValues());

    setState({
      screen,
      direction,
      serverErrors: {},
      busy: false,
      failure: null,
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

  return {
    resolved,
    start,
    startTouched,
    state,
    navigate,
    stateRef,
    identity,
    isUpgrade,
    formApi,
    form,
    formStateRef,
    rootRef,
    codeRefs,
    timers,
    turnstileRef,
    carouselHeld,
    carouselTouchedAt,
    setState,
    later,
    goTo,
  };
};

export type OnboardingBase = ReturnType<typeof useOnboardingBase>;
