import type { CSSProperties } from "react";
import { ActionMenu } from "../../../components/action-menu";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
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
  const { state, setState, context } = studio;
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
    <ConfirmDialog
      title={confirm.title || "Are you sure you want to remove?"}
      emphasis={confirm.emphasis}
      body={confirm.body}
      yesLabel={confirm.yesLabel || "Remove"}
      noLabel={confirm.noLabel || "Keep it"}
      onYes={() => confirm.yes()}
      onNo={onNo}
      isClosing={!!state.confirmOut}
      isBlocking={confirm.isBlocking}
    />
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
