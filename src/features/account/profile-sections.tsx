import { Heart, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { StylistCardSkeleton } from "../../components/skeleton/stylist-card-skeleton";
import { toPublicStylist } from "../../lib/public-stylist";
import { useGetStylistProfileQuery } from "../../stores/api-slice";
import { setFavourite } from "../../stores/favourites-slice";
import { useAppDispatch } from "../../stores/hooks";
import { StylistCard } from "../../components/stylist-card/stylist-card";
import styles from "../../styles/features/account/profile-sections.module.css";
import ui from "../../styles/features/account/ui.module.css";

/** One saved stylist, from their live profile; nothing if it's gone. */
const FavouriteCard = ({ slug }: { slug: string }) => {
  const dispatch = useAppDispatch();
  const { data, isLoading, isSuccess } = useGetStylistProfileQuery(slug);

  // a stylist who has closed or gone back to draft drops out of favourites, so the count stays right
  useEffect(() => {
    if (isSuccess && !data) dispatch(setFavourite({ id: slug, on: false }));
  }, [data, dispatch, isSuccess, slug]);

  const stylist = useMemo(
    () => (data ? toPublicStylist(data).stylist : null),
    [data],
  );

  if (isLoading) return <StylistCardSkeleton />;

  if (!stylist) return null;

  const { id, name, cover, rating, reviews, area, verified, fromLabel } =
    stylist;

  return (
    // plain block wrapper, which the card's height:100% depends on
    <div data-dc-host="">
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
  );
};

export const FavouritesSection = ({
  favouriteIds,
}: {
  favouriteIds: string[];
}) => (
  <section data-screen-label="Account: Favourites">
    {favouriteIds.length > 0 && (
      <>
        <p className={styles.count}>
          {favouriteIds.length === 1
            ? "1 saved stylist"
            : `${favouriteIds.length} saved stylists`}
        </p>
        <div className={styles.favGrid}>
          {favouriteIds.map((slug) => (
            <FavouriteCard key={slug} slug={slug} />
          ))}
        </div>
      </>
    )}
    {!favouriteIds.length && (
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
