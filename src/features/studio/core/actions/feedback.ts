import { clear } from "./context";
import type { StudioContext } from "./context";

export const getTipX = ({ left, width }: DOMRect) =>
  Math.min(Math.max(left + width / 2, 128), window.innerWidth - 128);

export const createFeedbackActions = ({
  getState,
  setState,
  timers,
  memo,
}: StudioContext) => {
  const showToast = (message: string, undo?: () => void) => {
    clear(timers, "toast");
    setState({ toast: message, toastUndo: undo || null });

    timers.toast = window.setTimeout(
      () => setState({ toast: null, toastUndo: null }),
      undo ? 4200 : 2600,
    );
  };

  const isTouch = () =>
    memo.lastPointer === "touch" ||
    !!(window.matchMedia && window.matchMedia("(hover: none)").matches);

  const tipHide = () => {
    clear(timers, "tip");

    if (getState().tip) setState({ tip: null });
  };

  const listenForTipDismiss = () => {
    memo.tipListening = true;

    document.addEventListener(
      "keydown",
      (keyEvent) => {
        if (keyEvent.key === "Escape" && getState().tip)
          setState({ tip: null });
      },
      true,
    );

    document.addEventListener(
      "pointerdown",
      (pointerEvent) => {
        memo.lastPointer = pointerEvent.pointerType;
      },
      true,
    );
  };

  const tipShow = (
    event: { currentTarget: Element } | null | undefined,
    key: string,
    text: string,
    isBelow?: boolean,
  ) => {
    if (isTouch()) return;

    const element = event?.currentTarget;

    if (!element) return;

    clear(timers, "tip");

    if (!memo.tipListening) listenForTipDismiss();

    const show = () => {
      const rect = element.getBoundingClientRect();

      setState({
        tip: {
          key,
          text,
          x: getTipX(rect),
          y: isBelow ? rect.bottom : rect.top,
          below: !!isBelow,
        },
      });
    };

    if (getState().tip?.key === key) show();
    else timers.tip = window.setTimeout(show, 300);
  };

  const tipUpdate = (key: string, text: string) => {
    const tip = getState().tip;

    if (tip && tip.key === key) setState({ tip: { ...tip, text } });
  };

  return { showToast, isTouch, tipShow, tipHide, tipUpdate };
};
