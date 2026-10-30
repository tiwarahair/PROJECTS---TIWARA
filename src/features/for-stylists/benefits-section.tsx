import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ResponsiveImage } from "../../components/responsive-image";
import { benefitGroups, benefits } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import story from "../../styles/components/story-page/index.module.css";
import styles from "../../styles/features/for-stylists/benefits-section.module.css";

const IMAGE_SIZES = "(max-width: 860px) 100vw, 600px";

export const BenefitsSection = () => {
  const [selectedGroup, setSelectedGroup] = useState(
    benefitGroups[0]?.label ?? "",
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const hasPickedRef = useRef(false);

  useEffect(() => {
    const panel = panelRef.current;

    if (!hasPickedRef.current || !panel) return;

    gsap.fromTo(
      panel.querySelectorAll("[data-tb]"),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power3.out" },
    );
  }, [selectedGroup]);

  const pickGroup = (label: string) => {
    if (label === selectedGroup) return;

    hasPickedRef.current = true;
    setSelectedGroup(label);
  };

  return (
    <section
      id="benefits"
      data-bg="#FAF6EE"
      data-screen-label="Benefits"
      className={styles.benefits}
    >
      <div className={styles.inner}>
        <div className={styles.intro}>
          <h2 data-rv="" className={story.sectionHeading}>
            Everything your chair needs, in one place.
          </h2>
          <p data-rv="" className={styles.lede}>
            Started by a braider who spent years managing bookings through DMs
            alongside a 9-5. Every feature solves a real problem behind the
            chair.
          </p>
        </div>
        <div
          data-rv=""
          role="tablist"
          aria-label="Benefits"
          className={styles.tabs}
        >
          {benefitGroups.map(({ label }) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={label === selectedGroup}
              onClick={() => pickGroup(label)}
              className={styles.tab}
            >
              {label}
              <span className={styles.count}>
                {benefits.filter(({ group }) => group === label).length}
              </span>
            </button>
          ))}
        </div>
        <div className={joinClassNames(story.grid, styles.grid)}>
          <div className={joinClassNames(story.photoFrame, styles.photos)}>
            {benefitGroups.map(({ label, image, imagePosition, alt }) => (
              <ResponsiveImage
                key={label}
                src={image}
                sizes={IMAGE_SIZES}
                alt={alt}
                className={joinClassNames(
                  story.coverImage,
                  styles.photo,
                  imagePosition === "middle" && styles.middle,
                  label === selectedGroup && styles.shown,
                )}
              />
            ))}
          </div>
          <div
            ref={panelRef}
            id="fs-tabpanel"
            role="tabpanel"
            className={styles.panel}
          >
            {benefits
              .filter(({ group }) => group === selectedGroup)
              .map(({ title, description }) => (
                <div key={title} data-tb="" className={styles.benefit}>
                  <h3 className={styles.benefitTitle}>{title}</h3>
                  <p className={styles.benefitText}>{description}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};
