import { ChevronDown, TriangleAlert } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import { asStyle } from "../../../../utils/as-style";
import type { StudioController } from "../../core/use-studio";
import type { BookingSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/sheet/status-row.module.css";
import shared from "../../../../styles/features/studio/bookings/sheet/index.module.css";

interface StatusRowProps {
  studio: StudioController;
  view: BookingSheetView;
}

export const StatusRow = ({ studio, view }: StatusRowProps) => {
  const { state, setState } = studio;
  const { booking } = view;

  return (
    <div className={styles.statusRow}>
      <span className={styles.statusLabel}>Status</span>
      <span className={styles.statusEnd}>
        {booking.unpaidFlag && (
          <span className={styles.unpaid}>
            <TriangleAlert size={12} strokeWidth={2} />
            Unpaid
          </span>
        )}
        <span className={styles.statusHolder}>
          <button
            className={styles.statusButton}
            style={asStyle({
              "--st-bg": booking.statusBackground,
              "--st-border": booking.statusBorder,
              "--st-color": booking.statusColor,
            })}
            onClick={() => setState({ statusMenuOpen: !state.statusMenuOpen })}
          >
            {booking.statusDot && <span className={styles.pulse}></span>}
            {booking.statusLabel}
            <ChevronDown
              className={joinClassNames(
                styles.chevron,
                state.statusMenuOpen && styles.chevronOpen,
              )}
              size={13}
              strokeWidth={2.2}
            />
          </button>
          {state.statusMenuOpen && (
            <>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <span
                className={styles.menuScrim}
                onClick={() => setState({ statusMenuOpen: false })}
              ></span>
              <span className={styles.statusMenu}>
                {view.statusItems.map(
                  ({
                    label,
                    icon: ItemIcon,
                    subtitle,
                    disabled,
                    danger,
                    run,
                  }) => (
                    <button
                      key={label}
                      className={joinClassNames(
                        styles.menuItem,
                        disabled && styles.menuItemOff,
                      )}
                      onClick={run}
                      disabled={!!disabled}
                    >
                      <ItemIcon
                        className={shared.menuIcon}
                        size={16}
                        strokeWidth={1.8}
                        color={danger ? "#a12a2a" : "var(--text-primary)"}
                      />
                      <span className={shared.grow}>
                        <span
                          className={joinClassNames(
                            styles.menuLabel,
                            danger && styles.dangerText,
                          )}
                        >
                          {label}
                        </span>
                        {!!subtitle && (
                          <span className={styles.menuSub}>{subtitle}</span>
                        )}
                      </span>
                    </button>
                  ),
                )}
              </span>
            </>
          )}
        </span>
      </span>
    </div>
  );
};
