import { useMemo, type CSSProperties } from "react";
import { cx } from "../../utils/class-names";
import { buildStrandPaths } from "../../utils/strand-path";
import {
  colourSolid,
  colourStrand,
  findColourById,
} from "../../data/style-config/colours";
import { lengthLabel } from "../../data/style-config/lengths";
import { strandConfigFor } from "../../data/other/strand-configs";
import { getStylePhoto } from "./style-photos";
import { StylePhoto } from "./style-photo";
import type { ColourId, LengthId } from "../../types/styles";
import type { CustomisableGroup } from "../../types/services";

export interface StrandPreviewProps {
  serviceId: string | null;
  styleId: string | null;
  colourId: ColourId;
  lengthId: LengthId;
  stylistName: string;
  /** Name and price shown over the artwork. */
  styleName: string;
  stylePrice: string;
  /** The look groups this service asks about — one bar segment each. */
  groups: CustomisableGroup[];
  /** Which of those the client has actually answered. */
  chosenGroups: CustomisableGroup[];
  /** The bar and the look caption belong to the customise step alone. */
  onCustomiseStep: boolean;
}

// TO DO: HMM, I THINK THIS IS FOR THE PIC PLACEHOLDER, REMOVE A LOT OF THIS METHINKS

export function StrandPreview({
  serviceId,
  styleId,
  colourId,
  lengthId,
  stylistName,
  styleName,
  stylePrice,
  groups,
  chosenGroups,
  onCustomiseStep,
}: StrandPreviewProps) {
  const config = strandConfigFor(styleId);
  const colour = findColourById(colourId);
  const paths = useMemo(() => buildStrandPaths(config), [config]);
  const photo = getStylePhoto(serviceId, styleId, lengthId, colourId);

  return (
    // The chosen colour reaches the glow and the strands as a custom property,
    // so the rules that use it can stay in the stylesheet.
    <div
      className="bp-image-panel"
      style={
        {
          "--preview-colour": colourSolid(colourId),
          "--strand-colour": colourStrand(colourId),
        } as CSSProperties
      }
    >
      {photo ? (
        <StylePhoto
          src={photo}
          // No style chosen yet means the stand-in photo, which describes no
          // particular look.
          alt={styleName ? `${styleName}, ${colour.name}` : "Braided hair"}
        />
      ) : (
        <>
          {/* === REMOVE (& ALL STRAND-SPECIFIC STUFF)(strand-config.ts & all css classes) == */}
          {/* .bp-img-glow transitions its background, which is why the element
          stays mounted rather than being swapped per colour. */}
          <div className="bp-img-glow" />
          <div className="bp-img-shimmer" />
          {/* #bpStrandSvg is the only id selector in the stylesheet — it positions
          the svg absolutely, so the id has to stay. */}
          <svg
            id="bpStrandSvg"
            viewBox="0 0 560 900"
            preserveAspectRatio="xMidYMid slice"
          >
            {paths.map((path, index) => (
              <path
                key={index}
                d={path.pathData}
                strokeWidth={config.width}
                fill="none"
                strokeLinecap="round"
                opacity={path.opacity}
              />
            ))}
          </svg>
          {/* ===== */}
        </>
      )}

      <div className="bp-img-overlay" />

      {stylePrice && <div className="bp-img-price">{stylePrice}</div>}
      <div className="bp-img-info">
        {/* TO DO: FIX PROGRESS BAr, shouldnt use LENGTHs i think */}
        {onCustomiseStep && groups.length > 0 && (
          <div className="bp-img-length-bar">
            {groups.map((group, index) => (
              <div
                key={group}
                className={cx(
                  "bp-lbar-item",
                  index < chosenGroups.length && "active",
                )}
              />
            ))}
          </div>
        )}
        <div className="bp-img-style-name">{styleName}</div>
        <div className="bp-img-meta">
          {/* Takes no width until the customise step, so the stylist name sits
              alone at the left and is pushed right as this expands. */}
          {/* Non-breaking space: a normal one is collapsed away by the
              overflow clip, running the caption into the stylist name. */}
          <span className={cx("bp-img-meta-look", onCustomiseStep && "shown")}>
            {colour.name} · {lengthLabel(lengthId)} ·{" "}
          </span>
          <span>{stylistName}</span>
        </div>
      </div>
    </div>
  );
}
