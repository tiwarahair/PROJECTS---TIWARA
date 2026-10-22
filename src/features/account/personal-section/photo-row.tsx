import { Pencil } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import type { AccountController } from "../use-account";
import styles from "../../../styles/features/account/personal-section/photo-row.module.css";
import ui from "../../../styles/features/account/ui.module.css";

interface PhotoRowProps {
  account: AccountController;
  initials: string;
}

export const PhotoRow = ({
  account: { state, data, refs, actions },
  initials,
}: PhotoRowProps) => (
  <div className={ui.row} data-screen-label="Profile photo">
    <div className={styles.photoHead}>
      <div className={ui.rowLabel}>
        Profile photo
        <span className={ui.optional}>(optional)</span>
      </div>
      <div className={styles.photoBody}>
        <button
          className={styles.photoButton}
          onClick={() => refs.file.current?.click()}
          aria-label={data.hasPhoto ? "Change photo" : "Upload photo"}
        >
          <span className={styles.photoAvatar} aria-hidden="true">
            {data.isPhotoLoading && <Skeleton circle width={56} height={56} />}
            {data.photo && (
              <img className={styles.avatarImage} src={data.photo} alt="" />
            )}
            {!data.photo && !data.isPhotoLoading && initials}
          </span>
          <span className={styles.photoBadge} aria-hidden="true">
            <Pencil size={13} strokeWidth={2} />
          </span>
        </button>
        <div className={ui.buttonRow}>
          {data.hasPhoto && (
            <button
              className={ui.quietButton}
              onClick={() => void actions.savePhoto(null)}
            >
              Remove
            </button>
          )}
        </div>
        <input
          className={styles.fileInput}
          ref={refs.file}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          onChange={actions.onPhoto}
          aria-label="Upload profile photo"
        />
      </div>
    </div>
    <div className={styles.photoHint}>
      Helps your stylist recognise you. JPG, JPEG or PNG, up to 10MB.
    </div>
    <div className={ui.error} role="alert">
      {state.photoError}
    </div>
  </div>
);
