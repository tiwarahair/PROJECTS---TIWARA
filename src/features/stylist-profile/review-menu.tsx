import { Ellipsis, Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/features/stylist-profile/review-menu.module.css";
import pageGlobal from "../../styles/features/stylist-profile/index-global.module.css";

const MENU_ROOM = 72;

// below the button, inside the scrolling box it sits in (a sheet's list) or the window
const hasRoomBelow = (button: HTMLElement | null) => {
  if (!button) return true;

  let box = button.parentElement;

  while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY))
    box = box.parentElement;

  const bottom = box ? box.getBoundingClientRect().bottom : window.innerHeight;

  return bottom - button.getBoundingClientRect().bottom >= MENU_ROOM;
};

interface ReviewMenuProps {
  onReport: () => void;
}

/** "⋯" on a public review: a small menu with Report, which opens the report sheet. */
export const ReviewMenu = ({ onReport }: ReviewMenuProps) => {
  const [isOpen, setOpen] = useState(false);
  const [isUp, setUp] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    itemRef.current?.focus();

    const closeOutside = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };

    // on window, before the surrounding sheet's own Escape handler, so only the menu closes
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape, true);

    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [isOpen]);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label="More options for this review"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          setUp(!hasRoomBelow(buttonRef.current));
          setOpen((open) => !open);
        }}
      >
        <Ellipsis size={18} strokeWidth={1.8} />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label="Review options"
          className={joinClassNames(
            pageGlobal.pfPop,
            styles.menu,
            isUp && styles.menuUp,
          )}
        >
          <button
            ref={itemRef}
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => {
              setOpen(false);
              onReport();
            }}
          >
            <Flag size={15} strokeWidth={1.8} />
            Report review
          </button>
        </div>
      )}
    </div>
  );
};
