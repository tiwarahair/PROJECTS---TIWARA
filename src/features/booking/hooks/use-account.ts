import type { MutableRefObject } from "react";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useNavigate } from "react-router";
import { useSavedAddresses } from "../../../hooks/use-saved-addresses";
import { useIdentity } from "../../../hooks/use-identity";
import { startGoogleSignIn } from "../../../lib/auth";
import { useUpdateProfileMutation } from "../../../stores/api-slice";
import { useAppDispatch } from "../../../stores/hooks";
import { logOut as logOutSession } from "../../../stores/session-slice";
import { writeSession } from "../../../utils/page-flags";
import { getScreenPath } from "../../onboarding/routes";
import { getContactChanges } from "../logic/details";
import { saveDraft } from "../logic/draft";
import { focusLater } from "../logic/focus";
import { getSavedAddressPatch } from "../logic/state";
import type { Details } from "../logic/types";
import type { FlowState } from "./use-flow-state";

interface AccountOptions {
  flow: FlowState;
  detailsForm: UseFormReturn<Details>;
  isLeaving: MutableRefObject<boolean>;
  stylistId: string;
}

export const useAccount = ({
  flow,
  detailsForm,
  isLeaving,
  stylistId,
}: AccountOptions) => {
  const { state, stateRef, setState, scrollToTitle } = flow;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const identity = useIdentity();
  const hasSession = !!identity;
  const signedIn = identity?.isLoaded ? identity : null;
  const [updateProfile] = useUpdateProfileMutation();
  const savedAddresses = useSavedAddresses();

  // signed in: book as them, with their details filled in
  useEffect(() => {
    if (!signedIn) return;

    const { first, last, email, mobile } = signedIn;

    detailsForm.reset({
      ...detailsForm.getValues(),
      first,
      last,
      email,
      phone: mobile,
    });

    const { step, loginStart } = stateRef.current;
    const isLeavingTime = !!loginStart && step === 3;

    setState(
      {
        loggedIn: true,
        editContact: false,
        loginStart: null,
        step: isLeavingTime ? 4 : step,
      },
      isLeavingTime ? scrollToTitle : undefined,
    );
    // once per signed-in account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn?.user.id, setState]);

  // the default fills an empty appointment address once, when the addresses first arrive; a refetch keeps the client's choice
  useEffect(() => {
    if (!signedIn) return;

    setState(({ appointmentAddress, saved }) =>
      appointmentAddress.line1 || saved.length
        ? { saved: savedAddresses }
        : getSavedAddressPatch(appointmentAddress, savedAddresses),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn?.user.id, savedAddresses, setState]);

  const saveContactToAccount = () => {
    if (!signedIn) return;

    const patch = getContactChanges(detailsForm.getValues(), signedIn);

    if (!Object.keys(patch).length) return;

    updateProfile({ userId: signedIn.user.id, patch })
      .unwrap()
      .catch(() => undefined);
  };

  const loginReturn = `/book?stylist=${stylistId}&resume=1`;

  const prepareLoginRedirect = () => {
    const current = stateRef.current;

    saveDraft(
      current.loginStart && current.step === 3
        ? { ...current, step: 4 }
        : current,
    );

    writeSession("tw_return", loginReturn);
    isLeaving.current = true;
    navigate(loginReturn, { replace: true });
  };

  const actions = {
    logOut: () => {
      dispatch(logOutSession());

      detailsForm.reset({
        ...detailsForm.getValues(),
        first: "",
        last: "",
        email: "",
        phone: "",
      });

      setState({ loggedIn: false, guest: false, editContact: false });
    },
    openContactEdit: () => {
      setState({ editContact: true });
      focusLater("bk-first");
    },
    cancelContactEdit: () => {
      if (signedIn)
        detailsForm.reset({
          ...detailsForm.getValues(),
          first: signedIn.first,
          last: signedIn.last,
          phone: signedIn.mobile,
        });

      setState({ editContact: false });
    },
    openLogin: () => setState({ loginStart: "email" }),
    closeLogin: () => setState({ loginStart: null }),
    continueAsGuestWith: (email: string) => {
      if (email) detailsForm.setValue("email", email);

      setState(
        ({ step }) => ({
          guest: true,
          loginStart: null,
          step: step === 3 ? 4 : step,
        }),
        scrollToTitle,
      );

      focusLater("bk-first");
    },
    leaveForLogin: (screen: string) => {
      prepareLoginRedirect();

      navigate(
        `${getScreenPath(screen)}?screen=${screen}&return=${encodeURIComponent(loginReturn)}`,
      );
    },
    googleLogin: async () => {
      prepareLoginRedirect();

      try {
        await startGoogleSignIn(false);
      } catch (error) {
        isLeaving.current = false;
        throw error;
      }
    },
  };

  return {
    hasSession,
    needsMobile: state.loggedIn && !!signedIn && !signedIn.mobile,
    showContactFields: state.loggedIn ? state.editContact : true,
    saveContactToAccount,
    actions,
  };
};
