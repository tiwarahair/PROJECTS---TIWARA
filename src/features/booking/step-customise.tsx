import { cx } from "../../utils/class-names";
import { useAppDispatch } from "../../stores/hooks";
import { sizeGuideOpened } from "../../stores/overlays-slice";
import { COLOURS } from "../../data/colours";
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
        <span className="bp-custom-label">Length</span>
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
          {COLOURS.map(({ id, swatch, title, label }) => (
            <div
              key={id}
              className={cx(
                "bp-swatch",
                id === "other" && "bp-swatch--other",
                id === colourId && "sel",
              )}
              style={{ background: swatch }}
              title={title}
              onClick={() => onSelectColour(id)}
            >
              <span className="bp-swatch-label">{label}</span>
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
        {ADD_ONS.map(({ id, label, price, comingSoon, note }) => (
          <label
            key={id}
            className={cx(
              "bp-addon",
              comingSoon && "bp-addon--soon",
              note && "bp-addon--other",
            )}
          >
            <input
              type="checkbox"
              disabled={comingSoon}
              checked={!comingSoon && addOnIds.includes(id)}
              onChange={() => onToggleAddOn(id)}
            />{" "}
            {label}{" "}
            {comingSoon ? (
              <span className="bp-addon-coming">Coming soon</span>
            ) : note ? (
              <span className="bp-addon-note">{note}</span>
            ) : (
              <span className="bp-addon-price">+£{price}</span>
            )}
          </label>
        ))}
      </div>

      <BookingNav onBack={onBack} onNext={onNext} nextLabel="Continue →" />
    </>
  );
}
