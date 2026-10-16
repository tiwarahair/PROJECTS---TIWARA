import { confirmBooking, saveNewClient } from "./confirm";
import type { AddContext } from "./context";
import { LAST_STEP } from "./types";

const getBackPatch = ({ state, addNew, isProtectionSkipped }: AddContext) => {
  const { addStep } = state;

  if (addStep === 2 && state.addAddonPickerOpen)
    return { addAddonPickerOpen: false };

  if (addStep === 2 && state.addEditService) return { addEditService: false };

  if (addNew) return { addNew: null };

  return {
    addStep:
      addStep === 5 && isProtectionSkipped ? 3 : Math.max(1, addStep - 1),
  };
};

const goNext = (context: AddContext) => {
  const { state, setState, addNew, isDisabled, isProtectionSkipped } = context;
  const { addStep } = state;

  if (isDisabled) return;

  if (addStep === 2 && state.addAddonPickerOpen)
    return setState({ addAddonPickerOpen: false });

  if (addStep === 2 && state.addEditService)
    return setState({ addEditService: false, addStep: 3 });

  if (addStep === 1 && addNew) return saveNewClient(context, addNew);

  if (addStep < LAST_STEP)
    return setState({
      addStep: addStep === 3 && isProtectionSkipped ? 5 : addStep + 1,
    });

  confirmBooking(context);
};

export const getStepsView = (context: AddContext) => {
  const { state, setState, addNew, isDisabled, isProtectionSkipped } = context;
  const { addStep } = state;

  return {
    steps: Array.from(
      { length: isProtectionSkipped ? 4 : 5 },
      (_slot, index) => index + 1,
    ).map((step) => ({
      key: step,
      isOn: addStep >= (step === 4 && isProtectionSkipped ? 5 : step),
    })),
    isStep1: addStep === 1,
    isStep3: addStep === 3,
    isStep4: addStep === 4 && !isProtectionSkipped,
    isStep5: addStep === 5,
    // footer
    isDisabled,
    cta: addStep < LAST_STEP ? "Continue" : "Confirm booking",
    canBack: addStep > 1 || !!addNew,
    back: () => setState(getBackPatch(context)),
    next: () => goNext(context),
  };
};
