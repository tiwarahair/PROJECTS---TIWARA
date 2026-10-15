import { ResponsiveImage } from "../../components/responsive-image/responsive-image";
import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import page from "../../styles/features/home/home-page.module.css";
import styles from "../../styles/features/home/meet-section.module.css";

/** "Meet the founder". */
export const MeetSection = () => (
  <section
    id="meet"
    data-bg="#FAF6EE"
    data-screen-label="Meet Tiwára"
    className={styles.section}
  >
    <div className={joinClassNames(page.meetgrid, styles.grid)}>
      <div data-rv="" className={styles.photoFrame}>
        <ResponsiveImage
          data-plx=""
          src="site/ceo.jpeg"
          sizes="(max-width: 860px) 100vw, 600px"
          alt="Kashope in the salon"
          className={styles.photo}
        />
      </div>
      <div className={styles.text}>
        <div data-rv="" className={styles.titleRule}>
          <h2 className={styles.title}>Meet the founder</h2>
        </div>
        <p data-rv="" className={styles.intro}>
          Tiwára&apos;s House started as one chair in Ancoats and a phone full
          of unanswered booking DMs.
        </p>
        <p data-rv="" className={styles.body}>
          This platform is the fix she built for herself, opened up to every
          afro hair stylist in the city: bookings, deposits and reminders
          handled, so the chair stays full and the messages stay quiet.
        </p>
        <div data-rv="" className={styles.actions}>
          <Link to="/tiwaras-house" className={styles.book}>
            Book with Tiwára
          </Link>
          <span className={styles.location}>Ancoats, Manchester</span>
        </div>
      </div>
    </div>
  </section>
);
