import { Heart, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { StylistCard } from "../../components/stylist-card/stylist-card";
import type { Stylist } from "../../types/stylist";
import styles from "../../styles/features/account/profile-sections.module.css";
import ui from "../../styles/features/account/account-ui.module.css";

export const FavouritesSection = ({
  favourites,
}: {
  favourites: Stylist[];
}) => (
  <section data-screen-label="Account: Favourites">
    {favourites.length > 0 && (
      <>
        <p className={styles.count}>
          {favourites.length === 1
            ? "1 saved stylist"
            : `${favourites.length} saved stylists`}
        </p>
        <div className={styles.favGrid}>
          {favourites.map(
            ({
              id,
              name,
              cover,
              rating,
              reviews,
              area,
              verified,
              fromLabel,
            }) => (
              // plain block wrapper, which the card's height:100% depends on
              <div key={id} data-dc-host="">
                <StylistCard
                  href={`/${id}`}
                  bookHref={`/book?stylist=${id}`}
                  stylistId={id}
                  cover={cover}
                  stylistName={name}
                  rating={rating}
                  reviews={reviews}
                  area={area}
                  meta={fromLabel ? `From ${fromLabel}` : ""}
                  verified={!!verified}
                />
              </div>
            ),
          )}
        </div>
      </>
    )}
    {!favourites.length && (
      <div className={ui.emptyState} data-screen-label="Favourites empty">
        <div className={ui.emptyIcon}>
          <Heart size={24} strokeWidth={2} />
        </div>
        <p className={ui.emptyText}>
          No favourites yet. Tap the heart on any stylist to save them here.
        </p>
        <Link className={ui.emptyButton} to="/search">
          Find a stylist
        </Link>
      </div>
    )}
  </section>
);

export const HairSection = ({
  quiz,
  quizDate,
}: {
  quiz: boolean;
  quizDate: string;
}) => {
  const rows = [
    ["Hair type", "Type 4C, coily"],
    ["Length", "Shoulder length"],
    ["Styles you like", "Knotless braids, silk press, twist outs"],
    ["Last updated", quizDate],
  ];

  return (
    <section data-screen-label="Account: Hair profile">
      {quiz && (
        <>
          <div className={ui.list}>
            {rows.map(([label, value]) => (
              <div key={label} className={styles.quizRow}>
                <div className={ui.rowLabel}>{label}</div>
                <div className={styles.quizValue}>{value}</div>
              </div>
            ))}
          </div>
          <Link className={styles.retake} to="/#quiz">
            Retake the quiz
          </Link>
        </>
      )}
      {!quiz && (
        <div
          className={styles.quizEmpty}
          data-screen-label="Hair profile: not taken"
        >
          <div className={ui.emptyIcon}>
            <Sparkles className={ui.icon} size={24} strokeWidth={2} />
          </div>
          <p className={styles.quizEmptyText}>
            Find styles that suit your hair
          </p>
          <Link className={styles.takeQuiz} to="/#quiz">
            Take the hair quiz
          </Link>
        </div>
      )}
    </section>
  );
};
