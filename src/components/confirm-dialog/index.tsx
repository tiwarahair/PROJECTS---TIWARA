import { useEffect, useRef } from "react";
import { useMediaQuery } from "../../hooks/use-media-query";
import { joinClassNames } from "../../utils/class-names";
import { getDialogPlacement, getOverlayAnimation } from "../overlay";
import overlay from "../../styles/components/overlay/index.module.css";
import styles from "../../styles/components/confirm-dialog/index.module.css";

interface ConfirmDialogProps {
  title: string;
  emphasis?: string;
  body: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
  isClosing?: boolean;
  isBlocking?: boolean; // tapping outside does nothing
}

export const ConfirmDialog = ({
  title,
  emphasis,
  body,
  yesLabel,
  noLabel,
  onYes,
  onNo,
  isClosing = false,
  isBlocking = false,
}: ConfirmDialogProps) => {
  const isWide = useMediaQuery("(min-width: 640px)");
  const noRef = useRef<HTMLButtonElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    noRef.current?.focus();
  }, []);

  useEffect(() => {
    // on window, before a sheet underneath sees it: Escape closes only this, Tab stays on its two buttons
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();

        if (!isBlocking) onNo();
      }

      if (event.key !== "Tab") return;

      event.preventDefault();
      event.stopPropagation();

      const next = document.activeElement === noRef.current ? yesRef : noRef;

      next.current?.focus();
    };

    window.addEventListener("keydown", handleKey, true);

    return () => window.removeEventListener("keydown", handleKey, true);
  }, [isBlocking, onNo]);

  return (
    <>
      <div
        className={joinClassNames(
          styles.scrim,
          isClosing ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={isBlocking ? undefined : onNo}
      ></div>
      <div
        role="alertdialog"
        aria-label={title}
        className={joinClassNames(
          styles.box,
          getDialogPlacement(isWide),
          getOverlayAnimation(isClosing, "dialog", isWide),
        )}
      >
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.body}>
          {emphasis && <strong className={styles.emphasis}>{emphasis}</strong>}
          {body}
        </div>
        <div className={styles.actions}>
          <button
            ref={noRef}
            type="button"
            className={styles.no}
            onClick={onNo}
          >
            {noLabel}
          </button>
          <button
            ref={yesRef}
            type="button"
            className={styles.yes}
            onClick={onYes}
          >
            {yesLabel}
          </button>
        </div>
      </div>
    </>
  );
};
