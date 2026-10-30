import { ResponsiveImage } from "../../components/responsive-image";
import { milestones } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import story from "../../styles/components/story-page/index.module.css";
import styles from "../../styles/features/about/story-section.module.css";

export const StorySection = () => (
  <section
    id="a-story"
    data-bg="#FAF6EE"
    data-screen-label="Our story"
    className={styles.storySection}
  >
    <div className={joinClassNames(story.grid, styles.grid)}>
      <div className={styles.sticky}>
        <h2 data-rv="" className={story.sectionHeading}>
          Our story
        </h2>
        <div
          data-rv=""
          className={joinClassNames(story.photoFrame, styles.photo)}
        >
          <ResponsiveImage
            data-plx=""
            src="site/about/locs-by-sofa.jpeg"
            sizes="(max-width: 860px) 100vw, 480px"
            alt="A woman with locs sits on a patterned rug beside a leather sofa"
            className={joinClassNames(story.driftImage, styles.image)}
          />
        </div>
      </div>
      <div id="a-story-list" className={styles.list}>
        <div className={styles.track}></div>
        <div id="a-line" className={styles.progress}></div>
        {milestones.map(({ year, title, description }) => (
          <div key={title} data-ms="" className={styles.milestone}>
            <span data-dot="" className={styles.dot}></span>
            <div data-year="" className={styles.year}>
              {year}
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
