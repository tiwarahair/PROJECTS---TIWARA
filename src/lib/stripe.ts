import { loadStripe } from "@stripe/stripe-js";

/** Stripe.js, loaded once with the booking page. */
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
);
