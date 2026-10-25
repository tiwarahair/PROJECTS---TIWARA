import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { useMediaQuery } from "../../hooks/use-media-query";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/sheet/index.module.css";

export const PHONE_QUERY = "(max-width: 640px)";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: string;
  media?: ReactNode; // Before the title, e.g. a photo.
  hasDivider?: boolean;
  /** Beside the title, e.g. a rating. */
  aside?: ReactNode;
  /** Pinned under the content, e.g. actions. */
  footer?: ReactNode;
  size?: "sm" | "md";
  children: ReactNode;
}

/**
 * A centred dialog on wider screens and a slide-up sheet on phones, where it can be swiped down to close.
 * The header and footer stay put; only the content scrolls.
 */
export const Sheet = ({
  open,
  onClose,
  title,
  subtitle,
  media,
  hasDivider = true,
  aside,
  footer,
  size = "md",
  children,
}: SheetProps) => {
  const isPhone = useMediaQuery(PHONE_QUERY);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      handleOnly={!isPhone}
    >
      <Drawer.Portal>
        <Drawer.Overlay className={styles.overlay} />
        <Drawer.Content
          className={joinClassNames(styles.content, styles[size])}
          aria-describedby={undefined}
        >
          {isPhone && <Drawer.Handle className={styles.handle} />}
          <header
            className={joinClassNames(
              styles.header,
              !hasDivider && styles.headerPlain,
            )}
          >
            {media}
            {subtitle ? (
              <div className={styles.heading}>
                <Drawer.Title className={styles.title}>{title}</Drawer.Title>
                <p className={styles.subtitle}>{subtitle}</p>
              </div>
            ) : (
              <Drawer.Title className={styles.title}>{title}</Drawer.Title>
            )}
            {aside}
            <Drawer.Close className={styles.close} aria-label="Close">
              <X size={20} strokeWidth={1.9} />
            </Drawer.Close>
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
