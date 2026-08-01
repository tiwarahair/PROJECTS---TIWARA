import { cx } from "../../utils/class-names";
import { getService } from "../../data/service-categories";
import type { ServiceCategoryKey } from "../../types/domain";

export interface StepStyleProps {
  serviceCategoryKey: ServiceCategoryKey;
  selectedStyleId: string | null;
  onSelectStyle: (styleId: string) => void;
}

/* No nav buttons — choosing a style advances on its own. */
export function StepStyle({
  serviceCategoryKey,
  selectedStyleId,
  onSelectStyle,
}: StepStyleProps) {
  const { name, styles } = getService(serviceCategoryKey);
  return (
    <>
      <div className="bp-step-title">Choose your style</div>
      <div className="bp-step-sub">{name} — select one to continue</div>
      <div className="bp-styles-grid">
        {styles.map(({ id, name, price, duration }) => (
          <div
            key={id}
            id={`sc-${id}`}
            className={cx(
              "bp-style-card",
              selectedStyleId === id && "selected",
            )}
            onClick={() => onSelectStyle(id)}
          >
            <div className="bp-style-img" />
            <div className="bp-style-body">
              <span className="bp-style-name">{name}</span>
              <span className="bp-style-meta">
                <span className="bp-style-price">{price}</span> · {duration}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
