import { joinClassNames } from "../../../utils/class-names";
import type { EditFormController } from "./use-edit-form";
import styles from "../../../styles/features/account/personal-section/email-edit.module.css";
import shared from "../../../styles/features/account/personal-section/index.module.css";
import ui from "../../../styles/features/account/ui.module.css";

interface EmailEditProps {
  personal: EditFormController;
}

export const EmailEdit = ({
  personal: {
    state: { profile },
    actions: { saveEdit },
    form: { register },
    errors,
    getBorderClass,
    cancelEdit,
  },
}: EmailEditProps) => (
  <div className={styles.emailEdit} data-screen-label="Email: editing">
    <div>
      <div className={styles.currentLabel}>Current email</div>
      <div className={styles.currentValue}>{profile.email}</div>
    </div>
    <div className={ui.field}>
      <label className={ui.labelText} htmlFor="ac-new-email">
        New email
      </label>
      <input
        className={joinClassNames(ui.input, getBorderClass("email"))}
        id="ac-new-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        {...register("email")}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;

          event.preventDefault();
          saveEdit();
        }}
        aria-invalid={errors.email ? "true" : "false"}
        aria-describedby="ac-e-email"
      />
      <div className={ui.error} id="ac-e-email" role="alert">
        {errors.email?.message}
      </div>
    </div>
    <div className={ui.actions}>
      <button className={shared.continue} onClick={saveEdit}>
        Continue
      </button>
      <button className={ui.cancel} onClick={cancelEdit}>
        Cancel
      </button>
    </div>
  </div>
);
