import { Link } from "react-router";
import { serviceGroups } from "../../data";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import page from "./home-page.module.css";
import styles from "./services-section.module.css";

/** Numbered service-group list with hover photos (prototype Home "Services"; hidden unless showServices). */
export const ServicesSection = () => (
  <section
    id="services"
    data-bg="#FAF6EE"
    data-screen-label="Services"
    className={styles.section}
  >
    <div className={styles.inner}>
      <div data-rv="" className={styles.eyebrow}>
        Services
      </div>
      <h2 data-rv="" className={styles.title}>
        What are we doing with your hair?
      </h2>
      <p data-rv="" className={styles.lede}>
        Six categories, every texture. Pick a style and see who does it near
        you.
      </p>
      <div className={styles.list}>
        {serviceGroups.map(({ id, name, description, image, slug }, index) => (
          <Link
            key={id}
            to={`/search?group=${slug}`}
            data-rv=""
            className={joinClassNames(page.svcrow, styles.row)}
          >
            <div className={joinClassNames(page.svcrowInner, styles.rowInner)}>
              <span className={styles.number}>{`0${index + 1}`}</span>
              <div>
                <span className={joinClassNames(page.svcname, styles.name)}>
                  {name}
                </span>
                <div className={joinClassNames(page.svcdesc, styles.desc)}>
                  {description}
                </div>
              </div>
              <span className={joinClassNames(page.svccount, styles.count)}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17 17 7"></path>
                  <path d="M8 7h9v9"></path>
                </svg>
              </span>
            </div>
            {image && (
              <img
                loading="lazy"
                src={getAssetUrl(image)}
                alt={name}
                className={joinClassNames(page.svcmedia, styles.media)}
              />
            )}
          </Link>
        ))}
        <div className={styles.listEnd}></div>
      </div>
      <div data-rv="" className={styles.more}>
        <Link to="/search" className={styles.moreLink}>
          Browse all categories
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M5 12h14"></path>
            <path d="m13 6 6 6-6 6"></path>
          </svg>
        </Link>
      </div>
    </div>
  </section>
);
