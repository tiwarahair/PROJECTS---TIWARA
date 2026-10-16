import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { useNavigate } from "react-router";
import { getScreenPath } from "../onboarding/onboarding-routes";
import { startGoogleSignIn } from "../../lib/auth";
import type { PublicStylist } from "../../lib/public-stylist";
import {
  useGetAvailableSlotsQuery,
  useHoldBookingMutation,
  useUpdateProfileMutation,
} from "../../stores/api-slice";
import { writeSession } from "../../utils/page-flags";
import { logOut as logOutSession } from "../../stores/session-slice";
import { useIdentity } from "../../hooks/use-identity";
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import { useAppDispatch } from "../../stores/hooks";
import { getServiceOptions, findService, hasStep2 } from "../../utils/services";
import { toChoices } from "./booking-choices";
import { getBookingMoney, getCustomisationLine } from "./booking-pricing";
import { getClosedLine } from "./booking-calendar";
import { getMonthRange, groupSlotsByDay } from "./booking-slots";
import {
  getAddressCheck,
  getContactChanges,
  getFirstErrorTarget,
} from "./booking-details";
import { detailsSchema } from "./booking-schemas";
import {
  clearDraft,
  EMPTY_ADDRESS,
  getDraftPatch,
  getFreshSelection,
  getInitialBooking,
  getSavedAddressPatch,
  saveDraft,
} from "./booking-state";
import type { BookingState, Details } from "./booking-state";
import { useTravelCheck } from "./use-travel-check";

type StatePatch =
  Partial<BookingState> | ((state: BookingState) => Partial<BookingState>);

const STEPS = [
  { stepNumber: 1, label: "Service" },
  { stepNumber: 2, label: "Customise" },
  { stepNumber: 3, label: "Time" },
  { stepNumber: 4, label: "Details" },
  { stepNumber: 5, label: "Review" },
  { stepNumber: 6, label: "Pay" },
];

const PAY_ERRORS = {
  declined: "Your card was declined. Try another card or payment method.",
  bank: "We couldn't confirm this payment with your bank. Try again or use another card.",
  network: "Something went wrong and you haven't been charged. Try again.",
};

// Stripe test cards the demo reacts to
const DECLINED_CARD = "4000000000000002";
const BANK_CHECK_CARD = "4000002760003184";
const NETWORK_ERROR_CARD = "4000000000000119";

export const useBooking = ({ stylist, hours }: PublicStylist) => {
  const [initial] = useState(() => getInitialBooking(stylist));
  const [state, setRawState] = useState(initial.state);
  const [, setTick] = useState(0);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const stateRef = useRef(state);

  stateRef.current = state;
  const afterCommit = useRef<(() => void)[]>([]);
  const crumbsRef = useRef<HTMLDivElement>(null);
  const payTimer = useRef(0);

  /** setState with a merge patch and an optional callback after the render. */
  const setState = useCallback((patch: StatePatch, callback?: () => void) => {
    if (callback) afterCommit.current.push(callback);

    setRawState((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));
  }, []);

  const detailsForm = useForm<Details>({
    defaultValues: initial.state.details,
    mode: "onTouched",
    resolver: zodResolver(detailsSchema),
    shouldFocusError: false,
  });

  useEffect(() => {
    const { unsubscribe } = detailsForm.watch(() =>
      setState({ details: detailsForm.getValues() }),
    );

    if (initial.showErrors) void detailsForm.handleSubmit(() => undefined)();

    return unsubscribe;
  }, [detailsForm, initial, setState]);

  // once a service is picked, leaving (any link, back, reload) asks first
  const isLeaving = useRef(false);

  const hasStarted = useCallback(() => {
    const { serviceId, confirmed } = stateRef.current;

    return !isLeaving.current && !!serviceId && !confirmed;
  }, []);

  const blocker = useUnsavedChanges(hasStarted);

  useEffect(() => {
    if (blocker.state !== "blocked" || stateRef.current.leave) return;

    const { pathname, search } = blocker.location;

    setState({ leave: pathname + search });
  }, [blocker, setState]);

  useEffect(() => {
    const callbacks = afterCommit.current.splice(0);

    for (const callback of callbacks) callback();
  });

  const identity = useIdentity();
  const hasSession = !!identity && !state.board;
  const signedIn = identity?.isLoaded && hasSession ? identity : null;
  const [updateProfile] = useUpdateProfileMutation();

  // signed in: book as them, with their details filled in
  useEffect(() => {
    if (!signedIn) return;

    const { first, last, email, mobile } = signedIn;

    detailsForm.reset({
      ...detailsForm.getValues(),
      first,
      last,
      email,
      phone: mobile,
    });

    const { step, loginStart } = stateRef.current;
    const isLeavingTime = !!loginStart && step === 3;

    setState(
      (current) => ({
        loggedIn: true,
        editContact: false,
        loginStart: null,
        step: isLeavingTime ? 4 : step,
        // their saved addresses, unless they've already entered one
        ...(current.board || current.appointmentAddress.line1
          ? {}
          : getSavedAddressPatch(current.appointmentAddress)),
      }),
      isLeavingTime ? scrollToTitle : undefined,
    );
    // once per signed-in account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn?.user.id, setState]);

  /** Step changes scroll so the step title sits at the top. */
  const scrollToTitle = useCallback(() => {
    const crumbs = crumbsRef.current;

    if (!crumbs) {
      window.scrollTo(0, 0);

      return;
    }

    const y = crumbs.getBoundingClientRect().bottom + window.scrollY;

    window.scrollTo(0, Math.max(0, y - 40));
  }, []);

  // 1s tick: the hold countdown (and its expiry) and the "Resend email (Ns)" countdown
  useEffect(() => {
    const interval = window.setInterval(() => {
      const { confirmed, account, hold, holdExpired } = stateRef.current;

      if (confirmed && account.sent && Date.now() - account.sentAt < 31000) {
        setTick((tick) => tick + 1);

        return;
      }

      if (!hold || confirmed || holdExpired) return;

      if (Date.now() >= hold.until)
        setState({ holdExpired: true, loginStart: null });
      else setTick((tick) => tick + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(payTimer.current);
    };
  }, [setState]);

  // after every update: keep the draft (or drop it once confirmed)
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      return;
    }

    if (state.confirmed) {
      if (!state.board) clearDraft(state.id);
    } else saveDraft(state);
  }, [state]);

  const focusLater = (target: string | null) => {
    if (!target) return;

    window.setTimeout(() => {
      const element =
        target === "@address"
          ? document.querySelector<HTMLElement>(
              '[data-af-root="bk-addr"] [aria-invalid="true"], [data-af-root="bk-addr"] input, [data-af-root="bk-addr"] button[aria-label="Edit address"]',
            )
          : document.getElementById(target);

      element?.focus();
    }, 60);
  };

  const service = findService(stylist, state.serviceId);
  const options = getServiceOptions(service);
  const money = getBookingMoney(stylist, service, options, state.selection);
  const isMobileStylist = stylist.businessType === "mobile";
  const choices = toChoices(options, state.selection);

  const travel = useTravelCheck(
    state.serviceId,
    state.appointmentAddress,
    isMobileStylist,
  );

  const address = {
    ...getAddressCheck(state.appointmentAddress),
    inArea: travel.inArea,
    outBlock: travel.outBlock,
  };

  const isAddressMissing = isMobileStylist && !address.isValid;
  const hasCustomiseStep = !!(service && hasStep2(service));
  const needSize = options.size.length > 0 && !state.selection.size;
  const needLength = options.length.length > 0 && !state.selection.length;

  // the month on screen; options must be complete for the server to know the length
  const slots = useGetAvailableSlotsQuery(
    {
      serviceId: state.serviceId,
      choices,
      ...getMonthRange(state.calendarYear, state.calendarMonth),
      ...(state.hold?.id ? { ownHold: state.hold.id } : {}),
    },
    { skip: state.step !== 3 || !service || needSize || needLength },
  );

  const slotsByDay = useMemo(
    () => groupSlotsByDay(slots.currentData ?? []),
    [slots.currentData],
  );

  const [holdTime] = useHoldBookingMutation();

  const nextDisabled =
    state.holding ||
    (state.step === 2 && (needSize || needLength)) ||
    (state.step === 3 &&
      (!(state.date && state.time) || (!state.board && slots.isFetching)));

  const needsMobile = state.loggedIn && !!signedIn && !signedIn.mobile;
  const showContactFields = state.loggedIn ? state.editContact : true;

  const saveContactToAccount = () => {
    if (!signedIn) return;

    const patch = getContactChanges(detailsForm.getValues(), signedIn);

    if (!Object.keys(patch).length) return;

    updateProfile({ userId: signedIn.user.id, patch })
      .unwrap()
      .catch(() => undefined);
  };

  const showTurnstile = !!state.turnstileMode && state.step === 6;
  const turnstileBlocking = showTurnstile && state.turnstileStatus !== "passed";
  const payDisabled = state.paying || turnstileBlocking;

  const holdLeftMs = state.hold
    ? Math.max(0, state.hold.until - Date.now())
    : 0;

  const confirmNow = () => {
    saveContactToAccount();

    setState(
      {
        confirmed: true,
        paying: false,
        hold: null,
        bank: false,
        wallet: null,
        holdExpired: false,
      },
      () => window.scrollTo(0, 0),
    );
  };

  /** Simulated Stripe: 900ms, then the outcome for the test card (or success). */
  const attemptPay = (card: string) => {
    setState({ paying: true, payError: "", payKind: "" });
    window.clearTimeout(payTimer.current);

    payTimer.current = window.setTimeout(() => {
      const current = stateRef.current;

      if (current.taken)
        return setState({
          paying: false,
          payError: `Sorry, ${current.time} was just booked by someone else. You haven't been charged.`,
          payKind: "taken",
        });

      if (card === DECLINED_CARD)
        return setState({
          paying: false,
          payError: PAY_ERRORS.declined,
          payKind: "declined",
          pay: { ...current.pay, number: "", expiry: "", cvc: "" },
        });

      if (card === BANK_CHECK_CARD)
        return setState({ paying: false, bank: true });

      if (card === NETWORK_ERROR_CARD)
        return setState({
          paying: false,
          payError: PAY_ERRORS.network,
          payKind: "network",
        });

      confirmNow();
    }, 900);
  };

  const goToStep = (step: number) => setState({ step }, scrollToTitle);

  const loginReturn = `/book?stylist=${stylist.id}&resume=1`;

  const prepareLoginRedirect = () => {
    const current = stateRef.current;

    saveDraft(
      current.loginStart && current.step === 3
        ? { ...current, step: 4 }
        : current,
    );

    writeSession("tw_return", loginReturn);
    isLeaving.current = true;
    navigate(loginReturn, { replace: true });
  };

  /** Holds the chosen time on the server (dev boards fake it); null when it couldn't be held. */
  const holdChosenTime = async (): Promise<Partial<BookingState> | null> => {
    if (state.board)
      return {
        hold: state.hold ?? {
          id: "",
          secret: "",
          until: Date.now() + state.holdSeconds * 1000,
        },
      };

    const startsAt = slotsByDay
      .get(state.date ?? 0)
      ?.find(({ time }) => time === state.time)?.startsAt;

    // a time missing from the loaded list (a resumed booking's, say) has gone since
    if (!startsAt) {
      setState({ holdError: "taken", time: null });

      return null;
    }

    setState({ holding: true, holdError: null });

    try {
      const held = await holdTime({
        serviceId: state.serviceId,
        choices,
        startsAt,
        // picking again moves the same hold
        ...(state.hold?.id
          ? { hold: { id: state.hold.id, secret: state.hold.secret } }
          : {}),
      }).unwrap();

      return {
        holding: false,
        hold: {
          id: held.id,
          secret: held.secret,
          until: Date.parse(held.hold_expires_at),
        },
      };
    } catch (error) {
      const isTaken = error instanceof Error && error.message === "slot_taken";

      setState({
        holding: false,
        holdError: isTaken ? "taken" : "failed",
        ...(isTaken ? { time: null } : {}),
      });

      return null;
    }
  };

  const goToNextStep = async () => {
    const extra = state.step === 3 ? await holdChosenTime() : {};

    if (!extra) return;

    if (state.step === 3 && !hasSession && !state.guest) {
      setState({ ...extra, loginStart: "choice", repickNote: false });

      return;
    }

    setState(
      ({ step }) => ({
        ...extra,
        step: Math.min(6, step + 1),
        repickNote: false,
      }),
      scrollToTitle,
    );
  };

  const actions = {
    setState,
    scrollToTitle,
    goToStep,
    attemptPay,
    pickService: (serviceId: string) => {
      const picked = findService(stylist, serviceId);

      setState(
        {
          serviceId,
          step: picked && hasStep2(picked) ? 2 : 3,
          selection: getFreshSelection(picked),
          showPrev: false,
          date: null,
          time: null,
        },
        scrollToTitle,
      );
    },
    goBack: () =>
      setState(
        ({ step }) => ({
          step: Math.max(
            1,
            step - 1 - (step === 3 && !hasCustomiseStep ? 1 : 0),
          ),
        }),
        scrollToTitle,
      ),
    goNext: () => {
      if (nextDisabled) return;

      if (state.step !== 4) return void goToNextStep();

      const focusFirstError = (errors: FieldErrors<Details>) => {
        if (state.loggedIn && Object.keys(errors).length)
          setState({ editContact: true });

        focusLater(
          getFirstErrorTarget(
            { address: isAddressMissing, ...errors },
            address.outBlock,
          ),
        );
      };

      void detailsForm.handleSubmit(() => {
        if (isAddressMissing || address.outBlock) return focusFirstError({});

        void goToNextStep();
      }, focusFirstError)();
    },
    logOut: () => {
      dispatch(logOutSession());

      detailsForm.reset({
        ...detailsForm.getValues(),
        first: "",
        last: "",
        email: "",
        phone: "",
      });

      setState({ loggedIn: false, guest: false, editContact: false });
    },
    openContactEdit: () => {
      setState({ editContact: true });
      focusLater("bk-first");
    },
    cancelContactEdit: () => {
      if (signedIn)
        detailsForm.reset({
          ...detailsForm.getValues(),
          first: signedIn.first,
          last: signedIn.last,
          phone: signedIn.mobile,
        });

      setState({ editContact: false });
    },
    saveDraftNow: () => saveDraft(stateRef.current),
    openLogin: () => setState({ loginStart: "email" }),
    closeLogin: () => setState({ loginStart: null }),
    continueAsGuestWith: (email: string) => {
      if (email) detailsForm.setValue("email", email);

      setState(
        ({ step }) => ({
          guest: true,
          loginStart: null,
          step: step === 3 ? 4 : step,
        }),
        scrollToTitle,
      );

      focusLater("bk-first");
    },
    leaveForLogin: (screen: string) => {
      prepareLoginRedirect();

      navigate(
        `${getScreenPath(screen)}?screen=${screen}&return=${encodeURIComponent(loginReturn)}`,
      );
    },
    googleLogin: async () => {
      prepareLoginRedirect();

      try {
        await startGoogleSignIn(false);
      } catch (error) {
        isLeaving.current = false;
        throw error;
      }
    },
    keepBooking: () => {
      if (blocker.state === "blocked") blocker.reset();

      setState({ leave: null });
    },
    confirmLeave: () => {
      const href = state.leave;

      isLeaving.current = true;

      setState({ hold: null, leave: null }, () => {
        if (blocker.state === "blocked") blocker.proceed();
        else if (href) navigate(href);
      });
    },
    resumeContinue: () => {
      if (!state.resumeDraft) return;

      const patch = getDraftPatch(state.resumeDraft, state);

      if (patch.details) detailsForm.reset(patch.details);

      setState(patch, scrollToTitle);
    },
    resumeStartOver: () => {
      clearDraft(state.id);
      setState({ resumeDraft: null });
    },
    pickAgain: () =>
      setState(
        {
          holdExpired: false,
          hold: null,
          time: null,
          step: 3,
          repickNote: false,
          payError: "",
          payKind: "",
        },
        scrollToTitle,
      ),
    pickAnother: () =>
      setState(
        {
          step: 3,
          time: null,
          hold: null,
          payError: "",
          payKind: "",
          taken: false,
        },
        scrollToTitle,
      ),
    bankApprove: () => {
      setState({ bank: false, paying: true });
      window.clearTimeout(payTimer.current);
      payTimer.current = window.setTimeout(confirmNow, 600);
    },
    bankFail: () =>
      setState({
        bank: false,
        paying: false,
        payError: PAY_ERRORS.bank,
        payKind: "bank",
      }),
    openWallet: (wallet: string) => {
      if (!payDisabled) setState({ wallet, payError: "", payKind: "" });
    },
    walletPay: () => {
      setState({ wallet: null });
      attemptPay("wallet");
    },
    clearAddress: () =>
      setState(({ appointmentAddress }) => ({
        appointmentAddress: {
          ...EMPTY_ADDRESS,
          notes: appointmentAddress.notes,
        },
      })),
  };

  return {
    state,
    openPrivacy: initial.openPrivacy,
    crumbsRef,
    stylist,
    service,
    options,
    money,
    customisationLine: getCustomisationLine(options, state.selection),
    isMobileStylist,
    address,
    detailsForm,
    needsMobile,
    showContactFields,
    hasCustomiseStep,
    needSize,
    needLength,
    nextDisabled,
    showTurnstile,
    turnstileBlocking,
    payDisabled,
    holdOn: !!state.hold && !!state.time && !state.confirmed,
    slotsByDay,
    isLoadingSlots: slots.isFetching,
    closedLine: getClosedLine(hours),
    holdLeftMs,
    steps: STEPS.filter(
      ({ stepNumber }) => stepNumber !== 2 || hasCustomiseStep,
    ),
    actions,
  };
};

export type BookingController = ReturnType<typeof useBooking>;
