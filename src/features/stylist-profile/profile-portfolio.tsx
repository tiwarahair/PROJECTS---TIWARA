import { joinClassNames } from "../../utils/class-names";
import { resolveAssetUrl } from "../../utils/asset-url";
import styles from "./profile-portfolio.module.css";
import helmet from "./stylist-profile-helmet.module.css";

interface ProfilePortfolioProps {
  portfolio: string[];
  onZoom: (src: string) => void;
  onSeeAll: () => void;
}

/** Portfolio heading with "See all", and the photo grid; every photo opens the lightbox. */
export const ProfilePortfolio = ({
  portfolio,
  onZoom,
  onSeeAll,
}: ProfilePortfolioProps) => (
  <>
    <div data-rv="" className={styles.header}>
      <h2 className={styles.title}>Portfolio</h2>
      <button onClick={onSeeAll} className={styles.seeAll}>
        See all
      </button>
    </div>
    <div className={styles.grid}>
      {portfolio.map((src, index) => (
        <div key={index} data-rv="" className={styles.tile}>
          {/* a clickable <img> (keyboard users get "See all") */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <img
            loading="lazy"
            src={resolveAssetUrl(src)}
            alt="Portfolio"
            onClick={() => onZoom(src)}
            className={joinClassNames(helmet.pfimg, styles.image)}
          />
        </div>
      ))}
    </div>
  </>
);
