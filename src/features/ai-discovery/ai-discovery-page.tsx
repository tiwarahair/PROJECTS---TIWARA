import { cx } from "../../utils/class-names";
import { useNavigate } from "react-router";
import { isOpen, useRouteSurfaces } from "../../hooks/use-route-surfaces";
import { useSurfaceNav } from "../../hooks/use-surface-nav";
import { bookingPath } from "../../routes/routes";
import { firstUnansweredStep } from "../../types/booking";
import { isCustomisable } from "../../data/services/services";
import { lengthLabel } from "../../data/style-config/lengths";
import { AI_CONFIDENCE_LABELS } from "../../data/other/ai-maps";
import { useAIDiscovery } from "./use-ai-discovery";
import type { AiStyleMatch } from "../../data/other/ai-maps";

// TO DO: ALL AI DISCOVERY FILES SEEM BOGUS - CLEAN UP / COMPELTELY REFACTOR (NOT READ IT)
// this includes useAIDiscoveryhook & all all its data

export function AIDiscoveryPage() {
  const navigate = useNavigate();
  const surfaces = useRouteSurfaces();
  const { close } = useSurfaceNav();
  const open = isOpen(surfaces, "aiDiscovery");
  const {
    phase,
    previewSrc,
    result,
    uploadKey,
    handleFile,
    handleImageLoad,
    retry,
  } = useAIDiscovery();

  function bookMatch({ serviceId, styleId }: AiStyleMatch) {
    // The detected colour and length are deliberately not passed on: the
    // original set them and then openBooking immediately reset both to 1B and
    // Medium. Preserved — see the behaviour-parity register.
    // The style is, though: identifying it is the whole point of the upload.
    const step = firstUnansweredStep({
      serviceId,
      styleId,
      stylistId: null,
      customisable: isCustomisable(serviceId),
    });
    navigate(bookingPath(step, { service: serviceId, style: styleId }));
  }

  return (
    <div id="aiDiscovery" className={cx("ai-overlay", open && "open")}>
      <div className="ai-header">
        <button className="ai-back" onClick={close}>
          Back
        </button>
        <span className="ai-title">AI Style Discovery</span>
        <span className="ai-header-spacer" />
      </div>

      <div className="ai-body">
        <div className="ai-content">
          <div className={cx("ai-step", phase !== "results" && "active")}>
            <h2 className="ai-intro-title">Find your style</h2>
            <p className="ai-intro-text">
              Upload an inspo photo and we&apos;ll identify the style, colour,
              and length — then link you straight to booking.
            </p>

            {phase === "upload" && (
              <div className="ai-upload-zone">
                {/* Remounted via key on retry so re-picking the same file
                    still fires a change event. */}
                <input
                  key={uploadKey}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                <div className="ai-upload-icon">✦</div>
                <div className="ai-upload-title">
                  Drop your inspo photo here
                </div>
                <p className="ai-upload-sub">
                  or click to browse — JPG, PNG, HEIC up to 10MB
                </p>
              </div>
            )}

            {previewSrc && (
              <img
                className="ai-img-preview"
                src={previewSrc}
                alt="Your inspo photo"
                // onLoad is registered with the src in the same commit, so it
                // cannot be missed for a cached data URL.
                onLoad={(event) => handleImageLoad(event.currentTarget)}
              />
            )}

            {phase === "analysing" && (
              <div className="ai-analysing">
                <div className="ai-spin" />
                <p className="ai-analyse-text">Analysing your look…</p>
              </div>
            )}
          </div>

          <div className={cx("ai-step", phase === "results" && "active")}>
            <h2 className="ai-result-heading">We found your look ✦</h2>
            <p className="ai-result-sub">
              Based on your photo, here&apos;s what we detected:
            </p>
            <div className="ai-result-card">
              <div className="ai-result-row">
                <span className="ai-result-key">Style</span>
                <span className="ai-result-val">{result?.style.name}</span>
              </div>
              <div className="ai-result-row">
                <span className="ai-result-key">Colour</span>
                <span className="ai-result-val">{result?.colour.name}</span>
              </div>
              <div className="ai-result-row">
                <span className="ai-result-key">Length</span>
                <span className="ai-result-val">
                  {result ? lengthLabel(result.lengthId) : ""}
                </span>
              </div>
            </div>
            <span className="ai-match-label">Matching services</span>
            <div className="ai-match-styles">
              {result?.matches.map((match, index) => (
                <div
                  key={match.styleId}
                  className="ai-match-card"
                  onClick={() => bookMatch(match)}
                >
                  <div>
                    <div className="ai-match-name">{match.name}</div>
                    <div className="ai-match-conf">
                      {AI_CONFIDENCE_LABELS[index]}
                    </div>
                  </div>
                  <div className="ai-match-right">
                    <div className="ai-match-price">{match.price}</div>
                    <div className="ai-match-arrow">Book →</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="bp-btn-back ai-retry-btn" onClick={retry}>
              Try another photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
