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
import type { FieldPath } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import {
  completeClientProfile,
  getAccountKind,
  getSignedInAccount,
  needsSecondFactor,
  resendEmailCode,
  sendPasswordReset,
  setNewPassword,
  signIn,
  signOut,
  signUpClient,
  signUpStylist,
  startGoogleSignIn,
  verifyEmailCode,
  verifySecondFactor,
} from "../../lib/auth";
import type { StylistDetails } from "../../lib/auth";
import { geocodeAddress } from "../../lib/google-maps";
import { rememberDevice } from "../../lib/supabase";
import type { Location } from "react-router";
import type { EmittedAddress } from "../../components/address-finder/use-address-finder";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { isAddressValid } from "../../utils/address";
import { getAssetUrl } from "../../utils/asset-url";
import { MODE_KEY, PHOTOS, STORAGE_KEY } from "./onboarding-data";
import { getFixturePatch } from "./onboarding-fixtures";
import { getRouteForPath, ROUTE_START } from "./onboarding-routes";
import type { OnboardingRoute } from "./onboarding-routes";
import { getScreenSchema } from "./onboarding-schemas";
import {
  EMPTY_CODE,
  getBackScreen,
  INITIAL_FORM,
  INITIAL_STATE,
  isCodeScreen,
  resolveProps,
} from "./onboarding-state";
import type {
  OnboardingForm,
  OnboardingProps,
  OnboardingState,
  ResolvedProps,
  StartState,
} from "./onboarding-state";

type StatePatch =
  | Partial<OnboardingState>
  | ((state: OnboardingState) => Partial<OnboardingState>);

const LOCK_MS = 9e5;
const MAX_ATTEMPTS = 5;
const DEFAULT_LAT_LNG: [number, number] = [53.4486, -2.2237];
const NEXT_WIZARD_SCREEN = { w1: "w2", w2: "w3" };

const BUSINESS_TYPES: Record<string, StylistDetails["businessType"]> = {
  shop: "shop",
  chair: "chair_rental",
  home: "home_based",
  mobile: "mobile",
};

interface SavedProgress {
  form?: Partial<OnboardingForm>;
  addressOpen?: boolean;
  pinLatLng?: [number, number] | null;
  geocodedLatLng?: [number, number] | null;
  area?: string | null;
}

const readStorage = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

/** Where to send customers after log in: ?return=, sessionStorage tw_return, a same-origin referrer, else Home. */
const getReturnTo = (search: string): string => {
  let returnTo =
    new URLSearchParams(search).get("return") ||
    readStorage(sessionStorage, "tw_return");

  if (!returnTo) {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;

      if (
        referrer &&
        referrer.origin === window.location.origin &&
        !/onboarding|^\/(login|signup|join)$/i.test(
          decodeURIComponent(referrer.pathname),
        )
      )
        returnTo = referrer.pathname + referrer.search;
    } catch {
      // unreadable referrer
    }
  }

  return returnTo || "/";
};

/** A ?flow= / handed-off flow wins, then an explicit screen prop, then the route's own start. */
const getStartScreen = (
  flow: string | null,
  { screen }: ResolvedProps,
  route: OnboardingRoute,
) => {
  if (flow === "list") return "welcome";

  if (flow === "pro") return "pro-email";

  if (flow === "reset") return "forgot-reset";

  // back from Google: wait on the chooser while the account is checked
  if (flow === "social" || flow === "social-pro") return "chooser";

  if (screen && screen !== "auto") return screen;

  return ROUTE_START[route];
};

/** The theme prop wins, then the stored mode, then the system preference. */
const getStartMode = (
  { theme }: ResolvedProps,
  storedMode: string | null,
  prefersDark: boolean,
) => {
  if (theme && theme !== "auto") return theme;

  if (storedMode === "dark" || storedMode === "light") return storedMode;

  return prefersDark ? "dark" : "light";
};

/** The initial state, computed up front (start screen, saved progress, board, fixture, mode). */
const getStartState = (
  props: ResolvedProps,
  { pathname, search }: Pick<Location, "pathname" | "search">,
): StartState => {
  const state: StartState = {
    ...INITIAL_STATE,
    form: INITIAL_FORM,
    touched: {},
    flow: null,
    width: document.documentElement.clientWidth,
  };

  let saved: SavedProgress | null = null;

  try {
    saved = JSON.parse(
      readStorage(localStorage, STORAGE_KEY) || "null",
    ) as SavedProgress | null;
  } catch {
    // unreadable progress: start fresh
  }

  const handoff = readStorage(sessionStorage, "tw_flow");

  try {
    sessionStorage.removeItem("tw_flow");
  } catch {
    // storage unavailable
  }

  const flow = new URLSearchParams(search).get("flow") || handoff;
  const route = getRouteForPath(pathname) ?? "login";
  const start = getStartScreen(flow, props, route);

  state.screen = start;
  state.flow = flow;
  state.returnTo = getReturnTo(search);

  if (start === "welcome" || start[0] === "w") state.audience = "pro";

  if (saved && saved.form && !props.board) {
    state.form = {
      ...state.form,
      ...saved.form,
      password: "",
      passwordConfirm: "",
      terms: false,
    };

    if (saved.addressOpen) state.addressOpen = true;

    if (saved.pinLatLng) state.pinLatLng = saved.pinLatLng;

    if (saved.geocodedLatLng) state.geocodedLatLng = saved.geocodedLatLng;

    if (saved.area) state.area = saved.area;
  }

  if (props.board) {
    const isPro = /^(pro-|w)/.test(start);

    state.form = {
      ...state.form,
      ...(isPro
        ? { email: "amara@tiwarashouse.co.uk", first: "Amara", last: "Okonkwo" }
        : { email: "ama@example.com", first: "Ama", last: "Mensah" }),
    };

    if (isPro) state.audience = "pro";
    else if (start !== "welcome" && start !== "chooser")
      state.audience = "customer";
  }

  // fixtures start from the blank form, not the saved / board one
  // demo states are dev-only; production builds drop this branch and the fixtures module
  if (import.meta.env.DEV && props.fixture && props.fixture !== "none")
    Object.assign(state, getFixturePatch(props.fixture, INITIAL_FORM));

  const storedMode = readStorage(localStorage, MODE_KEY);

  const prefersDark =
    !!window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  state.mode = getStartMode(props, storedMode, prefersDark);

  return state;
};

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

  stateRef.current = state;

  // the form's values, touched fields and errors; the rules come from the current screen's schema
  const {
    formState,
    getValues,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
  } = useForm<OnboardingForm>({
    defaultValues: startForm,
    resolver: (values, context, options) =>
      zodResolver(getScreenSchema({ ...stateRef.current, form: values }))(
        values,
        context,
        options,
      ),
  });

  const form = watch();
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
    });

    try {
      window.scrollTo({ top: 0 });
    } catch {
      // older browsers
    }
  };

  /** Re-checks every field already showing (touched or in error); after a submit, the whole screen. */
  const revalidate = (key?: keyof OnboardingForm) => {
    const { touchedFields, errors, isSubmitted } = formState;

    if (isSubmitted) return void trigger();

    const names = new Set([
      ...Object.keys(touchedFields),
      ...Object.keys(errors),
    ]);

    if (key) names.add(key);

    if (names.size) void trigger([...names] as FieldPath<OnboardingForm>[]);
  };

  /** Sets a field (optionally touching it); clears its server error; wizard screens save progress. */
  const setField = <K extends keyof OnboardingForm>(
    key: K,
    value: OnboardingForm[K],
    touch = false,
  ) => {
    setValue(key as FieldPath<OnboardingForm>, value, { shouldTouch: touch });
    revalidate(touch ? key : undefined);

    setState(
      (current) => ({
        serverErrors: {
          ...current.serverErrors,
          [key]: undefined,
          exists: undefined,
          noBusiness: undefined,
        },
      }),
      () => {
        if (stateRef.current.screen?.[0] === "w") save();
      },
    );
  };

  const touch = (key: keyof OnboardingForm) => {
    setValue(key as FieldPath<OnboardingForm>, getValues(key), {
      shouldTouch: true,
    });

    revalidate(key);
  };

  // fixture boards open with some fields already touched
  useEffect(() => {
    const keys = Object.keys(startTouched) as (keyof OnboardingForm)[];

    keys.forEach((key) => touch(key));
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Uses up the current Turnstile token and asks the widget for a fresh one. */
  const takeCaptchaToken = () => {
    const token = stateRef.current.captchaToken ?? "";

    setState({ captchaToken: null });
    turnstileRef.current?.reset();

    return token;
  };

  /** Runs a server call with the busy state; unexpected failures show the connection error. */
  const run = (task: () => Promise<void>) => {
    setState({ busy: true, networkError: false });

    task().catch(() => setState({ busy: false, networkError: true }));
  };

  const toStudio = (isNew: boolean) => {
    goTo("studio");

    if (!resolved.stayOnDone)
      later(
        "studio",
        () => navigate(`/studio${isNew ? "?welcome=1" : ""}`),
        500,
      );
  };

  const finish = (
    kind: "customer-login" | "customer-new" | "newpro" | "pro",
  ) => {
    if (kind === "customer-login" || kind === "customer-new") {
      const first = getValues("first").trim();

      const message =
        kind === "customer-new"
          ? `Welcome to Tiwára’s House${first ? `, ${first}` : ""}`
          : `Welcome back${first ? `, ${first}` : ""}`;

      if (resolved.stayOnDone) {
        setState({ busy: false, toast: message });

        return;
      }

      try {
        sessionStorage.setItem("tw_toast", message);
        sessionStorage.removeItem("tw_return");
      } catch {
        // storage unavailable
      }

      setState({ busy: true });
      navigate(stateRef.current.returnTo || "/");

      return;
    }

    if (kind === "newpro") {
      const form = getValues();

      try {
        localStorage.setItem(
          "tw_welcome",
          JSON.stringify({
            first: form.first,
            cats: form.categories,
            drafts: 2,
            at: Date.now(),
          }),
        );
      } catch {
        // storage unavailable
      }

      clearSaved();
      setState({ busy: false });
      goTo("pro-done");

      return;
    }

    toStudio(false);
  };

  const afterProAuth = async () => {
    if (await needsSecondFactor())
      setState({ codeKind: "2fa" }, () => goTo("pro-2fa"));
    else finish("pro");
  };

  const getStylistDetails = (form: OnboardingForm): StylistDetails => {
    const { pinLatLng, geocodedLatLng, area } = stateRef.current;
    const location = pinLatLng ?? geocodedLatLng;

    // w3 can't be passed without a location; saved progress always carries it
    if (!location) throw new Error("The business location is missing");

    const [lat, lng] = location;
    const isMobile = form.type === "mobile";

    return {
      ...form,
      businessName: form.businessName,
      businessType: BUSINESS_TYPES[form.type] ?? "shop",
      lat,
      lng,
      areaLabel: area,
      travelRadiusMiles: isMobile ? form.radius : null,
      contactEmail: form.useContact ? form.email : form.businessEmail || null,
      contactPhone: form.useContact ? form.mobile : form.businessPhone || null,
      referralSource:
        form.referralSource === "Other"
          ? form.referralSourceOther
          : form.referralSource,
    };
  };

  const showWrongPassword = () => {
    const attempts = stateRef.current.attempts + 1;

    if (attempts >= MAX_ATTEMPTS)
      setState({
        busy: false,
        attempts,
        lockedUntil: Date.now() + LOCK_MS,
        serverErrors: {
          password: "Too many attempts. Try again in 15 minutes.",
        },
      });
    else
      setState((state) => ({
        busy: false,
        attempts,
        shake: state.shake + 1,
        serverErrors: {
          password: "That password isn’t right. Try again or reset it.",
        },
      }));
  };

  const showWrongCode = () =>
    setState((state) => ({
      busy: false,
      shake: state.shake + 1,
      codeError: "That code isn’t right",
    }));

  const submit = () => {
    const { busy, lockedUntil } = stateRef.current;

    if (busy || lockedUntil > Date.now()) return;

    void handleSubmit(submitValid)();
  };

  const submitValid = () => {
    const current = stateRef.current;
    const { screen } = current;
    const form = getValues();
    const email = form.email.trim().toLowerCase();

    if (screen === "w3")
      return run(async () => {
        const { geocodedLatLng, pinLatLng } = stateRef.current;

        if (
          (form.type === "mobile" || !(pinLatLng ?? geocodedLatLng)) &&
          !(await geocode())
        )
          return setState({
            busy: false,
            serverErrors: {
              [form.type === "mobile" ? "postcode" : "address"]:
                "We can’t find that. Check it and try again.",
            },
          });

        save();
        goTo("w4");
      });

    if (screen === "w1" || screen === "w2") {
      save();
      goTo(NEXT_WIZARD_SCREEN[screen]);

      return;
    }

    if (screen === "cust-email")
      return run(async () => {
        const kind = await getAccountKind(email, takeCaptchaToken());

        goTo(kind === "none" ? "cust-create" : "cust-password");
      });

    if (screen === "pro-email" || screen === "w4")
      return run(async () => {
        const kind = await getAccountKind(email, takeCaptchaToken());

        if (screen === "w4") {
          if (kind === "none")
            setState({ audience: "newpro" }, () => goTo("w5"));
          else setState({ busy: false, serverErrors: { exists: true } });
        } else if (kind === "stylist") goTo("pro-password");
        else setState({ busy: false, serverErrors: { noBusiness: true } });
      });

    if (screen === "cust-password" || screen === "pro-password")
      return run(async () => {
        const error = await signIn(email, form.password, takeCaptchaToken());

        if (error === "invalid_credentials") return showWrongPassword();

        if (error === "email_not_confirmed")
          return setState({ codeKind: "verify", resendIn: 0 }, () =>
            goTo("verify"),
          );

        if (screen === "pro-password") await afterProAuth();
        else finish("customer-login");
      });

    if (screen === "cust-create")
      return run(async () => {
        const isNew = await signUpClient(
          email,
          form.password,
          takeCaptchaToken(),
          form,
        );

        if (!isNew)
          return setState({ busy: false, serverErrors: { exists: true } });

        setState({ codeKind: "verify", audience: "customer" }, () =>
          goTo("verify"),
        );
      });

    if (screen === "w5")
      return run(async () => {
        await signUpStylist(
          email,
          form.password,
          takeCaptchaToken(),
          getStylistDetails(form),
        );

        setState({ codeKind: "verify" }, () => goTo("verify"));
      });

    if (screen === "cust-social")
      return run(async () => {
        await completeClientProfile(form);
        finish("customer-new");
      });

    if (screen === "forgot-email")
      return run(async () => {
        await sendPasswordReset(email, takeCaptchaToken());
        goTo("forgot-sent");
      });

    if (screen === "forgot-reset")
      return run(async () => {
        const error = await setNewPassword(form.password);

        if (error)
          return setState({
            busy: false,
            serverErrors: {
              password:
                error === "same_password"
                  ? "Choose a password you haven’t used before"
                  : "Choose a stronger password",
            },
          });

        goTo("forgot-done");
      });

    if (isCodeScreen(screen)) {
      const code = current.code.join("");

      if (code.length < 6) {
        setState({ busy: false, codeError: "Enter the 6-digit code" });

        return;
      }

      return run(async () => {
        const isRight =
          screen === "pro-2fa"
            ? await verifySecondFactor(code, current.twoFaMethod === "backup")
            : await verifyEmailCode(email, code);

        if (!isRight) return showWrongCode();

        await rememberDevice(form.remember);

        if (screen === "pro-2fa") finish("pro");
        else
          finish(current.audience === "customer" ? "customer-new" : "newpro");
      });
    }
  };

  /** Resend the sign-up code (verify) or the reset link (forgot-sent). */
  const resend = () =>
    run(async () => {
      const email = getValues("email").trim().toLowerCase();

      if (stateRef.current.screen === "forgot-sent")
        await sendPasswordReset(email, takeCaptchaToken());
      else await resendEmailCode(email, takeCaptchaToken());

      setState({ busy: false, resendIn: 30, codeError: "", code: EMPTY_CODE });
    });

  /** Google redirects away; the return lands on /login?flow=social(-pro). */
  const socialSignIn = (isPro: boolean) => run(() => startGoogleSignIn(isPro));

  // back from Google: stylists go on to 2FA, new customers finish their profile
  useEffect(() => {
    const { flow } = start;

    if (flow !== "social" && flow !== "social-pro") return;

    run(async () => {
      const account = await getSignedInAccount();

      if (!account) return setState({ busy: false, networkError: true });

      reset({ ...getValues(), ...account });

      if (flow === "social-pro") {
        if (account.isStylist) return afterProAuth();

        await signOut();

        return setState(
          { busy: false, serverErrors: { noBusiness: true } },
          () => goTo("pro-email"),
        );
      }

      if (account.hasProfile || account.isStylist)
        return finish("customer-login");

      setState({ audience: "customer", socialProvider: "google" }, () =>
        goTo("cust-social"),
      );
    });
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /** Geocodes the address (or a mobile stylist's postcode) once; false when Google can't place it. */
  const geocode = async () => {
    const { type, line1, city, postcode } = getValues();

    const place = await geocodeAddress(
      type === "mobile" ? postcode : [line1, city, postcode].join(", "),
    );

    if (!place?.location) return false;

    const { lat, lng } = place.location;

    setState(
      { geocodedLatLng: [lat, lng], pinLatLng: null, area: place.area },
      save,
    );

    return true;
  };

  const setAddress = (address: EmittedAddress | null) => {
    const previousPostcode = getValues("postcode");

    const fields = address
      ? {
          line1: address.line1,
          line2: address.line2 || "",
          city: address.town,
          postcode: address.postcode,
        }
      : { line1: "", line2: "", city: "", postcode: "" };

    const isOk = !!address && isAddressValid(address);

    const addressLatLng: [number, number] | null =
      address && address.lat != null && address.lng != null
        ? [address.lat, address.lng]
        : null;

    const isNewPlace = fields.postcode !== previousPostcode;

    for (const [key, value] of Object.entries(fields))
      setValue(key as FieldPath<OnboardingForm>, value);

    revalidate();

    setState(
      () => ({
        addressOpen: isOk,
        addressSource: address ? address.source : "",
        addressFinderFixture: "",
        ...(addressLatLng && isNewPlace
          ? {
              geocodedLatLng: addressLatLng,
              pinLatLng: null,
              area: address?.area ?? null,
            }
          : {}),
      }),
      () => {
        save();

        // a typed address has no location yet: place it so the pin starts there
        if (isOk && isNewPlace && !addressLatLng) void geocode();
      },
    );
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
    formErrors: formState.errors,
    props: resolved,
    rootRef: rootRef as RefObject<HTMLDivElement>,
    turnstileRef,
    codeRefs,
    actions: {
      setState,
      goTo,
      back,
      setField,
      touch,
      submit,
      socialSignIn,
      resend,
      setCaptchaToken: (captchaToken: string | null) =>
        setState({ captchaToken }),
      setCodeDigit,
      handleCodeKey,
      pasteCode,
      setAddress,

      save,
      toStudio,
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
  };
};

export type OnboardingController = ReturnType<typeof useOnboarding>;
