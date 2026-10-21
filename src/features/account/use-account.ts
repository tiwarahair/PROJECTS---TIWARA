import { getEditActions } from "./edit-actions";
import { getEmailActions } from "./email-actions";
import { getSaveActions } from "./save-actions";
import type { AccountProps } from "./state";
import { useAccountCore } from "./use-core";
import { useAccountDialogs } from "./use-dialogs";
import { useAccountFeedback } from "./use-feedback";
import { useAccountNavigation } from "./use-navigation";

export const useAccount = (props: AccountProps) => {
  const core = useAccountCore(props);
  const feedback = useAccountFeedback(core);
  const { goToSection } = useAccountNavigation(core, feedback);
  const { openDialog, closeDialog } = useAccountDialogs(core, feedback);
  const email = getEmailActions(core, feedback);
  const edits = getEditActions(core, feedback, email);
  const saves = getSaveActions(core, feedback);
  const { state, data, refs, forms, setState, sessionLoggedIn } = core;

  return {
    state,
    data,
    refs,
    forms,
    loggedIn: sessionLoggedIn && !state.loggedOut && !state.deleted,
    actions: {
      setState,
      goToSection,
      openDialog,
      closeDialog,
      focusLater: feedback.focusLater,
      showToast: feedback.showToast,
      startResendCountdown: feedback.startResendCountdown,
      stopResendCountdown: feedback.stopResendCountdown,
      saveEdit: edits.saveEdit,
      setCode: email.setCode,
      pasteCode: email.pasteCode,
      codeKey: email.codeKey,
      resendCodes: email.resendCodes,
      savePassword: saves.savePassword,
      sendPasswordCode: saves.sendPasswordCode,
      saveMarketing: saves.saveMarketing,
      finishCardSetup: saves.finishCardSetup,
      makeDefaultCard: saves.makeDefaultCard,
      removeSavedCard: saves.removeSavedCard,
      saveAddress: saves.saveAddress,
      makeDefaultAddress: saves.makeDefaultAddress,
      removeAddress: saves.removeAddress,
      onPhoto: saves.onPhoto,
      copy: saves.copy,
      endSession: saves.endSession,
      logout: saves.logout,
    },
  };
};

export type AccountController = ReturnType<typeof useAccount>;
