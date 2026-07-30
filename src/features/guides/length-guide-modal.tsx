import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { lengthGuideClosed } from "../../stores/overlays-slice";
import { LENGTH_LABELS, LENGTH_MARKERS } from "../../data/guide-content";
import { GuideModal } from "./guide-modal";

/** Non-breaking space between the marker name and its measurement. */
const NBSP = " ";

export function LengthGuideModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.overlays.overlay.lengthGuide);

  return (
    <GuideModal
      id="lengthGuideModal"
      title="Length Guide"
      open={open}
      onClose={() => dispatch(lengthGuideClosed())}
    >
      <div className="lg-chart">
        <div className="lg-silhouette">
          <div className="lg-figure">
            <div className="lg-head" />
            <div className="lg-body" />
          </div>
          <div className="lg-markers">
            {LENGTH_MARKERS.map(({ name, inches }) => (
              <div key={name} className="lg-marker">
                <div className="lg-marker-line" />
                <span>
                  <strong>{name}</strong>
                  {NBSP}
                  {inches}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="lg-labels">
          {LENGTH_LABELS.map(({ name, inches }) => (
            <div key={name} className="lg-label-item">
              <span className="lg-label-name">{name}</span>
              <span className="lg-label-inches">{inches}</span>
            </div>
          ))}
        </div>
      </div>
    </GuideModal>
  );
}
