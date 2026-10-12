import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { useLocation, useNavigate } from "react-router";
import type { Location } from "react-router";
import type { EmittedAddress } from "../../components/address-finder/use-address-finder";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { isAddressValid } from "../../utils/address";
import { getAssetUrl } from "../../utils/asset-url";
import {
  KNOWN_CUSTOMERS,
  KNOWN_PROS,
  MODE_KEY,
  NAMES,
  PHOTOS,
  STORAGE_KEY,
  TURNSTILE_SCREENS,
} from "./onboarding-data";
import { getFixturePatch } from "./onboarding-fixtures";
import { getRouteForPath, ROUTE_START } from "./onboarding-routes";
import type { OnboardingRoute } from "./onboarding-routes";
import {
  EMPTY_CODE,
  getBackScreen,
  getErrors,
  INITIAL_STATE,
  isCodeScreen,
  isValidPostcode,
  resolveProps,
} from "./onboarding-state";
import type {
  OnboardingForm,
  OnboardingProps,
  OnboardingState,
  ResolvedProps,
} from "./onboarding-state";

type StatePatch =
  | Partial<OnboardingState>
  | ((state: OnboardingState) => Partial<OnboardingState>);

const SUBMIT_MS = 650;
const CORRECT_PASSWORD = "sunflower9";
const CORRECT_CODE = "123456";
const EXPIRED_CODE = "000000";
const LOCK_MS = 9e5;
const MAX_ATTEMPTS = 5;
const DEFAULT_LAT_LNG: [number, number] = [53.4486, -2.2237];
const NEXT_WIZARD_SCREEN = { w1: "w2", w2: "w3", w3: "w4" };

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
): OnboardingState => {
  const state: OnboardingState = {
    ...INITIAL_STATE,
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
    Object.assign(state, getFixturePatch(props.fixture, INITIAL_STATE.form));

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

  const [state, setRawState] = useState(() =>
    getStartState(resolved, location),
  );

  const navigate = useNavigate();
  const stateRef = useRef(state);

  stateRef.current = state;
  const afterCommit = useRef<(() => void)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const codeRefs = useMemo(
    () => EMPTY_CODE.map(() => createRef<HTMLInputElement>()),
    [],
  );

  const timers = useRef<Record<string, number>>({});
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

    const { form, addressOpen, pinLatLng, geocodedLatLng, area } =
      stateRef.current;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          form: { ...form, password: "", passwordConfirm: "" },
          addressOpen,
          pinLatLng,
          geocodedLatLng,
          area,
        }),
      );
    } catch {
      // storage unavailable
    }
  }, [resolved.board]);

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

    setState({
      screen,
      direction,
      serverErrors: {},
      touched: {},
      busy: false,
      networkError: false,
      shake: 0,
      code: EMPTY_CODE,
      codeError: "",
      resendIn: 30,
      compact: false,
      passwordShown: false,
      turnstile: "idle",
    });

    try {
      window.scrollTo({ top: 0 });
    } catch {
      // older browsers
    }
  };

  /** Sets a field (optionally touching it); clears its server error; wizard screens save progress. */
  const setField = <K extends keyof OnboardingForm>(
    key: K,
    value: OnboardingForm[K],
    touch = false,
  ) =>
    setState(
      (current) => ({
        form: { ...current.form, [key]: value },
        touched: touch ? { ...current.touched, [key]: true } : current.touched,
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

  const touch = (key: string) =>
    setState((current) => ({ touched: { ...current.touched, [key]: true } }));

  const getTurnstileMode = () =>
    stateRef.current.turnstileMode || resolved.turnstile || "pass";

  const isTurnstileBlocked = () => {
    const { screen, turnstile } = stateRef.current;

    return (
      getTurnstileMode() !== "pass" &&
      TURNSTILE_SCREENS.includes(screen ?? "") &&
      turnstile !== "passed"
    );
  };

  const getFirstName = () => {
    const { form } = stateRef.current;

    if (form.first && form.first.trim()) return form.first.trim();

    return NAMES[form.email.trim().toLowerCase()]?.[0] ?? "";
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
      const first = getFirstName();

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
      const { form } = stateRef.current;

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

  const afterProAuth = () => {
    if (resolved.twoFa === "off") finish("pro");
    else setState({ codeKind: "2fa" }, () => goTo("pro-2fa"));
  };

  const submit = () => {
    const current = stateRef.current;

    if (current.busy) return;

    if (current.lockedUntil > Date.now()) return;

    const errorKeys = Object.keys(getErrors(current));

    if (errorKeys.length) {
      const touched: Record<string, boolean> = {};

      for (const key of errorKeys) touched[key] = true;

      setState((state) => ({ touched: { ...state.touched, ...touched } }));

      return;
    }

    if (isTurnstileBlocked()) return;

    const { screen, form } = current;
    const email = form.email.trim().toLowerCase();

    if (screen === "w1" || screen === "w2" || screen === "w3") {
      save();
      goTo(NEXT_WIZARD_SCREEN[screen]);

      return;
    }

    if (screen === "w5") {
      setState({ codeKind: "verify" }, () => goTo("verify"));

      return;
    }

    setState({ busy: true, networkError: false });

    // simulated round trip; ?network=offline shows the connection error
    const done = (callback: () => void) =>
      later(
        "busy",
        () => {
          if (resolved.network === "offline") {
            setState({ busy: false, networkError: true });

            return;
          }

          callback();
        },
        SUBMIT_MS,
      );

    if (screen === "cust-email")
      return done(() =>
        goTo(KNOWN_CUSTOMERS.includes(email) ? "cust-password" : "cust-create"),
      );

    if (screen === "pro-email")
      return done(() => {
        if (KNOWN_PROS.includes(email)) goTo("pro-password");
        else setState({ busy: false, serverErrors: { noBusiness: true } });
      });

    if (screen === "cust-password" || screen === "pro-password")
      return done(() => {
        if (
          form.password === CORRECT_PASSWORD ||
          resolved.password === "accept"
        ) {
          if (screen === "pro-password") afterProAuth();
          else finish("customer-login");

          return;
        }

        const attempts = current.attempts + 1;

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
      });

    if (screen === "cust-create")
      return done(() => {
        if (KNOWN_CUSTOMERS.includes(email)) {
          setState({ busy: false, serverErrors: { exists: true } });

          return;
        }

        setState({ codeKind: "verify", audience: "customer" }, () =>
          goTo("verify"),
        );
      });

    if (screen === "cust-social") return done(() => finish("customer-new"));

    if (screen === "forgot-email") return done(() => goTo("forgot-sent"));

    if (screen === "forgot-reset") return done(() => goTo("forgot-done"));

    if (isCodeScreen(screen)) {
      const code = current.code.join("");

      if (code.length < 6) {
        setState({ busy: false, codeError: "Enter the 6-digit code" });

        return;
      }

      return done(() => {
        if (code === EXPIRED_CODE) {
          setState({
            busy: false,
            codeError: "That code has expired. Send a new one.",
            resendIn: 0,
          });

          return;
        }

        if (code !== CORRECT_CODE && resolved.code !== "accept") {
          setState((state) => ({
            busy: false,
            shake: state.shake + 1,
            codeError: "That code isn’t right",
          }));

          return;
        }

        if (screen === "pro-2fa") finish("pro");
        else
          finish(current.audience === "customer" ? "customer-new" : "newpro");
      });
    }

    if (screen === "w4")
      return done(() => {
        if (KNOWN_PROS.includes(email)) {
          setState({ busy: false, serverErrors: { exists: true } });

          return;
        }

        setState({ audience: "newpro" }, () => goTo("w5"));
      });

    setState({ busy: false });
  };

  /** Simulated Google / Apple sign-in (?socialEmail=unknown, ?appleName=withheld). */
  const socialSignIn = (provider: "google" | "apple", isPro: boolean) => {
    if (stateRef.current.busy) return;

    const isKnown = resolved.socialEmail !== "unknown";

    setState({ busy: true, networkError: false, serverErrors: {} });

    later(
      "busy",
      () => {
        if (resolved.network === "offline") {
          setState({ busy: false, networkError: true });

          return;
        }

        const form = { ...stateRef.current.form };

        if (isPro) {
          const newProEmail =
            provider === "apple"
              ? "k3x9wq2m7t@privaterelay.appleid.com"
              : "ama.studio@gmail.com";

          form.email = isKnown ? "amara@tiwarashouse.co.uk" : newProEmail;

          if (!isKnown) {
            setState({ busy: false, form, serverErrors: { noBusiness: true } });

            return;
          }

          setState({ busy: false, form }, afterProAuth);

          return;
        }

        if (isKnown) {
          const email =
            provider === "apple" ? "kemi.a@icloud.com" : "nia.okafor@gmail.com";

          const [first = "", last = ""] = NAMES[email] ?? [];

          setState({ form: { ...form, email, first, last } }, () =>
            finish("customer-login"),
          );

          return;
        }

        const sharesName =
          provider === "google" || resolved.appleName !== "withheld";

        setState(
          {
            form: {
              ...form,
              email:
                provider === "apple"
                  ? "x7k2m9q4pd@privaterelay.appleid.com"
                  : "ama.mensah@gmail.com",
              first: sharesName ? "Ama" : "",
              last: sharesName ? "Mensah" : "",
              mobile: "",
              terms: false,
              marketing: false,
            },
            socialProvider: provider,
            audience: "customer",
          },
          () => goTo("cust-social"),
        );
      },
      SUBMIT_MS,
    );
  };

  const checkTurnstile = () => {
    if (stateRef.current.turnstile !== "idle") return;

    setState({ turnstile: "checking" });

    later(
      "turnstile",
      () =>
        setState({
          turnstile: getTurnstileMode() === "fail" ? "fail" : "passed",
        }),
      1100,
    );
  };

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

  /** Re-centres the pin on the postcode via postcodes.io (live). */
  const geocodeOnly = async () => {
    const postcode = stateRef.current.form.postcode.trim().toUpperCase();

    if (!isValidPostcode(postcode)) return;

    try {
      const response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`,
      );

      if (!response.ok) return;

      const { result } = (await response.json()) as {
        result: {
          latitude: number;
          longitude: number;
          admin_ward?: string;
          outcode: string;
        };
      };

      setState(
        {
          geocodedLatLng: [result.latitude, result.longitude],
          pinLatLng: null,
          area: `${result.admin_ward || "Manchester"}, ${result.outcode}`,
        },
        save,
      );
    } catch {
      // offline: keep the current pin
    }
  };

  const setAddress = (address: EmittedAddress | null) => {
    const previousPostcode = stateRef.current.form.postcode;

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

    setState(
      (current) => ({
        form: { ...current.form, ...fields },
        addressOpen: isOk,
        addressSource: address ? address.source : "",
        addressFinderFixture: "",
        ...(addressLatLng && fields.postcode !== previousPostcode
          ? { geocodedLatLng: addressLatLng, pinLatLng: null, area: null }
          : {}),
      }),
      () => {
        save();

        if (isOk && fields.postcode !== previousPostcode) void geocodeOnly();
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
    state,
    props: resolved,
    rootRef: rootRef as RefObject<HTMLDivElement>,
    codeRefs,
    actions: {
      setState,
      goTo,
      back,
      setField,
      touch,
      submit,
      socialSignIn,
      checkTurnstile,
      setCodeDigit,
      handleCodeKey,
      pasteCode,
      setAddress,
      geocodeOnly,
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
