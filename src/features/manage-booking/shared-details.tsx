import { AllergyField } from "../../components/allergy-field/allergy-field";
import { joinClassNames } from "../../utils/class-names";
import { getEntryStylist } from "./manage-booking-logic";
import type { SharedEntry } from "./manage-booking-logic";
import styles from "./shared-details.module.css";

interface SharedDetailsProps {
  isAccount: boolean;
  title: string;
  subtitle: string;
  entries: SharedEntry[];
  editing: number;
  draft: string;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onDraft: (text: string) => void;
  onSave: (index: number) => void;
  onCancel: () => void;
}

/** "Shared with {stylist}": the allergies row with Edit / Add and Remove, or the inline AllergyField editor. */
export const SharedDetails = ({
  isAccount,
  title,
  subtitle,
  entries,
  editing,
  draft,
  onEdit,
  onRemove,
  onDraft,
  onSave,
  onCancel,
}: SharedDetailsProps) => (
  <section className={styles.section}>
    <h2 className={styles.title}>{title}</h2>
    <p className={styles.sub}>{subtitle}</p>
    <div className={styles.rows}>
      {entries.map(({ id, text }, index) => {
        const { name } = getEntryStylist(id);
        const has = !!text;
        const isEditing = editing === index;

        return (
          <div key={id} className={styles.row}>
            <div className={styles.rowHead}>
              <div className={styles.rowText}>
                <div className={styles.label}>
                  {isAccount ? name : "Allergies or sensitivities"}
                </div>
                {!isEditing && (
                  <div
                    className={joinClassNames(
                      styles.value,
                      has ? styles.valueShared : styles.valueNone,
                    )}
                  >
                    {has ? text : "None shared"}
                  </div>
                )}
              </div>
              {!isEditing && (
                <div className={styles.actions}>
                  <button
                    onClick={() => onEdit(index)}
                    className={styles.button}
                  >
                    {has ? "Edit" : "Add"}
                  </button>
                  {has && (
                    <button
                      onClick={() => onRemove(index)}
                      className={styles.button}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
            {isEditing && (
              <div className={styles.editor}>
                <AllergyField
                  stylistName={name}
                  value={draft}
                  onChange={onDraft}
                  autoFocus
                />
                <div className={styles.editorActions}>
                  <button onClick={() => onSave(index)} className={styles.save}>
                    Save
                  </button>
                  <button onClick={onCancel} className={styles.cancel}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </section>
);
