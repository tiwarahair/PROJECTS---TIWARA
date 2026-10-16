import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { skipToken } from "@reduxjs/toolkit/query";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { useEffect, useRef, useState } from "react";
import type { CheckoutRequest } from "../../../lib/booking-api";
import type { LatLng } from "../../../lib/google-maps";
import {
  getErrorMessage,
  useGetBookingStatusQuery,
  useStartCheckoutMutation,
} from "../../../stores/api-slice";
import {
  getCheckoutError,
  getCheckoutRequest,
  getRefundedError,
  PAY_ERRORS,
} from "../logic/payment";
import type { FlowState } from "./use-flow-state";

const POLL_MS = 1500;
const CONFIRM_WAIT_MS = 60_000;

interface PayOptions {
  flow: FlowState;
  point: LatLng | null;
  onConfirm: () => void;
}

export const usePay = ({ flow, point, onConfirm }: PayOptions) => {
  const { state, stateRef, setState } = flow;
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [startCheckout] = useStartCheckoutMutation();
  const { hold, confirming } = state;

  const { currentData: booked } = useGetBookingStatusQuery(
    confirming && hold ? { id: hold.id, secret: hold.secret } : skipToken,
    { pollingInterval: POLL_MS },
  );

  useEffect(() => {
    if (!confirming) return;

    if (booked?.status === "refunded")
      return setState({
        confirming: false,
        paying: false,
        ...getRefundedError(stateRef.current.time),
      });

    if (booked?.status !== "confirmed") return;

    onConfirm();

    setState(
      {
        confirmed: true,
        confirming: false,
        paying: false,
        hold: null,
        holdExpired: false,
        booked: {
          ref: booked.ref,
          startsAt: booked.starts_at,
          endsAt: booked.ends_at,
        },
      },
      () => window.scrollTo(0, 0),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirming, booked, setState]);

  useEffect(() => {
    if (!confirming) return;

    const timer = window.setTimeout(
      () => setState({ payKind: "pending", payError: PAY_ERRORS.pending }),
      CONFIRM_WAIT_MS,
    );

    return () => window.clearTimeout(timer);
  }, [confirming, setState]);

  const fail = (payKind: string, payError = PAY_ERRORS.network) =>
    setState({ paying: false, payKind, payError });

  const checkout = async (request: CheckoutRequest) => {
    try {
      return (await startCheckout(request).unwrap()).clientSecret;
    } catch (error) {
      const code = getErrorMessage(error);

      if (code === "already_paid") setState({ confirming: true });
      else
        setState({
          paying: false,
          ...getCheckoutError(code, stateRef.current.time),
        });

      return null;
    } finally {
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  };

  const pay = async (stripe: Stripe, elements: StripeElements) => {
    const request =
      turnstileToken &&
      getCheckoutRequest(stateRef.current, point, turnstileToken);

    if (!request) return false;

    setState({ paying: true, payError: "", payKind: "" });

    const { error: cardError } = await elements.submit();

    if (cardError) {
      fail("card", cardError.message);

      return false;
    }

    const clientSecret = await checkout(request);

    if (!clientSecret) return false;

    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      fail("declined", error.message);

      return false;
    }

    setState({ confirming: true });

    return true;
  };

  return {
    turnstileRef,
    hasTurnstileToken: !!turnstileToken,
    onTurnstileToken: setTurnstileToken,
    payDisabled: state.paying || !turnstileToken,
    pay,
  };
};
