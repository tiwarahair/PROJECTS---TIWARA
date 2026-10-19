import { joinClassNames } from "../../../utils/class-names";
import type { EditKey } from "../logic";
import { CodeStep } from "./code-step";
import { EmailEdit } from "./email-edit";
import { MobileEdit } from "./mobile-edit";
import { NameEdit } from "./name-edit";
import { PendingEmail } from "./pending-email";
import type { EditFormController } from "./use-edit-form";
import styles from "../../../styles/features/account/personal-section/detail-row.module.css";
import ui from "../../../styles/features/account/ui.module.css";

interface DetailRowProps {
  personal: EditFormController;
  editKey: EditKey;
  label: string;
  value: string;
}

export const DetailRow = ({
  personal,
  editKey,
  label,
  value,
}: DetailRowProps) => {
  const {
    state: { profile, edit, emailStep, pendingEmail },
    actions: { setState, focusLater, saveEdit },
    form: { reset },
    cancelEdit,
  } = personal;

  const isView = edit !== editKey;
  const isLocked = !!edit && edit !== editKey;
  const isEmail = editKey === "email";
  const codeStep = edit === "email" && emailStep === "code";

  return (
    <div className={ui.row}>
      <div className={styles.detailHead}>
        <div className={ui.rowLabel}>{label}</div>
        <div className={styles.detailBody}>
          {isView && (
            <>
              <div className={joinClassNames(ui.value, ui.valueOn)}>
                {value}
              </div>
              {isEmail && !!pendingEmail && (
                <PendingEmail personal={personal} />
              )}
            </>
          )}
          {!isView && isEmail && !codeStep && <EmailEdit personal={personal} />}
          {!isView && codeStep && <CodeStep personal={personal} />}
        </div>
        {isView && (
          <button
            className={joinClassNames(ui.outlineButton, isLocked && ui.dimmed)}
            onClick={() => {
              reset({ ...profile, email: isEmail ? "" : profile.email });

              setState({ edit: editKey, emailStep: "" }, () =>
                focusLater("edit"),
              );
            }}
            aria-label={`Edit ${label.toLowerCase()}`}
            disabled={isLocked}
          >
            Edit
          </button>
        )}
      </div>
      {!isView && editKey === "name" && <NameEdit personal={personal} />}
      {!isView && editKey === "mobile" && <MobileEdit personal={personal} />}
      {!isView && !isEmail && (
        <div className={styles.editActions}>
          <button className={styles.saveEdit} onClick={saveEdit}>
            Save
          </button>
          <button className={ui.cancel} onClick={cancelEdit}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
