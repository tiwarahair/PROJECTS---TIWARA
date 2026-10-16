import { Armchair, Car, House, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { Section } from "./parts";
import type { BusinessType } from "./types";
import type { BusinessDetailsController } from "./use-business-details";
import styles from "../../styles/components/business-details/type-section.module.css";
import parts from "../../styles/components/business-details/parts.module.css";

const TYPES: {
  key: BusinessType;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    key: "shop",
    title: "Shop / salon",
    description: "Clients come to your salon",
    icon: Store,
  },
  {
    key: "chair",
    title: "Chair rental",
    description: "You rent a chair in someone else’s salon",
    icon: Armchair,
  },
  {
    key: "home",
    title: "Home-based",
    description: "Clients come to your home",
    icon: House,
  },
  {
    key: "mobile",
    title: "Mobile",
    description: "You travel to your clients",
    icon: Car,
  },
];

export const TypeSection = ({
  business: { type, pickType },
}: {
  business: BusinessDetailsController;
}) => (
  <Section
    id="type"
    label="Business type"
    heading="Business type"
    intro="Where you see clients."
  >
    <div className={styles.types} role="radiogroup" aria-label="Business type">
      {TYPES.map(({ key, title, description, icon: TypeIcon }) => {
        const isOn = type === key;

        return (
          <button
            key={key}
            className={joinClassNames(
              styles.tile,
              parts.focusRing,
              isOn ? styles.tileOn : styles.tileOff,
            )}
            data-bd-in="1"
            role="radio"
            aria-checked={isOn ? "true" : "false"}
            onClick={() => pickType(key)}
          >
            <span
              className={joinClassNames(
                styles.tileIcon,
                isOn ? styles.tileIconOn : styles.tileIconOff,
              )}
            >
              <TypeIcon size={20} strokeWidth={1.7} />
            </span>
            <span className={styles.tileText}>
              <span
                className={joinClassNames(
                  styles.tileTitle,
                  isOn ? styles.tileTitleOn : styles.tileTitleOff,
                )}
              >
                {title}
              </span>
              <span className={styles.tileDesc}>{description}</span>
            </span>
            <span
              className={joinClassNames(
                styles.ring,
                isOn ? styles.ringOn : styles.ringOff,
              )}
            >
              <span
                className={joinClassNames(
                  styles.dot,
                  isOn ? styles.dotOn : styles.dotOff,
                )}
              ></span>
            </span>
          </button>
        );
      })}
    </div>
  </Section>
);
