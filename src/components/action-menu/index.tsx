import { Ellipsis, EllipsisVertical, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "../../hooks/use-media-query";
import { joinClassNames } from "../../utils/class-names";
import { getDialogPlacement, getOverlayAnimation } from "../overlay";
import overlay from "../../styles/components/overlay/index.module.css";
import styles from "../../styles/components/action-menu/index.module.css";

export interface ActionMenuItem {
  label: string;
  icon: LucideIcon;
  subtitle?: string;
  disabled?: boolean;
  danger?: boolean;
  run: () => void;
}

export interface ActionMenuAnchor {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface ActionMenuConfig {
  title: string;
  subtitle: string;
  anchor?: ActionMenuAnchor | null;
  items: ActionMenuItem[];
}

const EXIT_MS = 210;
const MENU_ROOM = 200;
const ABOVE_WIDTH = 264;

interface ActionMenuProps {
  menu: ActionMenuConfig;
  isWide: boolean;
  isClosing: boolean;
  onClose: () => void;
}

/** The "⋯" action menu */
export const ActionMenu = ({
  menu,
  isWide,
  isClosing,
  onClose,
}: ActionMenuProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const anchor = menu.anchor && isWide ? menu.anchor : null;

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
  }, []);

  useEffect(() => {
    // on window, before a surrounding sheet's own Escape handler, so only the menu closes
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.stopPropagation();
      onClose();
    };

    window.addEventListener("keydown", closeOnEscape, true);

    return () => window.removeEventListener("keydown", closeOnEscape, true);
  }, [onClose]);

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
          styles.scrim,
          anchor && styles.scrimClear,
          isClosing ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={onClose}
      ></div>
      <div
        role="menu"
        aria-label={menu.title}
        className={joinClassNames(
          styles.box,
          anchor
            ? joinClassNames(
                anchor.bottom != null ? styles.above : styles.below,
                overlay.popIn,
              )
            : joinClassNames(
                styles.sheet,
                getDialogPlacement(isWide),
                getOverlayAnimation(isClosing, "dialog", isWide),
              ),
        )}
        style={anchorStyle}
      >
        <div className={joinClassNames(styles.head, anchor && styles.hidden)}>
          <div className={styles.grow}>
            <div className={styles.title}>{menu.title}</div>
            <div className={styles.sub}>{menu.subtitle}</div>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} strokeWidth={2} />
          </button>
        </div>
        <div ref={listRef} className={styles.list}>
          {menu.items.map(
            ({ label, icon: ItemIcon, disabled, danger, run }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                className={joinClassNames(
                  styles.item,
                  danger && styles.danger,
                  disabled && styles.off,
                )}
                onClick={() => {
                  if (disabled) return;

                  onClose();
                  window.setTimeout(run, 180);
                }}
                disabled={!!disabled}
              >
                <ItemIcon className={styles.icon} size={17} strokeWidth={1.7} />
                <span className={styles.grow}>{label}</span>
              </button>
            ),
          )}
        </div>
      </div>
    </>
  );
};

const getAnchor = (button: HTMLElement, host: Element | null) => {
  const rect = button.getBoundingClientRect();
  const box = host?.getBoundingClientRect();
  const offsetLeft = box?.left ?? 0;
  const offsetTop = box?.top ?? 0;
  const boxRight = box?.right ?? window.innerWidth;
  const boxBottom = box?.bottom ?? window.innerHeight;

  if (boxBottom - rect.bottom < MENU_ROOM && rect.top - offsetTop > MENU_ROOM)
    return {
      bottom: boxBottom - rect.top + 6,
      left: Math.max(12, rect.right - offsetLeft - ABOVE_WIDTH),
    };

  return {
    top: rect.bottom - offsetTop + 6,
    right: Math.max(12, boxRight - rect.right),
  };
};

interface ActionMenuButtonProps {
  /** names the button, e.g. "More options for this review" */
  label: string;
  title: string;
  subtitle: string;
  items: ActionMenuItem[];
  isVertical?: boolean;
}

/** A "⋯" button that opens the action menu */
export const ActionMenuButton = ({
  label,
  title,
  subtitle,
  items,
  isVertical = false,
}: ActionMenuButtonProps) => {
  const isWide = useMediaQuery("(min-width: 640px)");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<ActionMenuConfig | null>(null);
  const [host, setHost] = useState<Element | null>(null);
  const [isClosing, setClosing] = useState(false);
  const TriggerIcon = isVertical ? EllipsisVertical : Ellipsis;

  const open = () => {
    const button = buttonRef.current;

    if (!button) return;

    const dialog = button.closest('[role="dialog"]');

    setHost(dialog);
    setClosing(false);
    setMenu({ title, subtitle, items, anchor: getAnchor(button, dialog) });
  };

  const close = () => {
    setClosing(true);
    buttonRef.current?.focus();

    window.setTimeout(() => {
      setMenu(null);
      setClosing(false);
    }, EXIT_MS);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!menu && !isClosing}
        onClick={open}
      >
        <TriggerIcon size={18} strokeWidth={1.8} />
      </button>
      {!!menu &&
        createPortal(
          <ActionMenu
            menu={menu}
            isWide={isWide}
            isClosing={isClosing}
            onClose={close}
          />,
          host ?? document.body,
        )}
    </>
  );
};
