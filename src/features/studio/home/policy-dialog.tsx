import { useEffect, useRef, useState } from "react";
import { CalendarX, ShieldCheck, UserX, Wallet, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getDialogPlacement,
  getOverlayAnimation,
} from "../../../components/overlay";
import { useFocusLoop } from "../../../hooks/use-focus-loop";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import { closePolicyNudge } from "./nudge";
import overlay from "../../../styles/components/overlay/index.module.css";
import styles from "../../../styles/features/studio/home/policy-dialog.module.css";

interface PolicyDialogProps {
  studio: StudioController;
}

const PERKS: [LucideIcon, string, string][] = [
  [Wallet, "Take a deposit", "Clients pay part of the price when they book."],
  [
    CalendarX,
    "Charge for late cancellations",
    "Get paid when a client cancels too late for you to rebook.",
  ],
  [UserX, "Cover no-shows", "Get paid for the time you held for them."],
];

/** Policy nudge: a dialog straight after setup (only on wider screens) */
export const PolicyDialog = ({ studio }: PolicyDialogProps) => {
  const { actions } = studio;
  const [isClosing, setIsClosing] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const close = (then?: () => void) => {
    if (isClosing) return;

    setIsClosing(true);

    window.setTimeout(() => {
      closePolicyNudge(studio);
      then?.();
    }, 210);
  };

  useFocusLoop(boxRef);

  const latestClose = useRef(close);

  latestClose.current = close;

  useEffect(() => {
    primaryRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.stopPropagation();
      latestClose.current();
    };

    window.addEventListener("keydown", handleKey, true);

    return () => window.removeEventListener("keydown", handleKey, true);
  }, []);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.scrim,
          isClosing ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={() => close()}
      ></div>
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-dialog-title"
        className={joinClassNames(
          styles.box,
          getDialogPlacement(true),
          getOverlayAnimation(isClosing, "dialog", true),
        )}
        data-screen-label="Policy nudge"
      >
        <button
          type="button"
          className={styles.close}
          onClick={() => close()}
          aria-label="Close"
        >
          <X size={18} strokeWidth={2} />
        </button>
        <span className={styles.badge} aria-hidden="true">
          <ShieldCheck size={22} strokeWidth={1.8} />
        </span>
        <h2 id="policy-dialog-title" className={styles.title}>
          Make your policy your own
        </h2>
        <p className={styles.body}>
          You can take bookings now. Until you set a booking policy, clients
          book without a deposit or card, and can cancel at any time.
        </p>
        <ul className={styles.perks}>
          {PERKS.map(([PerkIcon, label, detail]) => (
            <li key={label} className={styles.perk}>
              <span className={styles.perkIcon} aria-hidden="true">
                <PerkIcon size={16} strokeWidth={1.8} />
              </span>
              <span>
                <span className={styles.perkLabel}>{label}</span>
                <span className={styles.perkDetail}>{detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => close()}
          >
            Not now
          </button>
          <button
            ref={primaryRef}
            type="button"
            className={styles.primary}
            onClick={() => close(() => actions.openSubpage("policy"))}
          >
            Set your policy
          </button>
        </div>
      </div>
    </>
  );
};
