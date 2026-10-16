import { useEffect, useRef } from "react";
import type { FlowState } from "./use-flow-state";

const PAY_ERRORS = {
  declined: "Your card was declined. Try another card or payment method.",
  bank: "We couldn't confirm this payment with your bank. Try again or use another card.",
  network: "Something went wrong and you haven't been charged. Try again.",
};

// Stripe test cards the demo reacts to
const DECLINED_CARD = "4000000000000002";
const BANK_CHECK_CARD = "4000002760003184";
const NETWORK_ERROR_CARD = "4000000000000119";

/** Simulated Stripe payment, until the Payment Element replaces it. */
export const useDemoPay = (flow: FlowState, onConfirm: () => void) => {
  const { state, stateRef, setState } = flow;
  const payTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(payTimer.current), []);

  const showTurnstile = !!state.turnstileMode && state.step === 6;
  const turnstileBlocking = showTurnstile && state.turnstileStatus !== "passed";
  const payDisabled = state.paying || turnstileBlocking;

  const confirmNow = () => {
    onConfirm();

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

  /** 900ms, then the outcome for the test card (or success). */
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

  const actions = {
    attemptPay,
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
  };

  return { showTurnstile, turnstileBlocking, payDisabled, actions };
};
