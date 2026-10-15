import { useRef } from "react";
import { StylistCardSkeleton } from "../../components/skeleton/stylist-card-skeleton";
import { StylistCard } from "../../components/stylist-card/stylist-card";
import { useIsSlow } from "../../hooks/use-is-slow";
import { toPhotoUrl } from "../../lib/public-stylist";
import { usePeekStylistsQuery } from "../../stores/api-slice";
import { joinClassNames } from "../../utils/class-names";
import { formatMoney } from "../../utils/money";
import page from "../../styles/features/home/home-page.module.css";
import styles from "../../styles/features/home/stylists-section.module.css";
import { useCentreSecondCard } from "./use-centre-second-card";

const FEATURED = { args: { sort: "newest" }, size: 8 };

/** "book our stylists": the newest live stylists, the second card centred on load; hidden when there are none. */
export const StylistsSection = () => {
  const rowRef = useRef<HTMLDivElement>(null);

  const { data: stylists, isLoading } = usePeekStylistsQuery(FEATURED, {
    refetchOnMountOrArgChange: 60,
  });

  const isSlow = useIsSlow(isLoading);

  useCentreSecondCard(rowRef, `.${page.stycard}`);

  if (!isLoading && !stylists?.length) return null;

  return (
    <section
      id="stylists"
      data-bg="#FAF6EE"
      data-screen-label="Stylists"
      className={styles.section}
    >
      <div className={styles.header}>
        <div className={styles.eyebrow}>Our stylists</div>
        <h2 className={styles.title}>Book our stylists</h2>
      </div>
      <div className={styles.rail}>
        <div
          id="styrow"
          ref={rowRef}
          className={joinClassNames(page.styrow, styles.row)}
        >
          {stylists?.map(
            ({
              id,
              slug,
              cover_path,
              business_name,
              area_label,
              from_pence,
            }) => (
              <div
                key={id}
                className={joinClassNames(page.stycard, styles.card)}
              >
                <StylistCard
                  href={`/${slug}`}
                  cover={cover_path ? toPhotoUrl(cover_path) : ""}
                  stylistName={business_name}
                  area={area_label ?? ""}
                  from={formatMoney(from_pence / 100)}
                  verified
                />
              </div>
            ),
          )}
          {isSlow &&
            [0, 1, 2].map((key) => (
              <div
                key={key}
                className={joinClassNames(page.stycard, styles.card)}
              >
                <StylistCardSkeleton />
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};
