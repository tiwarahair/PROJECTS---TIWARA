// "Get paid: 2FA, tax details and Stripe" and the two-step verification flow (prototype tfOpen / tf in renderVals).
import type { ChangeEvent } from "react";
import type {
  TaxDetails,
  TaxFixture,
} from "../../components/tax-details-form/tax-details-logic";
import { getQrCells } from "./studio-format";
import type { StudioController } from "./use-studio";

const WRONG_CODE =
  "That code isn’t right. Enter the latest code from your app.";

export const getTwoFactorView = (studio: StudioController) => {
  const { state, setState, isWide, actions } = studio;
  const flow = state.twoFactor;

  if (!flow) return null;

  const { closeTwoFactor, setTwoFactor } = actions;
  const devices = state.twoFactorSettings?.devices || [];
  const isOn = devices.length > 0;
  const isStripe = !!state.check.stripe;
  const { step } = flow;
  const isBackup = flow.kind === "backup";
  const main = devices.find(({ backup }) => !backup) || devices[0];

  const getOption = (key: string) => ({
    isOn: flow.option === key,
    pick: () => setTwoFactor({ option: key }),
  });

  const toStripe = () => {
    closeTwoFactor();
    window.setTimeout(() => actions.openSheet("stripe"), 170);
  };

  const getAppTitle = () => {
    if (!isBackup) return "Set up your authenticator app";

    return flow.option === "pm"
      ? "Add a password manager"
      : "Add another phone or tablet";
  };

  const titles: Record<string, string> = {
    secure: "Get paid: 2FA, tax details and Stripe",
    tax: "Tax details",
    learn: "Tax reporting to HMRC",
    taxcode: "Enter your 6-digit code",
    method: "Turn on two‑step verification",
    app: getAppTitle(),
    backup: "Add a backup",
    done: "Two‑step verification is on",
    remove: `Remove ${flow.name}?`,
  };

  const mainName = main ? main.name : "your app";

  const subtitles: Record<string, string> = {
    secure: "Secure your account and set up payouts. Takes about 5 minutes.",
    tax: "We’re required to collect this for tax reporting.",
    learn: "",
    taxcode:
      "Enter a code from your authenticator app to edit your tax details.",
    method: "Choose how you’ll get a code each time you sign in.",
    app: "Scan the QR code with your authenticator app, then enter the 6-digit code it shows.",
    backup: "If you lose your phone, you’ll use this to log in.",
    done: `You’ll enter a code from ${mainName} each time you sign in.`,
    remove: "Enter a code from your authenticator app to confirm.",
  };

  const { tax } = state;

  const getTaxSubtitle = () => {
    if (tax) return tax.kind === "ltd" ? tax.companyName : tax.legalName;

    return isOn
      ? "For HMRC reporting. Takes about 2 minutes."
      : "Turn on two-step verification first";
  };

  const getStripeSubtitle = () => {
    if (isStripe) return "Connected";

    return tax
      ? "Bank details and ID, so you can take deposits"
      : "Add your tax details first";
  };

  const getDoneLabel = () => {
    if (flow.flow !== "setup" || (tax && isStripe)) return "Done";

    return tax ? "Continue to Stripe" : "Continue to tax details";
  };

  return {
    isWide,
    isOut: state.twoFactorOut,
    close: closeTwoFactor,
    step,
    isTax: step === "tax",
    isLearn: step === "learn",
    isTaxCode: step === "taxcode",
    taxFixture: (flow.fixture || "") as TaxFixture,
    parts: [
      {
        key: "p1",
        stepNumber: "1",
        label: "Two-step verification",
        isDone: isOn,
        subtitle: isOn
          ? `On · ${devices.map(({ name }) => name).join(", ")}`
          : "A code from your phone each time you sign in",
        buttonLabel: "Turn on",
        onSelect: () => setTwoFactor({ step: "method" }),
        isUnlocked: true,
      },
      {
        key: "p2",
        stepNumber: "2",
        label: "Tax details",
        isDone: !!tax,
        subtitle: getTaxSubtitle(),
        buttonLabel: "Add",
        onSelect: () => setTwoFactor({ step: "tax" }),
        isUnlocked: isOn,
      },
      {
        key: "p3",
        stepNumber: "3",
        label: "Get paid with Stripe",
        isDone: isStripe,
        subtitle: getStripeSubtitle(),
        buttonLabel: "Connect",
        onSelect: toStripe,
        isUnlocked: isOn && !!tax,
      },
    ],
    isProgressShown:
      flow.flow === "setup" && step !== "done" && step !== "learn",
    progress: `${[isOn, !!tax, isStripe].filter(Boolean).length} of 3 done`,
    isFinishLater: step === "tax" && flow.flow === "setup",
    isCloseShown: step !== "done" && !(step === "tax" && flow.flow === "setup"),
    hasLearn: step === "tax",
    openLearn: () => setTwoFactor({ step: "learn", from: "tax" }),
    learnLabel: flow.from === "tax" ? "Back to tax details" : "Close",
    learnGo: () => {
      if (flow.from === "tax") setTwoFactor({ step: "tax" });
      else closeTwoFactor();
    },
    taxSubmit: (value: TaxDetails) => {
      setState({ tax: value });
      actions.showToast("Tax details saved");
      actions.checkDone();

      if (isStripe) closeTwoFactor();
      else toStripe();
    },
    taxCodeGo: () => {
      if ((flow.code || "").length < 6)
        return setTwoFactor({
          error: "code",
          errorMessage: "Enter the 6-digit code",
        });

      if (flow.code !== "123456")
        return setTwoFactor({ error: "code", errorMessage: WRONG_CODE });

      closeTwoFactor();
      setState({ taxEdit: true });
    },
    isSecure: step === "secure",
    isMethod: step === "method",
    isApp: step === "app",
    isBackupStep: step === "backup",
    isDone: step === "done",
    isRemove: step === "remove",
    title: titles[step] || "",
    subtitle: subtitles[step] || "",
    isCentred: step === "done",
    canBack:
      step === "app" ||
      (step === "method" && flow.flow === "setup") ||
      (step === "tax" && flow.flow === "setup") ||
      (step === "learn" && flow.from === "tax"),
    back: () => {
      if (step === "app")
        setTwoFactor({
          step: isBackup ? "backup" : "method",
          error: "",
          errorMessage: "",
          code: "",
        });
      else if (step === "learn") setTwoFactor({ step: "tax" });
      else setTwoFactor({ step: "secure" });
    },
    toApp: () =>
      setTwoFactor({
        step: "app",
        kind: "main",
        name: "Main phone",
        code: "",
        error: "",
        errorMessage: "",
        keyShown: false,
      }),
    name: flow.name,
    onName: (event: ChangeEvent<HTMLInputElement>) =>
      setTwoFactor(
        flow.error === "name"
          ? { name: event.target.value, error: "", errorMessage: "" }
          : { name: event.target.value },
      ),
    isNameError: flow.error === "name",
    isCodeError: flow.error === "code",
    errorMessage: flow.errorMessage || "",
    code: flow.code,
    onCode: (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.replace(/\D/g, "").slice(0, 6);

      setTwoFactor(
        flow.error === "code"
          ? { code: value, error: "", errorMessage: "" }
          : { code: value },
      );
    },
    isKeyOn: !!flow.keyShown,
    toggleKey: () => setTwoFactor({ keyShown: !flow.keyShown }),
    copyKey: () => {
      try {
        void navigator.clipboard.writeText("JBSWY3DPEHPK3PXPK4ZX");
      } catch {
        // clipboard not available; the toast still confirms
      }

      actions.showToast("Key copied");
    },
    isOpenAppShown: !isWide,
    openApp: () => actions.showToast("Opening your authenticator app"),
    qrCells: getQrCells(),
    verify: actions.verifyTwoFactor,
    verifyLabel: isBackup ? "Add backup" : "Turn on",
    optionDevice: getOption("device"),
    optionManager: getOption("pm"),
    addBackup: () =>
      setTwoFactor({
        step: "app",
        kind: "backup",
        name: flow.option === "pm" ? "Password manager" : "Backup phone",
        code: "",
        error: "",
        errorMessage: "",
        keyShown: false,
        skipWarn: false,
      }),
    isSkipShown: flow.flow !== "add",
    isSkipWarn: !!flow.skipWarn,
    skip: () => {
      if (!flow.skipWarn) setTwoFactor({ skipWarn: true });
      else setTwoFactor({ step: "done", skipWarn: false });
    },
    doneLabel: getDoneLabel(),
    doneGo: () => {
      if (flow.flow === "setup" && !tax) setTwoFactor({ step: "tax" });
      else if (flow.flow === "setup" && !isStripe) toStripe();
      else closeTwoFactor();
    },
    removeGo: actions.removeTwoFactorDevice,
  };
};

export type TwoFactorView = NonNullable<ReturnType<typeof getTwoFactorView>>;
