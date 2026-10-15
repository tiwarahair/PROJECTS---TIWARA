import { LoadingImage } from "../../components/loading-image/loading-image";
import { joinClassNames } from "../../utils/class-names";
import { resolveAssetUrl } from "../../utils/asset-url";
import styles from "../../styles/features/stylist-profile/profile-portfolio.module.css";
import pageGlobal from "../../styles/features/stylist-profile/stylist-profile-page-global.module.css";

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
          <LoadingImage
            loading="lazy"
            src={resolveAssetUrl(src)}
            alt="Portfolio"
            onClick={() => onZoom(src)}
            className={joinClassNames(pageGlobal.pfimg, styles.image)}
          />
        </div>
      ))}
    </div>
  </>
);
