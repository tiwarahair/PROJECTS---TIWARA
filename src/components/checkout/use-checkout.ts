import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { getRefundSchema, resendSchema } from "./schemas";
import type { ResendValues } from "./schemas";
import { EMPTY_REFUND } from "./data";
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
  layout?: "mobile" | "desktop";
  booking: CheckoutBooking;
  start?: CheckoutView;
  done?: Partial<CheckoutResult> & { tip?: number };
  refunded?: number;
  linkPaid?: boolean;
  /** The host's sheet corner radius. */
  radius?: string;
  stylist: CheckoutStylist;
  /** Takes the payment: "paid", or how the card was declined. */
  onPay: (payment: CheckoutPayment) => Promise<CheckoutPayOutcome>;
  menu: MenuGroup[];
  onExit?: () => void;
  onClose?: () => void;
  onComplete: (
    result: CheckoutResult & {
      total: number;
      lines: CheckoutResultLine[];
      mode: string;
      paid: number;
    },
    action: "done" | "rebook",
  ) => void;
  onRefund?: (amount: number, reason: string, isOffPlatform: boolean) => void;
  onResent?: (to: string) => Promise<void>;
  onCancelLink?: () => void;
}

export const useCheckout = (props: CheckoutSheetProps) => {
  const [state, setRawState] = useState(() =>
    getInitialCheckout({
      booking: props.booking,
      start: props.start,
      done: props.done,
      refunded: props.refunded,
      linkPaid: props.linkPaid,
    }),
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef(0);
  const { booking } = props;

  const money = getMoney(state, booking);

  const resendForm = useForm<ResendValues>({
    defaultValues: { to: booking.email },
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

  const startResend = () => resendForm.reset({ to: booking.email });

  const setState = (
    patch:
      | Partial<CheckoutState>
      | ((current: CheckoutState) => Partial<CheckoutState>),
  ) =>
    setRawState((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const scrollTop = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const exit = () => props.onExit?.();

  /** Show a view; leaving to "detail" exits the sheet instead. */
  const goTo = (view: CheckoutView, direction = 1) => {
    if (view === "detail") return exit();

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

  const pay = (finish: () => void) => {
    setState({ busy: true });

    props
      .onPay({
        method: money.method,
        via: state.method === "link" ? state.linkVia : state.recordVia,
        tip: money.tip,
        lines: getLines(),
      })
      .then(
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

    pay(finish);
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
