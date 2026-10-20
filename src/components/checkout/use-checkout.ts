import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { getRefundSchema, resendSchema } from "./schemas";
import type { ResendValues } from "./schemas";
import { BOOKINGS, EMPTY_REFUND } from "./data";
import type { RefundValues } from "./data";
import {
  getFinalized,
  getInitialCheckout,
  getMoney,
  getRefundCap,
} from "./logic";
import type {
  CheckoutBooking,
  CheckoutResult,
  CheckoutState,
  CheckoutStylist,
  CheckoutView,
  MenuGroup,
} from "./data";

const TOAST_MS = 2400;
const CHARGE_MS = 1100;

export interface CheckoutPayment {
  method: CheckoutResult["method"];
  via: string;
  tip: number;
  lines: CheckoutResultLine[];
}

interface CheckoutResultLine {
  name: string;
  subtitle: string;
  base: number;
  adjustment: number;
  reason: string;
}

export type CheckoutPayOutcome =
  { outcome: "paid" } | { outcome: "soft" | "hard"; message: string };

export interface CheckoutSheetProps {
  scenario?: string;
  layout?: "mobile" | "desktop";
  /** Studio passes the real booking; without it the sheet runs a demo scenario. */
  booking?: CheckoutBooking;
  start?: CheckoutView;
  done?: Partial<CheckoutResult> & { tip?: number };
  refunded?: number;
  linkPaid?: boolean;
  /** The host's sheet corner radius when embedded. */
  radius?: string;
  stylist?: Partial<CheckoutStylist>;
  /** Demo: "soft" declines the first card attempt, "hard" every attempt. */
  declineMode?: "none" | "soft" | "hard";
  /** Takes the payment for real: "paid", or how the card was declined. Without it the sheet runs the demo. */
  onPay?: (payment: CheckoutPayment) => Promise<CheckoutPayOutcome>;
  menu?: MenuGroup[];
  onExit?: () => void;
  onClose?: () => void;
  onComplete?: (
    result: CheckoutResult & {
      total: number;
      lines: CheckoutResultLine[];
      mode: string;
      paid: number;
    },
    action: "done" | "rebook",
  ) => void;
  onRefund?: (amount: number, reason: string, isOffPlatform: boolean) => void;
  onResent?: (to: string) => void;
  onCancelLink?: () => void;
}

export const useCheckout = (props: CheckoutSheetProps) => {
  const [state, setRawState] = useState(() =>
    getInitialCheckout({
      scenario: props.scenario,
      booking: props.booking,
      start: props.start,
      done: props.done,
      refunded: props.refunded,
      linkPaid: props.linkPaid,
    }),
  );

  const stateRef = useRef(state);

  stateRef.current = state;
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef(0);
  const chargeTimer = useRef(0);
  const isEmbedded = !!props.booking;

  const booking: CheckoutBooking =
    state.bookingKey === "live" && props.booking
      ? props.booking
      : BOOKINGS[state.bookingKey]!;

  const money = getMoney(state, booking);

  const getResendTo = (via: CheckoutState["resendVia"]) =>
    via === "email" ? booking.email : booking.phone;

  const resendForm = useForm<ResendValues>({
    defaultValues: { to: getResendTo(state.resendVia) },
    resolver: zodResolver(resendSchema),
  });

  const { refundCap } = getRefundCap(state, booking);

  const refundForm = useForm<RefundValues>({
    defaultValues: state.refund,
    resolver: zodResolver(getRefundSchema(refundCap)),
  });

  const refundValues = refundForm.watch();

  const pickRefundKind = (kind: RefundValues["kind"]) => {
    refundForm.setValue("kind", kind);

    if (refundForm.getFieldState("amount").error)
      void refundForm.trigger("amount");
  };

  const startRefund = () => refundForm.reset(EMPTY_REFUND);

  const startResend = (via: CheckoutState["resendVia"]) => {
    setState({ resendVia: via });
    resendForm.reset({ to: getResendTo(via) });
  };

  const setState = (
    patch:
      | Partial<CheckoutState>
      | ((current: CheckoutState) => Partial<CheckoutState>),
  ) =>
    setRawState((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(chargeTimer.current);
    },
    [],
  );

  const scrollTop = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const exit = () => props.onExit?.();

  /** Show a view; leaving to "detail" inside Studio exits the sheet instead. */
  const goTo = (view: CheckoutView, direction = 1) => {
    if (view === "detail" && isEmbedded) return exit();

    setState({ view, direction, adjustingLineId: null });
    resendForm.clearErrors();
    scrollTop();
  };

  const showToast = (text: string) => {
    window.clearTimeout(toastTimer.current);
    setState({ toast: text });

    toastTimer.current = window.setTimeout(
      () => setState({ toast: "" }),
      TOAST_MS,
    );
  };

  const startCheckout = () => {
    setState({ decline: null });
    goTo("items", 1);
  };

  const getLines = () =>
    state.lines.map(({ name, subtitle, base, adjustment, reason }) => ({
      name,
      subtitle,
      base,
      adjustment,
      reason,
    }));

  const pay = (
    onPay: NonNullable<CheckoutSheetProps["onPay"]>,
    finish: () => void,
  ) => {
    setState({ busy: true });

    onPay({
      method: money.method,
      via: state.method === "link" ? state.linkVia : state.recordVia,
      tip: money.tip,
      lines: getLines(),
    }).then(
      (result) => {
        if (result.outcome === "paid") return finish();

        setState((current) => {
          const tries =
            result.outcome === "soft" ? Math.max(0, current.tries - 1) : 0;

          return {
            busy: false,
            decline: tries ? "soft" : "hard",
            declineMessage: result.message,
            tries,
          };
        });
      },
      (error: unknown) => {
        setState({ busy: false });

        showToast(
          error instanceof Error
            ? error.message
            : "That didn’t work. Try again.",
        );
      },
    );
  };

  const complete = () => {
    const finish = () => {
      setRawState((current) => {
        const next = {
          ...current,
          busy: false,
          decline: null,
          direction: 1,
          view: "done" as const,
          fromDone: false,
        };

        return { ...next, ...getFinalized(next, booking) };
      });

      scrollTop();
    };

    if (props.onPay) return pay(props.onPay, finish);

    if (money.method !== "card") return finish();

    setState({ busy: true });
    window.clearTimeout(chargeTimer.current);
    const declineMode = props.declineMode || "none";
    const isFirst = !stateRef.current.decline;

    // demo: 'soft' declines the first attempt then succeeds on retry; 'hard' always declines with no retry
    const isFailing =
      declineMode === "hard" || (declineMode === "soft" && isFirst);

    chargeTimer.current = window.setTimeout(
      isFailing
        ? () =>
            setState({
              busy: false,
              decline: declineMode === "hard" ? "hard" : "soft",
              tries: declineMode === "hard" ? 0 : 1,
            })
        : finish,
      CHARGE_MS,
    );
  };

  /** What the host gets when the stylist leaves the done screen. */
  const getResult = () => ({
    method: "none" as const,
    via: "",
    charged: 0,
    tip: 0,
    refundAuto: 0,
    ...(state.done ?? {}),
    total: money.items,
    lines: getLines(),
    mode: state.mode,
    paid: state.paid,
  });

  return {
    props,
    state,
    setState,
    booking,
    money,
    isEmbedded,
    scrollRef,
    goTo,
    exit,
    showToast,
    resendForm,
    startResend,
    refundForm,
    refundValues,
    pickRefundKind,
    startRefund,
    startCheckout,
    complete,
    getResult,
  };
};

export type CheckoutController = ReturnType<typeof useCheckout>;
