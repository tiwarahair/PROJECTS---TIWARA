import { cx } from "../../utils/class-names";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { sizeGuideClosed } from "../../stores/overlays-slice";
import {
  SG_STRAND_HEIGHT,
  SIZE_GUIDE_ITEMS,
  SIZE_GUIDE_NOTE,
} from "../../data/guide-content";
import { GuideModal } from "./guide-modal";

export function SizeGuideModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.overlays.overlay.sizeGuide);

  return (
    <GuideModal
      id="sizeGuideModal"
      title="Size & Thickness Guide"
      open={open}
      onClose={() => dispatch(sizeGuideClosed())}
    >
      <div className="size-guide-grid">
        {SIZE_GUIDE_ITEMS.map(
          ({
            name,
            recommended,
            strandCount,
            strandWidth,
            badge,
            description,
          }) => (
            <div
              key={name}
              className={cx("sg-item", recommended && "recommended")}
            >
              <div className="sg-visual">
                {Array.from({ length: strandCount }, (_unused, index) => (
                  <div
                    key={index}
                    className="sg-strand"
                    style={{
                      width: `${strandWidth}px`,
                      height: `${SG_STRAND_HEIGHT}px`,
                    }}
                  />
                ))}
              </div>
              <div className="sg-name">{name}</div>
              {badge && <span className="sg-rec">{badge}</span>}
              <div className="sg-desc">{description}</div>
            </div>
          ),
        )}
      </div>
      <div className="sg-note">{SIZE_GUIDE_NOTE}</div>
    </GuideModal>
  );
}
