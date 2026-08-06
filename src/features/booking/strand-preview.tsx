import { useMemo } from "react";
import { cx } from "../../utils/class-names";
import { buildStrandPaths } from "../../utils/strand-path";
import { findColourById } from "../../data/style-config/colours";
import {
  getLengthIndex,
  lengthLabel,
  LENGTH_OPTIONS,
} from "../../data/style-config/lengths";
import { strandConfigFor } from "../../data/other/strand-configs";
import type { ColourId, LengthId } from "../../types/styles";

export interface StrandPreviewProps {
  styleId: string | null;
  colourId: ColourId;
  lengthId: LengthId;
  stylistName: string;
  /** Name and price shown over the artwork. */
  styleName: string;
  stylePrice: string;
}

// TO DO: HMM, I THINK THIS IS FOR THE PIC PLACEHOLDER, REMOVE A LOT OF THIS METHINKS

export function StrandPreview({
  styleId,
  colourId,
  lengthId,
  stylistName,
  styleName,
  stylePrice,
}: StrandPreviewProps) {
  const config = strandConfigFor(styleId);
  const colour = findColourById(colourId);
  const activeLengthIndex = getLengthIndex(lengthId);
  const paths = useMemo(() => buildStrandPaths(config), [config]);

  return (
    <div className="bp-image-panel">
      {/* === REMOVE (& ALL STRAND-SPECIFIC STUFF)(strand-config.ts & all css classes) == */}
      {/* Data-derived, so it stays a style object — .bp-img-glow transitions
          its background, which is why the element stays mounted. */}
      <div
        className="bp-img-glow"
        style={{
          background: `radial-gradient(ellipse at center, 0%, transparent 70%)`,
        }}
      />
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
      <div className="bp-img-overlay" />
      {/* ===== */}

      <div className="bp-img-placeholder">
        Add your editorial
        <br />
        photography here
      </div>
      <div className="bp-img-price">{stylePrice}</div>
      <div className="bp-img-info">
        {/* TO DO: FIX PROGRESS BAr, shouldnt use LENGTHs i think */}
        <div className="bp-img-length-bar">
          {LENGTH_OPTIONS.map(({ value }, index) => (
            <div
              key={value}
              className={cx(
                "bp-lbar-item",
                index <= activeLengthIndex && "active",
              )}
            />
          ))}
        </div>
        <div className="bp-img-style-name">{styleName}</div>
        <div className="bp-img-meta">
          {colour.name} · {lengthLabel(lengthId)} · {stylistName}
        </div>
      </div>
    </div>
  );
}
