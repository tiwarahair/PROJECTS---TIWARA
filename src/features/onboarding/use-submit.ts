// What each onboarding screen sends to the server, and where it goes next.
import { useEffect } from "react";
import { getSignedInAccount, signOut, startGoogleSignIn } from "../../lib/auth";
import { getSubmitActions } from "./submit-actions";
import type { SubmitCore } from "./submit-actions";
import { getSubmitValid } from "./submit-screens";
import { useResend } from "./use-resend";

export const useOnboardingSubmit = (core: SubmitCore) => {
  const {
    stateRef,
    setState,
    goTo,
    startFlow,
    formApi: { getValues, reset, handleSubmit },
  } = core;

  const actions = getSubmitActions(core);
  const { run, finish, afterProAuth, toStudio, createStylist } = actions;
  const { sendAgain, resend } = useResend(core);
  const submitValid = getSubmitValid(core, actions, resend);

  const submit = () => {
    const { busy, lockedUntil } = stateRef.current;

    if (busy || lockedUntil > Date.now()) return;

    void handleSubmit(submitValid)();
  };

  /** Google redirects away; the return lands on /login?flow=social(-pro). */
  const socialSignIn = (isPro: boolean) => run(() => startGoogleSignIn(isPro));

  // back from Google: stylists go on to 2FA, new customers finish their profile
  useEffect(() => {
    if (startFlow !== "social" && startFlow !== "social-pro") return;

    run(async () => {
      const account = await getSignedInAccount();

      // no session: they backed out at Google, so just show the chooser
      if (!account) return setState({ busy: false });

      reset({ ...getValues(), ...account });

      if (startFlow === "social-pro") {
        if (account.isStylist) return afterProAuth();

        await signOut();

        return setState(
          { busy: false, serverErrors: { noBusiness: true } },
          () => goTo("pro-email"),
        );
      }

      if (account.hasProfile || account.isStylist)
        return finish("customer-login");

      setState({ audience: "customer", socialProvider: "google" }, () =>
        goTo("cust-social"),
      );
    });
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { submit, resend, sendAgain, socialSignIn, toStudio, createStylist };
};
