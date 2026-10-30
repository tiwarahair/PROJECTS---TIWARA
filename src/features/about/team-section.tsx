import { ResponsiveImage } from "../../components/responsive-image";
import { joinClassNames } from "../../utils/class-names";
import story from "../../styles/components/story-page/index.module.css";
import styles from "../../styles/features/about/team-section.module.css";

const PHOTO_SIZES = "(max-width: 860px) 100vw, 830px";

interface TeamMemberProps {
  name: string;
  jobTitle: string;
  photo: string;
  alt: string;
  imageClassName?: string;
  isPhotoFirst: boolean;
}

const TeamMember = ({
  name,
  jobTitle,
  photo,
  alt,
  imageClassName,
  isPhotoFirst,
}: TeamMemberProps) => {
  const panel = (
    <div data-speed="1" className={styles.panelSlot}>
      <div data-rv="" className={styles.panel}>
        <div className={styles.role}>{jobTitle}</div>
        <h3 className={styles.name}>{name}</h3>
      </div>
    </div>
  );

  const photoFrame = (
    <div data-rv="" className={joinClassNames(story.photoFrame, styles.photo)}>
      <ResponsiveImage
        data-plx=""
        src={photo}
        sizes={PHOTO_SIZES}
        alt={alt}
        className={joinClassNames(story.driftImage, imageClassName)}
      />
    </div>
  );

  return (
    <div
      className={joinClassNames(
        story.grid,
        styles.member,
        isPhotoFirst ? styles.photoFirst : styles.panelFirst,
      )}
    >
      {isPhotoFirst ? photoFrame : panel}
      {isPhotoFirst ? panel : photoFrame}
    </div>
  );
};

export const TeamSection = () => (
  <section
    id="a-team"
    data-bg="#FAF6EE"
    data-screen-label="Meet the team"
    className={styles.team}
  >
    <div className={styles.inner}>
      <div className={styles.intro}>
        <h2 data-rv="" className={story.sectionHeading}>
          Meet the team
        </h2>
        <p data-rv="" className={styles.lede}>
          Two friends from Manchester building a better way to book afro hair.
        </p>
      </div>
      <TeamMember
        name="Kashope Afolabi"
        jobTitle="Founder and CEO"
        photo="site/ceo.jpeg"
        alt="Kashope Afolabi in the salon"
        imageClassName={styles.founderImage}
        isPhotoFirst={false}
      />
      <TeamMember
        name="Grace Bhoke Nyangwine"
        jobTitle="Chief Strategy Officer"
        photo="site/about/grace.jpeg"
        alt="Grace Bhoke Nyangwine standing in front of a hedge"
        imageClassName={styles.strategistImage}
        isPhotoFirst
      />
    </div>
  </section>
);
