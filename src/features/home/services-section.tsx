import { ResponsiveImage } from "../../components/responsive-image/responsive-image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { serviceGroups } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import page from "../../styles/features/home/home-page.module.css";
import styles from "../../styles/features/home/services-section.module.css";

/** Numbered service-group list with hover photos (hidden unless showServices). */
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
                <ArrowUpRight size={18} strokeWidth={1.5} />
              </span>
            </div>
            {image && (
              <ResponsiveImage
                src={image}
                sizes="190px"
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
          <ArrowRight size={16} strokeWidth={2} strokeLinejoin="miter" />
        </Link>
      </div>
    </div>
  </section>
);
