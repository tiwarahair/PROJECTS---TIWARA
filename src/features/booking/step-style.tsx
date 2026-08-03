import { cx } from "../../utils/class-names";
import { useAppDispatch } from "../../stores/hooks";
import { pageOpened } from "../../stores/overlays-slice";
import { getService } from "../../data/services/services";
import type { ServiceId } from "../../types/services";

export interface StepStyleProps {
  serviceCategoryKey: ServiceId;
  selectedStyleId: string | null;
  onSelectStyle: (styleId: string) => void;
}

/* No nav buttons — choosing a style advances on its own. */
export function StepStyle({
  serviceCategoryKey,
  selectedStyleId,
  onSelectStyle,
}: StepStyleProps) {
  const { label: serviceLabel, individualServices } =
    getService(serviceCategoryKey);
  const dispatch = useAppDispatch();

  return (
    <>
      <div className="bp-step-title">Choose your style</div>
      <div className="bp-step-sub">{serviceLabel} — select one to continue</div>
      <div className="bp-styles-grid">
        {individualServices.map(
          ({ id, label, defaultPrice, defaultDuration }) => (
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
                <span className="bp-style-name">{label}</span>
                <span className="bp-style-meta">
                  <span className="bp-style-price">{`from ${defaultPrice}`}</span>{" "}
                  · {defaultDuration}
                </span>
              </div>
            </div>
          ),
        )}
        {/* For looks that aren't in the catalogue. */}
        {/* TO DO: this is broken, page doesn't appear (I think it's behind), 
        also, we need to think about the workflow of this -- how will it be submitted to the stylist &
        how will we get back to the customer? */}
        <div
          className="bp-style-card bp-style-other"
          onClick={() => dispatch(pageOpened("otherStyle"))}
        >
          <div className="bp-style-other-inner">
            <div className="bp-style-other-icon">+</div>
            <div className="bp-style-body">
              <span className="bp-style-name">Something else?</span>
              <span className="bp-style-meta">Request a custom style</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
