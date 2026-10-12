import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { Link } from "react-router";
import { resolveAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import type { BookingCardView, QuickAction } from "./account-view";
import styles from "./bookings-sections.module.css";
import ui from "./account-ui.module.css";

const CalendarIcon = () => (
  <svg
    className={styles.factIcon}
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="3"></rect>
    <path d="M3 10h18M8 2v4M16 2v4"></path>
  </svg>
);

const PinIcon = () => (
  <svg
    className={styles.factIcon}
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const CardIcon = () => (
  <svg
    className={styles.factIcon}
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
    <path d="M2 10h20"></path>
  </svg>
);

/** Status tag; its colours come from the booking's status (runtime values). */
const StatusTag = ({ card }: { card: BookingCardView }) => {
  const [label, background, colour] = card.money.tag;

  const tagStyle = {
    "--tag-bg": background,
    "--tag-fg": colour,
  } as CSSProperties;

  return (
    <span className={styles.tag} style={tagStyle}>
      {label}
    </span>
  );
};

/** Stylist link + status tag, service and customisation (shared by the overview and upcoming cards). */
const CardHead = ({ card }: { card: BookingCardView }) => (
  <>
    <div className={styles.cardHead}>
      <Link className={styles.stylistLink} to={card.profile}>
        {card.money.stylist.name}
      </Link>
      <StatusTag card={card} />
    </div>
    <div className={styles.service}>{card.booking.service}</div>
    {!!card.booking.customisation && (
      <div className={ui.muted}>{card.booking.customisation}</div>
    )}
  </>
);

interface OverviewSectionProps {
  upcoming: BookingCardView[];
  quick: QuickAction[];
  onCalendar: (card: BookingCardView) => void;
  onGo: (id: string) => void;
}

export const OverviewSection = ({
  upcoming,
  quick,
  onCalendar,
  onGo,
}: OverviewSectionProps) => (
  <section data-screen-label="Account: Overview">
    <h2 className={ui.heading}>Next appointment</h2>
    {upcoming.slice(0, 1).map((card) => (
      <article
        key={card.booking.id}
        className={styles.nextCard}
        aria-label={card.aria}
      >
        <div className={styles.cardTop}>
          <img
            className={styles.cover}
            src={resolveAssetUrl(card.money.stylist.cover)}
            alt=""
          />
          <div className={styles.cardBody}>
            <CardHead card={card} />
            <div className={styles.facts}>
              <span className={styles.fact}>
                <CalendarIcon />
                <span className={styles.factStrong}>{card.when}</span>
              </span>
              <span className={styles.fact}>
                <PinIcon />
                <span>{card.money.where}</span>
              </span>
            </div>
          </div>
        </div>
        <div className={styles.nextActions}>
          <Link className={styles.nextManage} to={card.manage}>
            Manage booking
          </Link>
          <button className={ui.quietButton} onClick={() => onCalendar(card)}>
            Add to calendar
          </button>
        </div>
      </article>
    ))}
    {!upcoming.length && (
      <div
        className={styles.overviewEmpty}
        data-screen-label="Overview: no upcoming"
      >
        <p className={ui.emptyNote}>No upcoming appointments</p>
        <Link className={ui.findButton} to="/search">
          Find a stylist
        </Link>
      </div>
    )}
    <h2 className={ui.headingSpaced}>Quick actions</h2>
    <div className={styles.quickGrid}>
      {quick.map(({ key, label, subtitle, href, icon, section }) => (
        <Link
          key={key}
          className={styles.quickLink}
          to={href}
          onClick={(event: MouseEvent) => {
            if (!section) return;

            event.preventDefault();
            onGo(section);
          }}
        >
          <span className={styles.quickIcon}>
            <svg
              className={ui.icon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={icon}></path>
            </svg>
          </span>
          <span className={styles.quickText}>
            <span className={styles.quickLabel}>{label}</span>
            <span className={ui.smallMuted}>{subtitle}</span>
          </span>
        </Link>
      ))}
    </div>
  </section>
);

interface BookingsSectionProps {
  upcoming: BookingCardView[];
  past: BookingCardView[];
  activeTab: string;
  showUpcoming: boolean;
  showPast: boolean;
  onTab: (tab: "up" | "past", focus?: boolean) => void;
  onCalendar: (card: BookingCardView) => void;
  onReceipt: (id: string) => void;
}

export const BookingsSection = ({
  upcoming,
  past,
  activeTab,
  showUpcoming,
  showPast,
  onTab,
  onCalendar,
  onReceipt,
}: BookingsSectionProps) => {
  const chips = (
    [
      ["up", "Upcoming", upcoming.length],
      ["past", "Past and cancelled", past.length],
    ] as const
  ).filter(([id, , count]) => id === "up" || count > 0);

  const onTabKey = (event: KeyboardEvent) => {
    if (
      !past.length ||
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    )
      return;

    event.preventDefault();
    onTab(["ArrowRight", "End"].includes(event.key) ? "past" : "up", true);
  };

  return (
    <section data-screen-label="Account: Bookings">
      {/* the prototype handles the tabs' arrow keys on the tablist (the focused tab's keydown bubbles up) */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Bookings"
        onKeyDown={onTabKey}
      >
        {chips.map(([id, label, count]) => {
          const isOn = activeTab === id;

          return (
            <button
              key={id}
              className={joinClassNames(
                styles.tab,
                isOn ? styles.tabOn : styles.tabOff,
              )}
              id={`ac-bk-${id}`}
              role="tab"
              aria-selected={isOn}
              tabIndex={isOn ? 0 : -1}
              onClick={() => onTab(id)}
            >
              {label}
              <span className={styles.tabCount}>{String(count)}</span>
              <span
                className={joinClassNames(
                  styles.tabBar,
                  isOn ? styles.tabBarOn : styles.tabBarOff,
                )}
                aria-hidden="true"
              ></span>
            </button>
          );
        })}
      </div>
      {showUpcoming && upcoming.length > 0 && (
        <div className={styles.cards}>
          {upcoming.map((card) => (
            <article
              key={card.booking.id}
              className={styles.upcomingCard}
              aria-label={card.aria}
            >
              <div className={styles.cardTop}>
                <img
                  className={styles.cover}
                  src={resolveAssetUrl(card.money.stylist.cover)}
                  alt=""
                />
                <div className={styles.cardBody}>
                  <CardHead card={card} />
                  <div className={styles.facts}>
                    <span className={styles.fact}>
                      <CalendarIcon />
                      <span>
                        <span className={styles.factStrong}>{card.when}</span>
                      </span>
                    </span>
                    <span className={styles.fact}>
                      <PinIcon />
                      <span>{card.money.where}</span>
                    </span>
                    <span className={styles.fact}>
                      <CardIcon />
                      <span>
                        <span className={styles.paidText}>
                          {card.money.paid}
                        </span>
                        {card.money.due}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.upcomingActions}>
                <Link className={styles.manage} to={card.manage}>
                  Manage booking
                </Link>
                <button
                  className={styles.calendar}
                  onClick={() => onCalendar(card)}
                >
                  Add to calendar
                </button>
                <Link className={styles.help} to={card.help}>
                  Get help with this booking
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {showUpcoming && !upcoming.length && (
        <div
          className={styles.bookingsEmpty}
          data-screen-label="Bookings: no upcoming"
        >
          <p className={ui.emptyNote}>No upcoming bookings.</p>
          <Link className={ui.findButton} to="/search">
            Find a stylist
          </Link>
        </div>
      )}
      {showPast && (
        <div className={styles.cards}>
          {past.map((card) => (
            <article
              key={card.booking.id}
              className={styles.pastCard}
              aria-label={card.aria}
            >
              <img
                className={styles.pastCover}
                src={resolveAssetUrl(card.money.stylist.cover)}
                alt=""
              />
              <div className={styles.pastBody}>
                <div className={styles.cardHead}>
                  <Link className={styles.stylistLink} to={card.profile}>
                    {card.money.stylist.name}
                  </Link>
                  <StatusTag card={card} />
                </div>
                <div className={styles.pastService}>
                  {card.booking.service}
                  {!!card.booking.customisation && (
                    <span className={ui.optional}>
                      {"· "}
                      {card.booking.customisation}
                    </span>
                  )}
                </div>
                <div className={ui.muted}>
                  {card.when}
                  {" · "}
                  {card.money.whereShort}
                </div>
                <div className={styles.pastPaid}>
                  {card.money.paid}
                  <span className={styles.pastDue}>{card.money.due}</span>
                </div>
                <div className={styles.pastActions}>
                  <Link className={styles.bookAgain} to={card.again}>
                    Book again
                  </Link>
                  <button
                    className={styles.viewReceipt}
                    onClick={() => onReceipt(card.booking.id)}
                  >
                    View receipt
                  </button>
                  <Link className={styles.pastHelp} to={card.help}>
                    Get help with this booking
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
