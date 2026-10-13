// Onboarding's ?fixture= board states (dev-only).
import type { OnboardingForm, StartState } from "./onboarding-state";

const PASSWORD_FIXTURES: Record<string, string> = {
  "pw-empty": "",
  "pw-short": "sunflower9",
  "pw-blocked": "AmaMensah2026",
  "pw-common": "password1",
  "pw-site": "TiwarasHouse!",
  "pw-pass": "Ama Mensah 2026!kkkkkkkk",
  "pw-good": "sunflower house",
  "pw-strong": "orbit-velvet-ochre-tulip-47",
  "pw-repeat": "aaaaaaaaaaaaaaaaaaa",
};

export const getFixturePatch = (
  key: string,
  baseForm: OnboardingForm,
): Partial<StartState> => {
  const form = { ...baseForm };

  const withForm = (patch: Partial<OnboardingForm>) =>
    Object.assign(form, patch);

  switch (key) {
    case "welcome":
      return { screen: "welcome", audience: "pro" };
    case "pro-2fa":
      withForm({ email: "amara@tiwarashouse.co.uk" });

      return { screen: "pro-2fa", form, codeKind: "2fa" };
    case "pro-2fa-backup":
      withForm({ email: "amara@tiwarashouse.co.uk" });

      return {
        screen: "pro-2fa",
        form,
        codeKind: "2fa",
        twoFaMethod: "backup",
      };
    case "pro-unknown":
      withForm({ email: "someone@example.com" });

      return { screen: "pro-email", form, serverErrors: { noBusiness: true } };
    case "wrong-password":
      withForm({ email: "nia.okafor@gmail.com", password: "sunflower" });

      return {
        screen: "cust-password",
        audience: "customer",
        form,
        serverErrors: {
          password: "That password isn’t right. Try again or reset it.",
        },
        shake: 1,
      };
    case "locked":
      withForm({ email: "nia.okafor@gmail.com" });

      return {
        screen: "cust-password",
        audience: "customer",
        form,
        serverErrors: {
          password: "Too many attempts. Try again in 15 minutes.",
        },
        lockedUntil: Date.now() + 9e5,
      };
    case "code-wrong":
      withForm({ email: "ama@example.com" });

      return {
        screen: "verify",
        form,
        code: ["1", "2", "3", "4", "5", "6"],
        codeError: "That code isn’t right",
        shake: 1,
      };
    case "code-expired":
      withForm({ email: "ama@example.com" });

      return {
        screen: "verify",
        form,
        codeError: "That code has expired. Send a new one.",
        resendIn: 0,
      };
    case "email-exists":
      withForm({
        first: "Nia",
        last: "Okafor",
        email: "amara@tiwarashouse.co.uk",
        mobile: "7700 900412",
        password: "sunflower9",
        terms: true,
        type: "home",
        businessName: "Nia Does Hair",
        categories: ["braids"],
      });

      return { screen: "w4", form, serverErrors: { exists: true } };
    case "w3-shop":
      withForm({
        type: "shop",
        businessName: "Crown & Coil",
        postcode: "M14 7NB",
        line1: "41 Claremont Road",
        city: "Manchester",
      });

      return {
        screen: "w3",
        form,
        addressOpen: true,
        geocodedLatLng: [53.4532, -2.2213],
        pinLatLng: null,
        area: "Rusholme, M14",
      };
    case "w3-home":
      withForm({
        type: "home",
        businessName: "Nia Does Hair",
        postcode: "M14 5TQ",
        line1: "12 Dickenson Road",
        city: "Manchester",
      });

      return {
        screen: "w3",
        form,
        addressOpen: true,
        geocodedLatLng: [53.4479, -2.2153],
        pinLatLng: null,
        area: "Rusholme, M14",
      };
    case "w3-mobile":
      withForm({
        type: "mobile",
        businessName: "Braids by Kemi",
        postcode: "M21 0BW",
        radius: 10,
      });

      return { screen: "w3", form };
    case "addr-notfound":
      withForm({ type: "shop", businessName: "Crown & Coil", postcode: "" });

      return {
        screen: "w3",
        form,
        addressOpen: false,
        addressFinderFixture: "nomatch",
      };
    case "w3-typing":
      withForm({ type: "shop", businessName: "Crown & Coil", postcode: "" });

      return {
        screen: "w3",
        form,
        addressOpen: false,
        addressFinderFixture: "typing",
      };
    case "w3-manual":
      withForm({
        type: "shop",
        businessName: "Crown & Coil",
        postcode: "M4 6AJ",
        line1: "14 Blossom Street",
        line2: "Unit 2",
        city: "Manchester",
      });

      return {
        screen: "w3",
        form,
        addressOpen: true,
        addressSource: "manual",
        geocodedLatLng: [53.484, -2.227],
        pinLatLng: null,
      };
    case "w2":
      withForm({ type: "shop", categories: ["braids", "natural", "locs"] });

      return { screen: "w2", form };
    case "w2-empty":
      withForm({ type: "shop", categories: [] });

      return { screen: "w2", form, touched: { categories: true } };
    case "w4-bizcontact":
      withForm({
        type: "shop",
        first: "Amara",
        last: "Okonkwo",
        email: "amara@example.com",
        mobile: "7700 900001",
        useContact: false,
      });

      return { screen: "w4", form };
    case "pro-pw-good":
      withForm({
        type: "shop",
        first: "Amara",
        last: "Okonkwo",
        email: "hello@tiwarashouse.co.uk",
        mobile: "7700 900418",
        password: "tide2lam",
        terms: true,
        useContact: true,
      });

      return { screen: "w4", audience: "newpro", form, passwordShown: true };
    case "reset-pw":
      withForm({
        email: "nia.okafor@gmail.com",
        password: "quiet river lamp",
        passwordConfirm: "",
      });

      return {
        screen: "forgot-reset",
        audience: "customer",
        form,
        passwordShown: true,
      };
    case "errors":
      withForm({ email: "ama@example.com", mobile: "12", password: "short" });

      return {
        screen: "cust-create",
        audience: "customer",
        form,
        touched: {
          first: true,
          last: true,
          mobile: true,
          password: true,
          terms: true,
        },
      };
    case "required-empty":
      withForm({ email: "" });

      return {
        screen: "cust-email",
        audience: "customer",
        form,
        touched: { email: true },
      };
    case "network":
      withForm({ email: "ama@example.com" });

      return {
        screen: "cust-email",
        audience: "customer",
        form,
        networkError: true,
      };
    case "reset-mismatch":
      withForm({ password: "sunflower9", passwordConfirm: "sunflower8" });

      return {
        screen: "forgot-reset",
        form,
        touched: { passwordConfirm: true },
      };
    case "pro-social-unknown":
      withForm({ email: "ama.studio@gmail.com" });

      return {
        screen: "pro-email",
        audience: "pro",
        form,
        serverErrors: { noBusiness: true },
      };
    case "pro-2fa-off":
      return { screen: "studio", audience: "pro" };
    case "pro-done":
      withForm({ first: "Ama" });

      return { screen: "pro-done", audience: "pro", form };
    case "cust-social":
      withForm({
        first: "Ama",
        last: "Mensah",
        email: "ama.mensah@gmail.com",
        mobile: "",
        terms: false,
        marketing: false,
      });

      return {
        screen: "cust-social",
        audience: "customer",
        socialProvider: "google",
        form,
      };
    case "cust-social-apple":
      withForm({
        first: "",
        last: "",
        email: "x7k2m9q4pd@privaterelay.appleid.com",
        mobile: "",
        terms: false,
        marketing: false,
      });

      return {
        screen: "cust-social",
        audience: "customer",
        socialProvider: "apple",
        form,
      };
    case "cust-social-error":
      withForm({
        first: "Ama",
        last: "Mensah",
        email: "ama.mensah@gmail.com",
        mobile: "7700 900123",
        terms: false,
        marketing: false,
      });

      return {
        screen: "cust-social",
        audience: "customer",
        socialProvider: "google",
        form,
        touched: { first: true, last: true, mobile: true, terms: true },
      };
    case "cust-toast":
      withForm({ first: "Nia", email: "nia.okafor@gmail.com" });

      return {
        screen: "cust-email",
        audience: "customer",
        form,
        toast: "Welcome back, Nia",
      };
    case "w5-picked":
      withForm({ referralSource: "Instagram" });

      return { screen: "w5", audience: "pro", form };
    case "turnstile":
      withForm({
        first: "Ama",
        last: "Mensah",
        email: "ama@example.com",
        password: "sunflower9",
        mobile: "7700 900123",
        terms: true,
      });

      return {
        screen: "cust-create",
        audience: "customer",
        form,
        turnstileMode: "challenge",
      };
  }

  if (key.startsWith("pw-")) {
    withForm({
      first: "Ama",
      last: "Mensah",
      email: "ama@example.com",
      mobile: "7700 900123",
      terms: true,
      password: PASSWORD_FIXTURES[key] || "",
    });

    return {
      screen: "cust-create",
      audience: "customer",
      form,
      touched: ["pw-blocked", "pw-common", "pw-site"].includes(key)
        ? { password: true }
        : {},
      passwordShown: key !== "pw-empty",
    };
  }

  return { screen: key };
};
