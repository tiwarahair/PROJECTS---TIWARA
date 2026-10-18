import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { NavigateFunction } from "react-router";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { getCodeEntry } from "./code-entry";
import { getPageActions } from "./page-actions";
import { useOnboardingAddress } from "./use-address";
import { useOnboardingBase } from "./use-base";
import type { StatePatch } from "./use-base";
import { useOnboardingForm } from "./use-form";
import { useOnboardingStorage } from "./use-storage";
import { useOnboardingSubmit } from "./use-submit";
import { useOnboardingTimers } from "./use-timers";
import type {
  OnboardingForm,
  OnboardingProps,
  OnboardingState,
  ResolvedProps,
} from "./state";

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
  const base = useOnboardingBase(props);
  const { state, form, resolved, isUpgrade, setState, goTo } = base;
  const { getValues, setValue, reset, handleSubmit } = base.formApi;
  const { save, clearSaved, setMode } = useOnboardingStorage(base);

  useOnboardingTimers(base, setMode);

  const { getShownErrors, field, setField } = useOnboardingForm(base, save);

  const core: OnboardingCore = {
    stateRef: base.stateRef,
    isUpgrade,
    setState,
    goTo,
    later: base.later,
    save,
    clearSaved,
    navigate: base.navigate,
    resolved,
    startFlow: base.start.flow,
    turnstileRef: base.turnstileRef,
    formApi: { getValues, setValue, reset, handleSubmit },
  };

  const { geocode, setAddress } = useOnboardingAddress(core);

  const { submit, resend, sendAgain, socialSignIn, toStudio, createStylist } =
    useOnboardingSubmit({
      ...core,
      geocode,
    });

  const { setCodeDigit, handleCodeKey, pasteCode } = getCodeEntry(base, submit);
  const page = getPageActions(base, { submit, resend, sendAgain });

  return {
    state: { ...state, form },
    formErrors: getShownErrors(),
    props: resolved,
    rootRef: base.rootRef as RefObject<HTMLDivElement>,
    turnstileRef: base.turnstileRef,
    codeRefs: base.codeRefs,
    actions: {
      setState,
      goTo,
      back: page.back,
      field,
      setField,
      submit,
      socialSignIn,
      resend,
      retry: page.retry,
      setCaptchaToken: page.setCaptchaToken,
      setCodeDigit,
      handleCodeKey,
      pasteCode,
      setAddress,

      save,
      toStudio,
      skipSource: () => createStylist(true),
      setMode,
      autoNext: page.autoNext,
      holdCarousel: page.holdCarousel,
      showBenefit: page.showBenefit,
      compactLater: page.compactLater,
      cancelCompact: page.cancelCompact,
    },
    defaultLatLng: DEFAULT_LAT_LNG,
    isUpgrade,
  };
};

export type OnboardingController = ReturnType<typeof useOnboarding>;
