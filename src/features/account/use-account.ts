import { getEditActions } from "./edit-actions";
import { getSaveActions } from "./save-actions";
import type { AccountProps } from "./state";
import { useAccountCore } from "./use-account-core";
import { useAccountDialogs } from "./use-account-dialogs";
import { useAccountFeedback } from "./use-account-feedback";
import { useAccountNavigation } from "./use-account-navigation";

export const useAccount = (props: AccountProps) => {
  const core = useAccountCore(props);
  const feedback = useAccountFeedback(core);
  const { goToSection } = useAccountNavigation(core, feedback);
  const { openDialog, closeDialog } = useAccountDialogs(core, feedback);
  const edits = getEditActions(core, feedback);
  const saves = getSaveActions(core, feedback);
  const { state, refs, forms, setState, sessionLoggedIn } = core;

  return {
    state,
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
      checkCode: edits.checkCode,
      setCode: edits.setCode,
      fillCode: edits.fillCode,
      pasteCode: edits.pasteCode,
      codeKey: edits.codeKey,
      savePassword: saves.savePassword,
      saveCard: saves.saveCard,
      saveAddress: saves.saveAddress,
      setAddresses: saves.setAddresses,
      onPhoto: saves.onPhoto,
      copy: saves.copy,
      endSession: saves.endSession,
      logout: saves.logout,
    },
  };
};

export type AccountController = ReturnType<typeof useAccount>;
