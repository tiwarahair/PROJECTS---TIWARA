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
  const flow = state.tf;
  if (!flow) return null;
  const { closeTf, setTf } = actions;
  const devices = state.tfa?.devices || [];
  const isOn = devices.length > 0;
  const isStripe = !!state.check.stripe;
  const { step } = flow;
  const isBackup = flow.kind === "backup";
  const main = devices.find(({ backup }) => !backup) || devices[0];
  const getOption = (key: string) => ({
    isOn: flow.opt === key,
    pick: () => setTf({ opt: key }),
  });
  const toStripe = () => {
    closeTf();
    window.setTimeout(() => actions.openSheet("stripe"), 170);
  };
  const titles: Record<string, string> = {
    secure: "Get paid: 2FA, tax details and Stripe",
    tax: "Tax details",
    learn: "Tax reporting to HMRC",
    taxcode: "Enter your 6-digit code",
    method: "Turn on two‑step verification",
    app: isBackup
      ? flow.opt === "pm"
        ? "Add a password manager"
        : "Add another phone or tablet"
      : "Set up your authenticator app",
    backup: "Add a backup",
    done: "Two‑step verification is on",
    remove: "Remove " + flow.name + "?",
  };
  const subs: Record<string, string> = {
    secure: "Secure your account and set up payouts. Takes about 5 minutes.",
    tax: "We’re required to collect this for tax reporting.",
    learn: "",
    taxcode:
      "Enter a code from your authenticator app to edit your tax details.",
    method: "Choose how you’ll get a code each time you sign in.",
    app: "Scan the QR code with your authenticator app, then enter the 6-digit code it shows.",
    backup: "If you lose your phone, you’ll use this to log in.",
    done:
      "You’ll enter a code from " +
      (main ? main.name : "your app") +
      " each time you sign in.",
    remove: "Enter a code from your authenticator app to confirm.",
  };
  const { tax } = state;
  return {
    isWide,
    isOut: state.tfOut,
    close: closeTf,
    step,
    isTax: step === "tax",
    isLearn: step === "learn",
    isTaxCode: step === "taxcode",
    taxFixture: (flow.fx || "") as TaxFixture,
    parts: [
      {
        key: "p1",
        n: "1",
        label: "Two-step verification",
        isDone: isOn,
        sub: isOn
          ? "On · " + devices.map(({ name }) => name).join(", ")
          : "A code from your phone each time you sign in",
        buttonLabel: "Turn on",
        go: () => setTf({ step: "method" }),
        isUnlocked: true,
      },
      {
        key: "p2",
        n: "2",
        label: "Tax details",
        isDone: !!tax,
        sub: tax
          ? tax.kind === "ltd"
            ? tax.coName
            : tax.legalName
          : isOn
            ? "For HMRC reporting. Takes about 2 minutes."
            : "Turn on two-step verification first",
        buttonLabel: "Add",
        go: () => setTf({ step: "tax" }),
        isUnlocked: isOn,
      },
      {
        key: "p3",
        n: "3",
        label: "Get paid with Stripe",
        isDone: isStripe,
        sub: isStripe
          ? "Connected"
          : tax
            ? "Bank details and ID, so you can take deposits"
            : "Add your tax details first",
        buttonLabel: "Connect",
        go: toStripe,
        isUnlocked: isOn && !!tax,
      },
    ],
    isProgressShown:
      flow.flow === "setup" && step !== "done" && step !== "learn",
    progress: [isOn, !!tax, isStripe].filter(Boolean).length + " of 3 done",
    isFinishLater: step === "tax" && flow.flow === "setup",
    isCloseShown: step !== "done" && !(step === "tax" && flow.flow === "setup"),
    hasLearn: step === "tax",
    openLearn: () => setTf({ step: "learn", from: "tax" }),
    learnLabel: flow.from === "tax" ? "Back to tax details" : "Close",
    learnGo: () => {
      if (flow.from === "tax") setTf({ step: "tax" });
      else closeTf();
    },
    taxSubmit: (value: TaxDetails) => {
      setState({ tax: value });
      actions.toastMsg("Tax details saved");
      actions.checkDone();
      if (isStripe) closeTf();
      else toStripe();
    },
    taxCodeGo: () => {
      if ((flow.code || "").length < 6)
        return setTf({ err: "code", errMsg: "Enter the 6-digit code" });
      if (flow.code !== "123456")
        return setTf({ err: "code", errMsg: WRONG_CODE });
      closeTf();
      setState({ taxEdit: true });
    },
    isSecure: step === "secure",
    isMethod: step === "method",
    isApp: step === "app",
    isBackupStep: step === "backup",
    isDone: step === "done",
    isRemove: step === "remove",
    title: titles[step] || "",
    sub: subs[step] || "",
    isCentred: step === "done",
    canBack:
      step === "app" ||
      (step === "method" && flow.flow === "setup") ||
      (step === "tax" && flow.flow === "setup") ||
      (step === "learn" && flow.from === "tax"),
    back: () => {
      if (step === "app")
        setTf({
          step: isBackup ? "backup" : "method",
          err: "",
          errMsg: "",
          code: "",
        });
      else if (step === "learn") setTf({ step: "tax" });
      else setTf({ step: "secure" });
    },
    toApp: () =>
      setTf({
        step: "app",
        kind: "main",
        name: "Main phone",
        code: "",
        err: "",
        errMsg: "",
        keyOn: false,
      }),
    name: flow.name,
    onName: (event: ChangeEvent<HTMLInputElement>) =>
      setTf(
        flow.err === "name"
          ? { name: event.target.value, err: "", errMsg: "" }
          : { name: event.target.value },
      ),
    isNameError: flow.err === "name",
    isCodeError: flow.err === "code",
    errMsg: flow.errMsg || "",
    code: flow.code,
    onCode: (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.replace(/\D/g, "").slice(0, 6);
      setTf(
        flow.err === "code"
          ? { code: value, err: "", errMsg: "" }
          : { code: value },
      );
    },
    isKeyOn: !!flow.keyOn,
    toggleKey: () => setTf({ keyOn: !flow.keyOn }),
    copyKey: () => {
      try {
        void navigator.clipboard.writeText("JBSWY3DPEHPK3PXPK4ZX");
      } catch {
        // clipboard not available; the toast still confirms
      }
      actions.toastMsg("Key copied");
    },
    isOpenAppShown: !isWide,
    openApp: () => actions.toastMsg("Opening your authenticator app"),
    qr: getQrCells(),
    verify: actions.tfVerify,
    verifyLabel: isBackup ? "Add backup" : "Turn on",
    optionDevice: getOption("device"),
    optionManager: getOption("pm"),
    addBackup: () =>
      setTf({
        step: "app",
        kind: "backup",
        name: flow.opt === "pm" ? "Password manager" : "Backup phone",
        code: "",
        err: "",
        errMsg: "",
        keyOn: false,
        skipWarn: false,
      }),
    isSkipShown: flow.flow !== "add",
    isSkipWarn: !!flow.skipWarn,
    skip: () => {
      if (!flow.skipWarn) setTf({ skipWarn: true });
      else setTf({ step: "done", skipWarn: false });
    },
    doneLabel:
      flow.flow !== "setup" || (tax && isStripe)
        ? "Done"
        : !tax
          ? "Continue to tax details"
          : "Continue to Stripe",
    doneGo: () => {
      if (flow.flow === "setup" && !tax) setTf({ step: "tax" });
      else if (flow.flow === "setup" && !isStripe) toStripe();
      else closeTf();
    },
    removeGo: actions.tfRemove,
  };
};

export type TwoFactorView = NonNullable<ReturnType<typeof getTwoFactorView>>;
