import { cx } from "../../utils/class-names";
import { useAppDispatch } from "../../stores/hooks";
import { modalOpened } from "../../stores/modals-slice";
import { LENGTH_OPTIONS } from "../../data/style-config/lengths";
import { BookingNav } from "./booking-nav";
import { COLOUR_OPTIONS } from "../../data/style-config/colours";
import type {
  BraidSize,
  ColourId,
  HairTextureId,
  LengthId,
} from "../../types/styles";
import { HAIR_TEXTURE_OPTIONS } from "../../data/style-config/hair-textures";
import { SIZE_OPTIONS } from "../../data/style-config/size";
import { getService } from "../../data/services/services";
import type { ServiceId } from "../../types/services";
import { getServiceAddOns } from "../../data/style-config/add-ons";
import { formatPenceCompact } from "../../utils/money";

export interface StepCustomiseProps {
  serviceId: ServiceId;
  colourId: ColourId;
  lengthId: LengthId;
  hairTextureId: HairTextureId;
  size: BraidSize;
  addOnIds: string[];
  onSelectColour: (colourId: ColourId) => void;
  onSelectLength: (lengthId: LengthId) => void;
  onSelectHairTexture: (hairTextureId: HairTextureId) => void;
  onSelectSize: (size: BraidSize) => void;
  onToggleAddOn: (addOnId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepCustomise({
  serviceId,
  colourId,
  lengthId,
  hairTextureId,
  size,
  addOnIds,
  onSelectColour,
  onSelectLength,
  onSelectHairTexture,
  onSelectSize,
  onToggleAddOn,
  onBack,
  onNext,
}: StepCustomiseProps) {
  const dispatch = useAppDispatch();
  const { configs: { size: hasSize, length, colour, hairTexture } = {} } =
    getService(serviceId);

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
          {LENGTH_OPTIONS.map(({ name, value, inches }) => (
            <div
              key={value}
              className={cx("bp-len-opt", value === lengthId && "sel")}
              onClick={() => onSelectLength(value)}
            >
              {name}
              <span className="sub">{inches}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="bp-custom-group"
        style={hairTexture ? undefined : { display: "none" }}
      >
        <span className="bp-custom-label">Hair texture</span>
        <div className="bp-texture-opts">
          {HAIR_TEXTURE_OPTIONS.map(({ name, value }) => (
            <div
              key={value}
              className={cx("bp-texture-opt", value === hairTextureId && "sel")}
              onClick={() => onSelectHairTexture(value)}
            >
              {name}
            </div>
          ))}
        </div>
      </div>

      <div
        className="bp-custom-group"
        style={colour ? undefined : { display: "none" }}
      >
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
            onClick={() => dispatch(modalOpened("sizeGuide"))}
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
        {getServiceAddOns(serviceId).map(
          ({ id, name, addedCostPence, pending }) => (
            <label
              key={id}
              className={cx(
                "bp-addon",
                pending && "bp-addon--soon",
                id === "other" && "bp-addon--other",
              )}
            >
              <input
                type="checkbox"
                disabled={pending}
                checked={!pending && addOnIds.includes(id)}
                onChange={() => onToggleAddOn(id)}
              />{" "}
              {name}{" "}
              {pending ? (
                <span className="bp-addon-coming">Coming soon</span>
              ) : id === "other" ? (
                <span className="bp-addon-note">
                  {"(specify in appointment notes)"}
                </span>
              ) : (
                <span className="bp-addon-price">
                  +{formatPenceCompact(addedCostPence ?? 0)}
                </span>
              )}
            </label>
          ),
        )}
      </div>

      <BookingNav onBack={onBack} onNext={onNext} nextLabel="Continue →" />
    </>
  );
}
