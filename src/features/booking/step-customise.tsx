import { cx } from "../../utils/class-names";
import { useAppDispatch } from "../../stores/hooks";
import {
  lengthGuideOpened,
  sizeGuideOpened,
} from "../../stores/overlays-slice";
import { COLOUR_SWATCH_LABELS, COLOURS } from "../../data/colours";
import { LENGTH_OPTIONS } from "../../data/lengths";
import { ADD_ONS, SIZE_OPTIONS } from "../../data/booking-calendar";
import { getService } from "../../data/service-categories";
import type { BraidSize } from "../../types/booking";
import type { ColourId, ServiceCategoryKey } from "../../types/domain";
import { BookingNav } from "./booking-nav";

export interface StepCustomiseProps {
  serviceCategoryKey: ServiceCategoryKey;
  colourId: ColourId;
  lengthIndex: number;
  size: BraidSize;
  addOnIds: string[];
  onSelectColour: (colourId: ColourId) => void;
  onSelectLength: (index: number) => void;
  onSelectSize: (size: BraidSize) => void;
  onToggleAddOn: (addOnId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepCustomise({
  serviceCategoryKey,
  colourId,
  lengthIndex,
  size,
  addOnIds,
  onSelectColour,
  onSelectLength,
  onSelectSize,
  onToggleAddOn,
  onBack,
  onNext,
}: StepCustomiseProps) {
  const dispatch = useAppDispatch();
  const { hasLength, hasSize } = getService(serviceCategoryKey);

  return (
    <>
      <div className="bp-step-title">Customise your look</div>
      <div className="bp-step-sub">
        Every selection updates the preview on the right
      </div>

      {/* Length and size are hidden per category rather than unmounted, as
          they were when the original toggled style.display. */}
      <div
        className="bp-custom-group"
        style={hasLength ? undefined : { display: "none" }}
      >
        <span className="bp-custom-label">
          Length{" "}
          <button
            className="guide-link"
            onClick={() => dispatch(lengthGuideOpened())}
          >
            Length guide →
          </button>
        </span>
        <div className="bp-length-opts">
          {LENGTH_OPTIONS.map(({ name, inches }, index) => (
            <div
              key={name}
              className={cx("bp-len-opt", index === lengthIndex && "sel")}
              onClick={() => onSelectLength(index)}
            >
              {name}
              <span className="sub">{inches}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bp-custom-group">
        <span className="bp-custom-label">Colour</span>
        <div className="bp-colour-grid">
          {COLOURS.map(({ id, swatch, name }) => (
            <div
              key={id}
              className={cx("bp-swatch", id === colourId && "sel")}
              style={{ background: swatch }}
              title={name}
              onClick={() => onSelectColour(id)}
            >
              <span className="bp-swatch-label">
                {COLOUR_SWATCH_LABELS[id]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="bp-custom-group"
        style={hasSize ? undefined : { display: "none" }}
      >
        <span className="bp-custom-label">
          Size / Thickness{" "}
          <button
            className="guide-link"
            onClick={() => dispatch(sizeGuideOpened())}
          >
            Size guide →
          </button>
        </span>
        <div className="bp-size-opts">
          {SIZE_OPTIONS.map((option) => (
            <div
              key={option}
              className={cx("bp-size-opt", option === size && "sel")}
              onClick={() => onSelectSize(option)}
            >
              {option}
            </div>
          ))}
        </div>
      </div>

      <div className="bp-custom-group">
        <span className="bp-custom-label">Add-ons (optional)</span>
        {ADD_ONS.map(({ id, label, price }) => (
          <label key={id} className="bp-addon">
            <input
              type="checkbox"
              checked={addOnIds.includes(id)}
              onChange={() => onToggleAddOn(id)}
            />{" "}
            {label} <span className="bp-addon-price">+£{price}</span>
          </label>
        ))}
      </div>

      <BookingNav onBack={onBack} onNext={onNext} nextLabel="Continue →" />
    </>
  );
}
