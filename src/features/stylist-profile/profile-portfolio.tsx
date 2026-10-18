import { ResponsiveImage } from "../../components/responsive-image";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/features/stylist-profile/profile-portfolio.module.css";
import pageGlobal from "../../styles/features/stylist-profile/index-global.module.css";

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
          <ResponsiveImage
            hasShimmer
            src={src}
            sizes="(max-width: 600px) 50vw, 240px"
            alt="Portfolio"
            onClick={() => onZoom(src)}
            className={joinClassNames(pageGlobal.pfimg, styles.image)}
          />
        </div>
      ))}
    </div>
  </>
);
