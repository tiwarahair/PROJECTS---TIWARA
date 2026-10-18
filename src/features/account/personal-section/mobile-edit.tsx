import { joinClassNames } from "../../../utils/class-names";
import type { EditFormController } from "./use-edit-form";
import styles from "../../../styles/features/account/personal-section/mobile-edit.module.css";
import ui from "../../../styles/features/account/ui.module.css";

interface MobileEditProps {
  personal: EditFormController;
}

export const MobileEdit = ({
  personal: {
    form: { register },
    errors,
    getBorderClass,
  },
}: MobileEditProps) => (
  <div className={styles.editField}>
    <label className={ui.labelText} htmlFor="ac-mob">
      Mobile
    </label>
    <div
      className={joinClassNames(styles.mobileWrap, getBorderClass("mobile"))}
    >
      <span className={styles.prefix}>+44</span>
      <input
        className={styles.mobileInput}
        id="ac-mob"
        type="tel"
        {...register("mobile")}
        autoComplete="tel-national"
        aria-invalid={errors.mobile ? "true" : "false"}
        aria-describedby="ac-e-mob"
      />
    </div>
    <div className={styles.mobileError} id="ac-e-mob">
      {errors.mobile?.message}
    </div>
  </div>
);
