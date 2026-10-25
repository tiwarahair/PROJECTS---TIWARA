import { Calendar, CreditCard, MapPin } from "lucide-react";
import { CountTabs } from "../../components/count-tabs";
import { ResponsiveImage } from "../../components/responsive-image";
import type { CSSProperties, MouseEvent } from "react";
import { Link } from "react-router";
import type { BookingCardView, QuickAction } from "./view";
import styles from "../../styles/features/account/bookings-sections.module.css";
import ui from "../../styles/features/account/ui.module.css";

const CalendarIcon = () => (
  <Calendar className={styles.factIcon} size={15} strokeWidth={1.5} />
);

const PinIcon = () => (
  <MapPin className={styles.factIcon} size={15} strokeWidth={1.8} />
);

const CardIcon = () => (
  <CreditCard className={styles.factIcon} size={15} strokeWidth={1.5} />
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
          <ResponsiveImage
            className={styles.cover}
            src={card.money.stylist.cover}
            sizes="88px"
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
      {quick.map(({ key, label, subtitle, href, icon: ItemIcon, section }) => (
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
            <ItemIcon className={ui.icon} size={18} strokeWidth={1.7} />
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
  const tabs = [
    { id: "up" as const, label: "Upcoming", count: upcoming.length },
    { id: "past" as const, label: "Past and cancelled", count: past.length },
  ].filter(({ id, count }) => id === "up" || count > 0);

  return (
    <section data-screen-label="Account: Bookings">
      <CountTabs
        label="Bookings"
        idPrefix="ac-bk"
        tabs={tabs}
        active={activeTab === "past" ? "past" : "up"}
        onChange={onTab}
      />
      {showUpcoming && upcoming.length > 0 && (
        <div className={styles.cards}>
          {upcoming.map((card) => (
            <article
              key={card.booking.id}
              className={styles.upcomingCard}
              aria-label={card.aria}
            >
              <div className={styles.cardTop}>
                <ResponsiveImage
                  className={styles.cover}
                  src={card.money.stylist.cover}
                  sizes="88px"
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
              <ResponsiveImage
                className={styles.pastCover}
                src={card.money.stylist.cover}
                sizes="56px"
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
