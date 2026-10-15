import { ResponsiveImage } from "../../components/responsive-image/responsive-image";
import { useRef } from "react";
import { Link } from "react-router";
import { serviceGroups } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import page from "../../styles/features/home/home-page.module.css";
import styles from "../../styles/features/home/looks-section.module.css";
import { useGridReveal } from "./use-grid-reveal";

/** Home's own photo per service group, falling back to the group image. */
const LOOK_IMAGES: Record<string, string> = {
  braids: "demo/stylists/w160944.jpg",
  wigs: "demo/portfolio/w160800.jpg",
  weaves: "demo/portfolio/IMG_1581.jpg",
  locs: "demo/portfolio/home-locs-twists.jpg",
  natural: "demo/portfolio/natural-cornrows.jpg",
  treatments: "demo/stylists/w161244.jpg",
};

/** "Six ways to find your look" grid. */
export const LooksSection = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useGridReveal(sectionRef, page.looktile ?? "", page.lookgrid ?? "");

  return (
    <section
      ref={sectionRef}
      id="stylegrid"
      data-bg="#FAF6EE"
      data-screen-label="Six looks"
      className={styles.section}
    >
      <div className={styles.inner}>
        <div data-sr="" className={styles.eyebrow}>
          BROWSE BY STYLE
        </div>
        <h2 data-sr="" className={joinClassNames(page.lookhead, styles.title)}>
          Six ways to find your look
        </h2>
        <div className={joinClassNames(page.lookgrid, styles.grid)}>
          {serviceGroups.map(({ id, name, description, image, slug }) => (
            <Link
              key={id}
              to={`/search?group=${slug}`}
              className={joinClassNames(page.looktile, styles.tile)}
            >
              <ResponsiveImage
                src={LOOK_IMAGES[id] || image}
                sizes="(max-width: 900px) 50vw, 380px"
                alt={name}
                className={joinClassNames(page.lookimg, styles.image)}
              />
              <div
                className={joinClassNames(page.lookscrim, styles.scrim)}
              ></div>
              <div className={styles.caption}>
                <div className={styles.name}>{name}</div>
                <div className={joinClassNames(page.lookdesc, styles.desc)}>
                  {description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
