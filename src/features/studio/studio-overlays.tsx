import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { getDialogPlacement, getOverlayAnimation } from "./studio-overlay";
import type { StudioController } from "./use-studio";
import overlay from "../../styles/features/studio/studio-overlay.module.css";
import shell from "../../styles/features/studio/studio-shell.module.css";
import styles from "../../styles/features/studio/studio-overlays.module.css";

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
  const { actionSheet } = state;

  if (!actionSheet) return null;

  const anchor = actionSheet.anchor && isWide ? actionSheet.anchor : null;

  // runtime: the opener's position on screen
  const anchorStyle = anchor
    ? ({
        "--acts-top": `${anchor.top}px`,
        "--acts-right": `${anchor.right}px`,
        "--acts-bottom": `${anchor.bottom}px`,
        "--acts-left": `${anchor.left}px`,
      } as CSSProperties)
    : undefined;

  return (
    <>
      <div
        className={joinClassNames(
          styles.actsScrim,
          anchor && styles.actsScrimClear,
          state.actionSheetOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={actions.closeActionSheet}
      ></div>
      <div
        className={joinClassNames(
          styles.actsBox,
          anchor
            ? joinClassNames(
                anchor.bottom != null ? styles.actsAbove : styles.actsBelow,
                overlay.popIn,
              )
            : joinClassNames(
                styles.actsSheet,
                getDialogPlacement(isWide),
                getOverlayAnimation(state.actionSheetOut, "dialog", isWide),
              ),
        )}
        style={anchorStyle}
      >
        <div
          className={joinClassNames(
            styles.actsHead,
            anchor && styles.actsHeadHidden,
          )}
        >
          <div className={styles.grow}>
            <div className={styles.actsTitle}>{actionSheet.title}</div>
            <div className={styles.actsSub}>{actionSheet.subtitle}</div>
          </div>
          <button
            className={styles.closeButton}
            onClick={actions.closeActionSheet}
            aria-label="Close"
          >
            <X size={19} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.actsList}>
          {actionSheet.items.map(
            ({ label, icon: ItemIcon, disabled, danger, run }) => (
              <button
                key={label}
                className={joinClassNames(
                  styles.actsItem,
                  danger && styles.actsDanger,
                  disabled && styles.actsOff,
                )}
                onClick={() => {
                  if (disabled) return;

                  actions.closeActionSheet();
                  window.setTimeout(run, 180);
                }}
                disabled={!!disabled}
              >
                <ItemIcon
                  className={styles.noShrink}
                  size={17}
                  strokeWidth={1.7}
                />
                <span className={styles.grow}>{label}</span>
              </button>
            ),
          )}
        </div>
      </div>
    </>
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
        onClick={onNo}
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
        <div className={styles.confirmBody}>{confirm.body}</div>
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
