import { useRef } from "react";
import type { CSSProperties } from "react";
import { StylistCard } from "../../components/stylist-card/stylist-card";
import { stylists } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import page from "./home-page.module.css";
import styles from "./stylists-section.module.css";
import { useCentreSecondCard } from "./use-centre-second-card";
import { useStylistCarousel } from "./use-stylist-carousel";

/** "Book our stylists" row with the second card centred on load (prototype Home "Stylists"; carousel off via STY_STATIC). */
export const StylistsSection = () => {
  const rowRef = useRef<HTMLDivElement>(null);
  useCentreSecondCard(rowRef, "." + page.stycard);
  const { getRingCard, promote } = useStylistCarousel(rowRef, stylists.length);

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
          {stylists.map(
            (
              { id, cover, name, rating, reviews, area, fromLabel, verified },
              index,
            ) => {
              const { order, scale, opacity, dim } = getRingCard(index);
              return (
                <div
                  key={id}
                  data-dim={dim}
                  onClick={() => promote(index)}
                  className={joinClassNames(page.stycard, styles.card)}
                  // ring position, scale and opacity come from the carousel state
                  style={
                    {
                      "--card-order": order,
                      "--card-scale": scale,
                      "--card-opacity": opacity,
                    } as CSSProperties
                  }
                >
                  <StylistCard
                    href={"/stylist?stylist=" + id}
                    cover={cover}
                    stylistName={name}
                    rating={rating}
                    reviews={reviews}
                    area={area}
                    from={fromLabel}
                    verified={verified}
                  />
                </div>
              );
            },
          )}
        </div>
      </div>
    </section>
  );
};
