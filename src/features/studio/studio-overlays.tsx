import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { getDialogPlacement, getOverlayAnimation } from "./studio-overlay";
import type { StudioController } from "./use-studio";
import overlay from "./studio-overlay.module.css";
import shell from "./studio-shell.module.css";
import styles from "./studio-overlays.module.css";

export const StudioTooltip = ({ studio }: { studio: StudioController }) => {
  const { tip } = studio.state;
  if (!tip) return null;
  // runtime: anchored to the hovered control
  const position = {
    "--tip-x": tip.x + "px",
    "--tip-y": tip.y + "px",
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

/** The "…" action menu: anchored under its opener on wide screens, a sheet otherwise (prototype acts*). */
export const ActionsMenu = ({ studio }: { studio: StudioController }) => {
  const { state, isWide, actions } = studio;
  const { acts } = state;
  if (!acts) return null;
  const anchor = acts.anchor && isWide ? acts.anchor : null;
  // runtime: the opener's position on screen
  const anchorStyle = anchor
    ? ({
        "--acts-top": anchor.top + "px",
        "--acts-right": anchor.right + "px",
        "--acts-bottom": anchor.bottom + "px",
        "--acts-left": anchor.left + "px",
      } as CSSProperties)
    : undefined;
  return (
    <>
      <div
        className={joinClassNames(
          styles.actsScrim,
          anchor && styles.actsScrimClear,
          state.actsOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={actions.closeActs}
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
                getOverlayAnimation(state.actsOut, "dlg", isWide),
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
            <div className={styles.actsTitle}>{acts.title}</div>
            <div className={styles.actsSub}>{acts.sub}</div>
          </div>
          <button
            className={styles.closeButton}
            onClick={actions.closeActs}
            aria-label="Close"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div className={styles.actsList}>
          {acts.items.map(({ label, d, off, danger, run }) => (
            <button
              key={label}
              className={joinClassNames(
                styles.actsItem,
                danger && styles.actsDanger,
                off && styles.actsOff,
              )}
              onClick={() => {
                if (off) return;
                actions.closeActs();
                window.setTimeout(run, 180);
              }}
              disabled={!!off}
            >
              <svg
                className={styles.noShrink}
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={d}></path>
              </svg>
              <span className={styles.grow}>{label}</span>
            </button>
          ))}
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
    if (confirm.no) {
      setState({ confirmOut: false });
      confirm.no();
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
          getOverlayAnimation(state.confirmOut, "dlg", isWide),
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
