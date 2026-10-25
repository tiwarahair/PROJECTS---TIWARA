import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  confirmTwoFactorEnrolment,
  getSecondFactorStep,
  startTwoFactorEnrolment,
  verifySecondFactor,
} from "../../../lib/two-factor";
import type { TwoFactorEnrolment } from "../../../lib/two-factor";
import type { AppStepView } from "../../../components/two-factor/step-app";

type GateStep = "checking" | "setup" | "code" | "passed" | "failed";

interface GateState {
  step: GateStep;
  name: string;
  code: string;
  error: "" | "name" | "code";
  errorMessage: string;
  enrolment: TwoFactorEnrolment | null;
  isEnrolmentFailed: boolean;
  isKeyOn: boolean;
  isKeyCopied: boolean;
  isBusy: boolean;
}

const INITIAL: GateState = {
  step: "checking",
  name: "Main phone",
  code: "",
  error: "",
  errorMessage: "",
  enrolment: null,
  isEnrolmentFailed: false,
  isKeyOn: false,
  isKeyCopied: false,
  isBusy: false,
};

const WRONG_CODE = "That code isn’t right. Try the newest one in your app.";

/** Admin's two-step check: set an app up, or enter a code, before anything in Admin loads. */
export const useGate = (isPhone: boolean) => {
  const [state, setFullState] = useState(INITIAL);

  const setState = (patch: Partial<GateState>) =>
    setFullState((current) => ({ ...current, ...patch }));

  const enrol = () => {
    setState({ enrolment: null, isEnrolmentFailed: false });

    startTwoFactorEnrolment().then(
      (enrolment) => setState({ enrolment }),
      () => setState({ isEnrolmentFailed: true }),
    );
  };

  useEffect(() => {
    getSecondFactorStep().then(
      (step) => {
        setFullState((current) => ({ ...current, step }));

        if (step === "setup") enrol();
      },
      () => setFullState((current) => ({ ...current, step: "failed" })),
    );
  }, []);

  const onCode = ({ target }: ChangeEvent<HTMLInputElement>) =>
    setState({
      code: target.value.replace(/\D/g, "").slice(0, 6),
      error: "",
      errorMessage: "",
    });

  const checkCode = () => {
    if (state.code.length === 6) return true;

    setState({ error: "code", errorMessage: "Enter the 6-digit code" });

    return false;
  };

  const finish = (isRight: boolean) =>
    setState(
      isRight
        ? { isBusy: false, step: "passed" }
        : { isBusy: false, error: "code", errorMessage: WRONG_CODE },
    );

  const verifySetup = () => {
    if (!state.name.trim())
      return setState({ error: "name", errorMessage: "Name this device" });

    if (!checkCode() || !state.enrolment) return;

    setState({ isBusy: true });

    confirmTwoFactorEnrolment(
      state.enrolment.factorId,
      state.code,
      state.name.trim(),
    ).then(finish, () => finish(false));
  };

  const verifyCode = () => {
    if (!checkCode()) return;

    setState({ isBusy: true });
    verifySecondFactor(state.code).then(finish, () => finish(false));
  };

  const appView: AppStepView = {
    name: state.name,
    onName: ({ target }) =>
      setState({ name: target.value, error: "", errorMessage: "" }),
    isNameError: state.error === "name",
    isCodeError: state.error === "code",
    errorMessage: state.errorMessage,
    code: state.code,
    onCode,
    isKeyOn: state.isKeyOn,
    toggleKey: () => setState({ isKeyOn: !state.isKeyOn }),
    keyText: (state.enrolment?.secret ?? "").replace(/(.{4})(?=.)/g, "$1 "),
    isKeyCopied: state.isKeyCopied,
    copyKey: () =>
      void navigator.clipboard
        ?.writeText(state.enrolment?.secret ?? "")
        .then(() => setState({ isKeyCopied: true })),
    isOpenAppShown: isPhone,
    appLink: state.enrolment?.uri ?? "",
    openApp: () => null,
    qrImage: state.enrolment?.qrCode ?? "",
    isQrLoading: !state.enrolment && !state.isEnrolmentFailed,
    isQrFailed: state.isEnrolmentFailed,
    retryQr: enrol,
    isBusy: state.isBusy,
    verify: verifySetup,
    verifyLabel: "Turn on",
    isVerified: false,
    isSetUp: false,
    toBackup: () => undefined,
  };

  return { step: state.step, appView, verifyCode };
};
