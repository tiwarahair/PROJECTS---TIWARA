import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { useNavigate } from "react-router";
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
  STREETS,
  TURNSTILE_SCREENS,
} from "./onboarding-data";
import {
  EMPTY_CODE,
  getBackScreen,
  getErrors,
  getFixturePatch,
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
const DEFAULT_GEO: [number, number] = [53.4486, -2.2237];

interface SavedProgress {
  f?: Partial<OnboardingForm>;
  addrOpen?: boolean;
  ll?: [number, number] | null;
  geo?: [number, number] | null;
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
const getReturnTo = (): string => {
  let returnTo =
    new URLSearchParams(window.location.search).get("return") ||
    readStorage(sessionStorage, "tw_return");
  if (!returnTo) {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (
        referrer &&
        referrer.origin === window.location.origin &&
        !/onboarding/i.test(decodeURIComponent(referrer.pathname))
      )
        returnTo = referrer.pathname + referrer.search;
    } catch {
      // unreadable referrer
    }
  }
  return returnTo || "/";
};

/** The prototype's componentDidMount setup, computed up front (start screen, saved progress, board, fixture, mode). */
const getStartState = (props: ResolvedProps): OnboardingState => {
  const state: OnboardingState = {
    ...INITIAL_STATE,
    w: document.documentElement.clientWidth,
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
  const flow =
    new URLSearchParams(window.location.search).get("flow") || handoff;
  const start =
    flow === "list"
      ? "welcome"
      : flow === "pro"
        ? "pro-email"
        : props.screen && props.screen !== "auto"
          ? props.screen
          : "chooser";
  state.screen = start;
  state.returnTo = getReturnTo();
  if (start === "welcome" || start[0] === "w") state.audience = "pro";
  if (saved && saved.f && !props.board) {
    state.f = { ...state.f, ...saved.f, pw: "", pw2: "", terms: false };
    if (saved.addrOpen) state.addrOpen = true;
    if (saved.ll) state.ll = saved.ll;
    if (saved.geo) state.geo = saved.geo;
    if (saved.area) state.area = saved.area;
  }
  if (props.board) {
    const isPro = /^(pro-|w)/.test(start);
    state.f = {
      ...state.f,
      ...(isPro
        ? { email: "amara@amarabeauty.co.uk", first: "Amara", last: "Okonkwo" }
        : { email: "ama@example.com", first: "Ama", last: "Mensah" }),
    };
    if (isPro) state.audience = "pro";
    else if (start !== "welcome" && start !== "chooser")
      state.audience = "customer";
  }
  // fixtures start from the blank form, not the saved / board one (the prototype read this.state.f before setState)
  if (props.fixture && props.fixture !== "none")
    Object.assign(state, getFixturePatch(props.fixture, INITIAL_STATE.f));
  const storedMode = readStorage(localStorage, MODE_KEY);
  const prefersDark =
    !!window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  state.mode =
    props.theme && props.theme !== "auto"
      ? props.theme
      : storedMode === "dark" || storedMode === "light"
        ? storedMode
        : prefersDark
          ? "dark"
          : "light";
  return state;
};

/** Onboarding state and actions (prototype Onboarding.dc.html class Component). */
export const useOnboarding = (props: OnboardingProps) => {
  const [resolved] = useState(() => resolveProps(props));
  const [state, setRawState] = useState(() => getStartState(resolved));
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
    const { f, addrOpen, ll, geo, area } = stateRef.current;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          f: { ...f, pw: "", pw2: "" },
          addrOpen,
          ll,
          geo,
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
      if (Math.abs(width - stateRef.current.w) > 4) setState({ w: width });
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
      setState((current) => ({ bn: (current.bn + 1) % 4 }));
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

  const go = (screen: string, dir: "fwd" | "back" = "fwd") => {
    window.clearTimeout(timers.current.auto);
    setState({
      screen,
      dir,
      err: {},
      touched: {},
      busy: false,
      netErr: false,
      shake: 0,
      code: EMPTY_CODE,
      codeErr: "",
      resendIn: 30,
      compact: false,
      pwShow: false,
      ts: "idle",
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
        f: { ...current.f, [key]: value },
        touched: touch ? { ...current.touched, [key]: true } : current.touched,
        err: {
          ...current.err,
          [key]: undefined,
          exists: undefined,
          noBiz: undefined,
        },
      }),
      () => {
        if (stateRef.current.screen?.[0] === "w") save();
      },
    );

  const touch = (key: string) =>
    setState((current) => ({ touched: { ...current.touched, [key]: true } }));

  const getTurnstileMode = () =>
    stateRef.current.tsMode || resolved.turnstile || "pass";
  const isTurnstileBlocked = () => {
    const { screen, ts } = stateRef.current;
    return (
      getTurnstileMode() !== "pass" &&
      TURNSTILE_SCREENS.includes(screen ?? "") &&
      ts !== "ok"
    );
  };

  const firstName = () => {
    const { f } = stateRef.current;
    if (f.first && f.first.trim()) return f.first.trim();
    return NAMES[f.email.trim().toLowerCase()]?.[0] ?? "";
  };

  const toStudio = (isNew: boolean) => {
    go("studio");
    if (!resolved.stayOnDone)
      later(
        "studio",
        () => navigate("/studio" + (isNew ? "?welcome=1" : "")),
        500,
      );
  };

  const finish = (
    kind: "customer-login" | "customer-new" | "newpro" | "pro",
  ) => {
    if (kind === "customer-login" || kind === "customer-new") {
      const first = firstName();
      const message =
        kind === "customer-new"
          ? "Welcome to Tiwára’s House" + (first ? ", " + first : "")
          : "Welcome back" + (first ? ", " + first : "");
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
      const { f } = stateRef.current;
      try {
        localStorage.setItem(
          "tw_welcome",
          JSON.stringify({
            first: f.first,
            cats: f.cats,
            drafts: 2,
            at: Date.now(),
          }),
        );
      } catch {
        // storage unavailable
      }
      clearSaved();
      setState({ busy: false });
      go("pro-done");
      return;
    }
    toStudio(false);
  };

  const afterProAuth = () => {
    if (resolved.twoFa === "off") finish("pro");
    else setState({ codeKind: "2fa" }, () => go("pro-2fa"));
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
    const { screen, f } = current;
    const email = f.email.trim().toLowerCase();
    if (screen === "w1" || screen === "w2" || screen === "w3") {
      save();
      go(screen === "w1" ? "w2" : screen === "w2" ? "w3" : "w4");
      return;
    }
    if (screen === "w5") {
      setState({ codeKind: "verify" }, () => go("verify"));
      return;
    }
    setState({ busy: true, netErr: false });
    // simulated round trip; ?network=offline shows the connection error
    const done = (callback: () => void) =>
      later(
        "busy",
        () => {
          if (resolved.network === "offline") {
            setState({ busy: false, netErr: true });
            return;
          }
          callback();
        },
        SUBMIT_MS,
      );
    if (screen === "cust-email")
      return done(() =>
        go(KNOWN_CUSTOMERS.includes(email) ? "cust-password" : "cust-create"),
      );
    if (screen === "pro-email")
      return done(() => {
        if (KNOWN_PROS.includes(email)) go("pro-password");
        else setState({ busy: false, err: { noBiz: true } });
      });
    if (screen === "cust-password" || screen === "pro-password")
      return done(() => {
        if (f.pw === CORRECT_PASSWORD || resolved.password === "accept") {
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
            err: { pw: "Too many attempts. Try again in 15 minutes." },
          });
        else
          setState((state) => ({
            busy: false,
            attempts,
            shake: state.shake + 1,
            err: { pw: "That password isn’t right. Try again or reset it." },
          }));
      });
    if (screen === "cust-create")
      return done(() => {
        if (KNOWN_CUSTOMERS.includes(email)) {
          setState({ busy: false, err: { exists: true } });
          return;
        }
        setState({ codeKind: "verify", audience: "customer" }, () =>
          go("verify"),
        );
      });
    if (screen === "cust-social") return done(() => finish("customer-new"));
    if (screen === "forgot-email") return done(() => go("forgot-sent"));
    if (screen === "forgot-reset") return done(() => go("forgot-done"));
    if (isCodeScreen(screen)) {
      const code = current.code.join("");
      if (code.length < 6) {
        setState({ busy: false, codeErr: "Enter the 6-digit code" });
        return;
      }
      return done(() => {
        if (code === EXPIRED_CODE) {
          setState({
            busy: false,
            codeErr: "That code has expired. Send a new one.",
            resendIn: 0,
          });
          return;
        }
        if (code !== CORRECT_CODE && resolved.code !== "accept") {
          setState((state) => ({
            busy: false,
            shake: state.shake + 1,
            codeErr: "That code isn’t right",
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
          setState({ busy: false, err: { exists: true } });
          return;
        }
        setState({ audience: "newpro" }, () => go("w5"));
      });
    setState({ busy: false });
  };

  /** Simulated Google / Apple sign-in (?socialEmail=unknown, ?appleName=withheld). */
  const socialSignIn = (provider: "google" | "apple", isPro: boolean) => {
    if (stateRef.current.busy) return;
    const isKnown = resolved.socialEmail !== "unknown";
    setState({ busy: true, netErr: false, err: {} });
    later(
      "busy",
      () => {
        if (resolved.network === "offline") {
          setState({ busy: false, netErr: true });
          return;
        }
        const f = { ...stateRef.current.f };
        if (isPro) {
          f.email = isKnown
            ? "amara@amarabeauty.co.uk"
            : provider === "apple"
              ? "k3x9wq2m7t@privaterelay.appleid.com"
              : "ama.studio@gmail.com";
          if (!isKnown) {
            setState({ busy: false, f, err: { noBiz: true } });
            return;
          }
          setState({ busy: false, f }, afterProAuth);
          return;
        }
        if (isKnown) {
          const email =
            provider === "apple" ? "kemi.a@icloud.com" : "nia.okafor@gmail.com";
          const [first = "", last = ""] = NAMES[email] ?? [];
          setState({ f: { ...f, email, first, last } }, () =>
            finish("customer-login"),
          );
          return;
        }
        const sharesName =
          provider === "google" || resolved.appleName !== "withheld";
        setState(
          {
            f: {
              ...f,
              email:
                provider === "apple"
                  ? "x7k2m9q4pd@privaterelay.appleid.com"
                  : "ama.mensah@gmail.com",
              first: sharesName ? "Ama" : "",
              last: sharesName ? "Mensah" : "",
              mob: "",
              terms: false,
              mkt: false,
            },
            socialP: provider,
            audience: "customer",
          },
          () => go("cust-social"),
        );
      },
      SUBMIT_MS,
    );
  };

  const checkTurnstile = () => {
    if (stateRef.current.ts !== "idle") return;
    setState({ ts: "checking" });
    later(
      "turnstile",
      () => setState({ ts: getTurnstileMode() === "fail" ? "fail" : "ok" }),
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
        return { code, codeErr: "" };
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
    setState({ code, codeErr: "" }, () => {
      codeRefs[Math.min(5, text.length)]?.current?.focus();
      if (text.length === 6) submit();
    });
  };

  /** Re-centres the pin on the postcode via postcodes.io (live). */
  const geocodeOnly = async () => {
    const postcode = stateRef.current.f.pc.trim().toUpperCase();
    if (!isValidPostcode(postcode)) return;
    try {
      const response = await fetch(
        "https://api.postcodes.io/postcodes/" + encodeURIComponent(postcode),
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
          geo: [result.latitude, result.longitude],
          ll: null,
          area: (result.admin_ward || "Manchester") + ", " + result.outcode,
        },
        save,
      );
    } catch {
      // offline: keep the current pin
    }
  };

  /**
   * Postcode → street matches (prototype lookup(); not called by the current template, where AddressFinder replaced
   * it). Kept for the final clean-up.
   */
  const lookup = async () => {
    const postcode = stateRef.current.f.pc.trim().toUpperCase();
    if (!isValidPostcode(postcode)) {
      touch("pc");
      return;
    }
    let result: {
      latitude: number;
      longitude: number;
      admin_ward?: string;
      admin_district?: string;
      outcode: string;
      post_town?: string;
    } | null = null;
    let notFound = /^ZZ/.test(postcode) || resolved.addressLookup === "fail";
    if (!notFound) {
      try {
        const response = await fetch(
          "https://api.postcodes.io/postcodes/" + encodeURIComponent(postcode),
        );
        if (response.status === 404) notFound = true;
        else if (response.ok) result = (await response.json()).result;
      } catch {
        // offline: fall through with no result
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    if (notFound) return [];
    return [12, 41, 58, 7].map((number, index) => ({
      label:
        number +
        " " +
        STREETS[index] +
        ", " +
        (result?.post_town || result?.admin_district || "Manchester") +
        " " +
        postcode,
    }));
  };

  const setAddress = (address: EmittedAddress | null) => {
    const previousPostcode = stateRef.current.f.pc;
    const fields = address
      ? {
          a1: address.line1,
          a2: address.line2 || "",
          city: address.town,
          pc: address.postcode,
        }
      : { a1: "", a2: "", city: "", pc: "" };
    const isOk = !!address && isAddressValid(address);
    const geo: [number, number] | null =
      address && address.lat != null && address.lng != null
        ? [address.lat, address.lng]
        : null;
    setState(
      (current) => ({
        f: { ...current.f, ...fields },
        addrOpen: isOk,
        addrSrc: address ? address.source : "",
        afFx: "",
        ...(geo && fields.pc !== previousPostcode
          ? { geo, ll: null, area: null }
          : {}),
      }),
      () => {
        save();
        if (isOk && fields.pc !== previousPostcode) void geocodeOnly();
      },
    );
  };

  const back = () => {
    const target = getBackScreen(stateRef.current);
    const { screen } = stateRef.current;
    if (target) go(target, "back");
    else if (screen === "chooser" || screen === "welcome") navigate("/");
    else go("chooser", "back");
  };

  return {
    state,
    props: resolved,
    rootRef: rootRef as RefObject<HTMLDivElement>,
    codeRefs,
    actions: {
      setState,
      go,
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
      lookup,
      save,
      toStudio,
      setMode,
      autoNext: (to: string, after?: () => void) =>
        later(
          "auto",
          () => {
            after?.();
            go(to);
          },
          300,
        ),
      holdCarousel: (held: boolean) => {
        carouselHeld.current = held;
      },
      showBenefit: (index: number) => {
        carouselTouchedAt.current = Date.now();
        setState({ bn: index });
      },
      compactLater: (callback: () => void) => later("compact", callback, 140),
      cancelCompact: () => window.clearTimeout(timers.current.compact),
    },
    defaultGeo: DEFAULT_GEO,
  };
};

export type OnboardingController = ReturnType<typeof useOnboarding>;
