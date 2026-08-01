import { useEffect, useRef, useState } from "react";
import { cx } from "../../utils/class-names";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { pageClosed } from "../../stores/overlays-slice";

export function OtherStyleOverlay() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.overlays.overlay.otherStyle);
  const [description, setDescription] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const wasOpen = useRef(false);

  // Closing the overlay clears the whole form
  useEffect(() => {
    if (wasOpen.current && !open) {
      setDescription("");
      setPreviewSrc(null);
      setShowError(false);
      setSubmitted(false);
      setUploadKey((current) => current + 1);
    }
    wasOpen.current = open;
  }, [open]);

  // Object URLs are revoked when replaced or cleared so the blob is released.
  useEffect(() => {
    if (!previewSrc) return;
    return () => URL.revokeObjectURL(previewSrc);
  }, [previewSrc]);

  function submit() {
    if (!description.trim()) {
      setShowError(true);
      descriptionRef.current?.focus();
      return;
    }
    setShowError(false);
    setSubmitted(true);
  }

  const close = () => dispatch(pageClosed("otherStyle"));

  return (
    <div id="otherStylePage" className={cx("os-overlay", open && "open")}>
      <button className="os-close" onClick={close} aria-label="Close">
        ×
      </button>
      <div className="os-inner">
        <div className="os-header">
          <div className="os-eyebrow">Custom request</div>
          <h2 className="os-title">Request a style</h2>
          <p className="os-sub">
            Don&apos;t see your look in our catalogue? Describe it below. Your
            stylist will review your request and accept or suggest an
            alternative before the appointment is confirmed.
          </p>
        </div>

        {submitted ? (
          <div className="os-success">
            <div className="os-success-icon">✓</div>
            <h3>Request sent!</h3>
            <p>
              Your stylist will review your request and respond within 48 hours.
              We&apos;ll notify you by email as soon as they accept.
            </p>
            <button className="os-done" onClick={close}>
              Back to site
            </button>
          </div>
        ) : (
          <div className="os-form">
            <label className="os-label" htmlFor="osDescription">
              Describe the look you want
            </label>
            <textarea
              id="osDescription"
              ref={descriptionRef}
              className={cx("os-textarea", showError && "os-textarea--error")}
              placeholder={
                'e.g. "Ghana braids into a bun, medium thickness, waist length"'
              }
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            <span className="os-label">
              Upload an inspiration photo{" "}
              <span className="os-optional">(optional but recommended)</span>
            </span>

            {previewSrc ? (
              <div className="os-preview-wrap">
                <img
                  className="os-preview-img"
                  src={previewSrc}
                  alt="Inspiration"
                />
                <button
                  className="os-remove-img"
                  onClick={() => {
                    setPreviewSrc(null);
                    // Remount the input so the same file can be picked again.
                    setUploadKey((current) => current + 1);
                  }}
                >
                  Remove ✕
                </button>
              </div>
            ) : (
              <label className="os-upload-zone">
                <div className="os-upload-icon">📷</div>
                <div className="os-upload-text">Tap to upload a photo</div>
                <div className="os-upload-sub">
                  JPG, PNG or WEBP · Max 10 MB
                </div>
                <input
                  key={uploadKey}
                  type="file"
                  accept="image/*"
                  className="os-file-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setPreviewSrc(URL.createObjectURL(file));
                  }}
                />
              </label>
            )}

            <div className="os-notice">
              <span className="os-notice-icon">ℹ</span>
              <span>
                Your appointment will be <strong>tentative</strong> until the
                stylist accepts your request (usually within 48 hours). No
                payment is taken until confirmed.
              </span>
            </div>

            <button className="os-submit" onClick={submit}>
              Send request →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
