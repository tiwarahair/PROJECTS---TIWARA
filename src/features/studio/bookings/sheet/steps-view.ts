import type { SheetContext } from "./context";
import { OFF_MAIN_STEPS, SUB_STEPS } from "./types";

export const getStepsView = ({ studio, state, setState }: SheetContext) => {
  const step = state.bookingStep;

  return {
    isView: step === "view",
    isMain:
      !OFF_MAIN_STEPS.includes(step) &&
      !(!studio.isWide && (step === "checkout" || step === "noshow")),
    backToView: () => {
      const to = SUB_STEPS.includes(step) ? "editsvc" : "view";

      setState({ bookingStepOut: true });

      window.setTimeout(
        () =>
          setState({
            bookingStepOut: false,
            bookingStepBack: to === "view",
            bookingStep: to,
          }),
        200,
      );

      if (to === "view")
        window.setTimeout(() => setState({ bookingStepBack: false }), 700);
    },
  };
};
