import { cx } from "../../utils/class-names";
import { useAppDispatch } from "../../stores/hooks";
import { modalOpened } from "../../stores/modals-slice";
import { getService } from "../../data/services/services";
import { getOfferedStyles, getStyleRate } from "../../data/stylist/stylist";
import type { ServiceId } from "../../types/services";

export interface StepStyleProps {
  serviceId: ServiceId;
  /** Narrows the list and the prices to this stylist; null shows the catalogue. */
  stylistId: string | null;
  selectedStyleId: string | null;
  onSelectStyle: (styleId: string) => void;
  onBack: () => void;
}

/* No Continue button — choosing a style advances on its own. Back is still
   needed, to reach the service step behind this one. */
export function StepStyle({
  serviceId,
  stylistId,
  selectedStyleId,
  onSelectStyle,
  onBack,
}: StepStyleProps) {
  const { label: serviceLabel } = getService(serviceId);
  const styles = getOfferedStyles(stylistId, serviceId);
  const dispatch = useAppDispatch();

  return (
    <>
      <div className="bp-step-title">Choose your style</div>
      <div className="bp-step-sub">{serviceLabel} — select one to continue</div>
      <div className="bp-styles-grid">
        {styles.map(({ id, label }) => {
          const { price, duration } = getStyleRate(id, serviceId, stylistId);
          return (
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
                  <span className="bp-style-price">{`from ${price}`}</span> ·{" "}
                  {duration}
                </span>
              </div>
            </div>
          );
        })}
        {/* For looks that aren't in the catalogue. */}
        {/* TO DO: this is broken, page doesn't appear (I think it's behind), 
        also, we need to think about the workflow of this -- how will it be submitted to the stylist &
        how will we get back to the customer? */}
        <div
          className="bp-style-card bp-style-other"
          onClick={() => dispatch(modalOpened("otherStyle"))}
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

      <div className="bp-nav-btns">
        <button className="bp-btn-back" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  );
}
