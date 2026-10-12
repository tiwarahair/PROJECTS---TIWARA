import { Link } from "react-router";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { ArrowIcon } from "./arrow-icon";
import page from "./home-page.module.css";
import styles from "./book-slot-tiles.module.css";

const TILES = [
  {
    key: "lounge",
    image: "site/duo-lounge.jpeg",
    alt: "Two clients in the studio",
    lines: ["Find your stylist,", "book in minutes"],
    imageClass: styles.imageLounge,
  },
  {
    key: "comb",
    image: "site/duo-comb.jpeg",
    alt: "A stylist combing out a client",
    lines: ["Choose with reviews", "you can trust"],
    imageClass: styles.imageComb,
  },
];

/** Two full-height photo tiles linking to Search. */
export const BookSlotTiles = () => (
  <div
    id="looks"
    data-bg="#1a1714"
    data-screen-label="Book a slot"
    className={joinClassNames(page.duorow, styles.row)}
  >
    {TILES.map(
      ({ key, image, alt, lines: [firstLine, secondLine], imageClass }) => (
        <Link
          key={key}
          to="/search"
          className={joinClassNames(page.duotile, styles.tile)}
        >
          <img
            loading="lazy"
            src={getAssetUrl(image)}
            alt={alt}
            className={imageClass}
          />
          <div className={styles.scrim}></div>
          <div className={styles.caption}>
            <h3 className={styles.title}>
              {firstLine}
              <br />
              {secondLine}
            </h3>
            <span className={styles.cta}>
              Book an appointment
              <ArrowIcon />
            </span>
          </div>
        </Link>
      ),
    )}
  </div>
);
