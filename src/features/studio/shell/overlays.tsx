import type { CSSProperties } from "react";
import { ActionMenu } from "../../../components/action-menu";
import { joinClassNames } from "../../../utils/class-names";
import {
  getDialogPlacement,
  getOverlayAnimation,
} from "../../../components/overlay";
import type { StudioController } from "../core/use-studio";
import overlay from "../../../styles/components/overlay/index.module.css";
import shell from "../../../styles/features/studio/shell/index.module.css";
import styles from "../../../styles/features/studio/shell/overlays.module.css";

export const StudioTooltip = ({ studio }: { studio: StudioController }) => {
  const { tip } = studio.state;

  if (!tip) return null;

  // runtime: anchored to the hovered control
  const position = {
    "--tip-x": `${tip.x}px`,
    "--tip-y": `${tip.y}px`,
  } as CSSProperties;

  return (
    <div
      className={joinClassNames(
        shell.tipLayer,
        tip.below ? shell.tipBelow : shell.tipAbove,
      )}
      style={position}
    >
      <div className={shell.tip} role="tooltip">
        {tip.text}
      </div>
    </div>
  );
};

/** The "…" action menu: anchored under its opener on wide screens, a sheet otherwise. */
export const ActionsMenu = ({ studio }: { studio: StudioController }) => {
  const { state, isWide, actions } = studio;

  if (!state.actionSheet) return null;

  return (
    <ActionMenu
      menu={state.actionSheet}
      isWide={isWide}
      isClosing={!!state.actionSheetOut}
      onClose={actions.closeActionSheet}
    />
  );
};

export const ConfirmSheet = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, context } = studio;
  const { confirm } = state;

  if (!confirm) return null;

  const onNo = () => {
    if (confirm.onNo) {
      setState({ confirmOut: false });
      confirm.onNo();

      return;
    }

    setState({ confirmOut: true });
    window.clearTimeout(context.timers.confirm);

    context.timers.confirm = window.setTimeout(
      () => setState({ confirm: null, confirmOut: false }),
      210,
    );
  };

  return (
    <>
      <div
        className={joinClassNames(
          styles.confirmScrim,
          state.confirmOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={confirm.isBlocking ? undefined : onNo}
      ></div>
      <div
        className={joinClassNames(
          styles.confirmBox,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.confirmOut, "dialog", isWide),
        )}
      >
        <div className={styles.confirmTitle}>
          {confirm.title || "Are you sure you want to remove?"}
        </div>
        <div className={styles.confirmBody}>
          {confirm.emphasis && (
            <strong className={styles.confirmEmphasis}>
              {confirm.emphasis}
            </strong>
          )}
          {confirm.body}
        </div>
        <div className={styles.confirmActions}>
          <button className={styles.confirmNo} onClick={onNo}>
            {confirm.noLabel || "Keep it"}
          </button>
          <button className={styles.confirmYes} onClick={() => confirm.yes()}>
            {confirm.yesLabel || "Remove"}
          </button>
        </div>
      </div>
    </>
  );
};

export const StudioToast = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, context } = studio;

  if (!state.toast) return null;

  const undo = state.toastUndo;

  return (
    <div className={joinClassNames(styles.toast, isWide && styles.toastWide)}>
      <span className={styles.toastText}>{state.toast}</span>
      {undo && (
        <button
          className={styles.undo}
          onClick={() => {
            window.clearTimeout(context.timers.toast);
            setState({ toast: null, toastUndo: null });
            undo();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
};
