import { cx } from "../../utils/class-names";
import { useAppDispatch } from "../../stores/hooks";
import { sizeGuideOpened } from "../../stores/overlays-slice";
import { LENGTH_OPTIONS } from "../../data/style-config/lengths";
import { ADD_ONS } from "../../data/other/booking-calendar";
import { BookingNav } from "./booking-nav";
import { COLOUR_OPTIONS } from "../../data/style-config/colours";
import type { BraidSize, ColourId } from "../../types/styles";
import { SIZE_OPTIONS } from "../../data/style-config/size";
import { getService } from "../../data/services/services";
import type { ServiceId } from "../../types/services";

export interface StepCustomiseProps {
  serviceCategoryKey: ServiceId;
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
  const { configs: { size: hasSize, length } = {} } =
    getService(serviceCategoryKey);

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
        style={length ? undefined : { display: "none" }}
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
          {COLOUR_OPTIONS.map(({ value, hex, name }) => (
            <div
              key={value}
              className={cx(
                "bp-swatch",
                value === "other" && "bp-swatch--other",
                value === colourId && "sel",
              )}
              style={{ background: hex }}
              title={name}
              onClick={() => onSelectColour(value)}
            >
              <span className="bp-swatch-label">{name}</span>
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
          {SIZE_OPTIONS.map(({ name }) => (
            <div
              key={name}
              className={cx("bp-size-opt", name === size && "sel")}
              onClick={() => onSelectSize(name)}
            >
              {name}
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
