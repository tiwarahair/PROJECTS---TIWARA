import { cx } from "../../utils/class-names";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { sizeGuideClosed } from "../../stores/overlays-slice";
import { GuideModal } from "./guide-modal";
import { SIZE_OPTIONS } from "../../data/style-config/size";

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
        {SIZE_OPTIONS.map(
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
                {Array.from({ length: strandCount || 0 }, (_unused, index) => (
                  <div
                    key={index}
                    className="sg-strand"
                    style={{
                      width: `${strandWidth}px`,
                      height: `${52}px`,
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
      <div className="sg-note">
        ✶ Medium is our most-requested size and recommended for first-time
        clients. Your stylist will advise at the appointment.
      </div>
    </GuideModal>
  );
}
