import { AllergyField } from "../../components/allergy-field/allergy-field";
import { joinClassNames } from "../../utils/class-names";
import { CheckBox } from "../booking/step-customise";
import styles from "../../styles/features/manage-booking/shared-details.module.css";

interface SharedDetailsProps {
  stylistName: string;
  allergies: string;
  isEditing: boolean;
  draft: string;
  consent: boolean;
  error: string;
  isSaving: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onDraft: (text: string) => void;
  onConsent: () => void;
  onSave: () => void;
  onCancel: () => void;
}

/** "Shared with {stylist}": the allergies row with Edit / Add and Remove, or the inline AllergyField editor. */
export const SharedDetails = ({
  stylistName,
  allergies,
  isEditing,
  draft,
  consent,
  error,
  isSaving,
  onEdit,
  onRemove,
  onDraft,
  onConsent,
  onSave,
  onCancel,
}: SharedDetailsProps) => {
  const has = !!allergies;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{`Shared with ${stylistName}`}</h2>
      <p className={styles.sub}>
        {`Only ${stylistName} sees this, on your booking.`}
      </p>
      <div className={styles.rows}>
        <div className={styles.row}>
          <div className={styles.rowHead}>
            <div className={styles.rowText}>
              <div className={styles.label}>Allergies or sensitivities</div>
              {!isEditing && (
                <div
                  className={joinClassNames(
                    styles.value,
                    has ? styles.valueShared : styles.valueNone,
                  )}
                >
                  {has ? allergies : "None shared"}
                </div>
              )}
            </div>
            {!isEditing && (
              <div className={styles.actions}>
                <button onClick={onEdit} className={styles.button}>
                  {has ? "Edit" : "Add"}
                </button>
                {has && (
                  <button onClick={onRemove} className={styles.button}>
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
          {isEditing && (
            <div className={styles.editor}>
              <AllergyField
                stylistName={stylistName}
                value={draft}
                onChange={onDraft}
                autoFocus
              />
              <button
                role="checkbox"
                aria-checked={consent ? "true" : "false"}
                onClick={onConsent}
                className={styles.consent}
              >
                <CheckBox on={consent} />
                <span>{`Share this with ${stylistName} for this booking`}</span>
              </button>
              {!!error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <div className={styles.editorActions}>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className={styles.save}
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                <button onClick={onCancel} className={styles.cancel}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
