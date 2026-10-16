import { useRef } from "react";
import { Camera, User } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { ClientForm } from "./use-client-form";
import type { ClientsView } from "./view";
import { ClientProfile } from ".";
import styles from "../../../styles/features/studio/clients/sheets.module.css";
import clientStyles from "../../../styles/features/studio/clients/index.module.css";
import sheet from "../../../styles/features/studio/shell/sheet-frame.module.css";

/** The client's profile in the side panel. */
export const ClientViewSheet = ({ view }: { view: ClientsView }) => (
  <div className={clientStyles.profileSheet}>
    <ClientProfile view={view} variant="sheet" />
  </div>
);

const FieldError = ({ message }: { message: string | undefined }) =>
  message ? (
    <span className={styles.fieldError} role="alert">
      {message}
    </span>
  ) : null;

type DraftField =
  "first" | "last" | "phone" | "email" | "products" | "sensitivities";

interface ClientEditProps {
  view: ClientsView;
  form: ClientForm;
}

/** Add or edit a client. */
export const ClientEditSheet = ({ view, form }: ClientEditProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const { draft, draftImage, duplicate } = view;
  const { errors } = form.formState;

  if (!draft) return null;

  const pickImage = () => fileRef.current?.click();
  const getValue = (field: DraftField) => draft[field] || "";

  const onField = (field: DraftField) => ({
    value: getValue(field),
    onChange: (event: { target: { value: string } }) =>
      view.patchDraft({ [field]: event.target.value }),
  });

  return (
    <div className={styles.form}>
      <div className={styles.photoRow}>
        <input
          className={styles.hidden}
          type="file"
          accept="image/*"
          ref={fileRef}
          onChange={view.onDraftImage}
        />
        <button
          className={styles.photo}
          onClick={pickImage}
          aria-label="Add profile photo"
        >
          {draftImage ? (
            <img
              className={styles.image}
              src={draftImage}
              alt="Profile photo"
            />
          ) : (
            <span className={styles.placeholder}>
              <User size={22} strokeWidth={1.8} />
            </span>
          )}
          <span className={styles.camera}>
            <Camera size={11} strokeWidth={2.4} />
          </span>
        </button>
        <div className={styles.grow}>
          <button className={styles.pick} onClick={pickImage}>
            {draftImage ? "Change photo" : "Add a profile photo"}
          </button>
          <div className={styles.hint}>
            Helps you spot them at a glance. Clients never see it.
          </div>
          {!!draftImage && (
            <button
              className={styles.remove}
              onClick={() => view.patchDraft({ img: "" })}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <div className={styles.names}>
        <label className={styles.field}>
          <span className={styles.label}>First name</span>
          <input
            className={styles.input}
            {...onField("first")}
            autoComplete="off"
            aria-invalid={errors.first ? "true" : "false"}
          />
          <FieldError message={errors.first?.message} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Last name</span>
          <input
            className={styles.input}
            {...onField("last")}
            autoComplete="off"
          />
        </label>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Phone</span>
        <input
          className={styles.input}
          type="tel"
          {...onField("phone")}
          placeholder="07700 900000"
          aria-invalid={errors.phone ? "true" : "false"}
        />
        <FieldError message={errors.phone?.message} />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input
          className={styles.input}
          type="email"
          {...onField("email")}
          placeholder="name@email.com"
          aria-invalid={errors.email ? "true" : "false"}
        />
        <FieldError message={errors.email?.message} />
      </label>
      {duplicate.isOn && (
        <div className={styles.duplicate} role="alert">
          <img className={styles.duplicateAvatar} src={duplicate.img} alt="" />
          <div className={styles.grow}>
            <div className={styles.duplicateTitle}>{duplicate.title}</div>
            <div className={styles.duplicateSub}>{duplicate.subtitle}</div>
            <button className={styles.duplicateGo} onClick={duplicate.onSelect}>
              {duplicate.cta}
            </button>
          </div>
        </div>
      )}
      <div className={styles.notesHead}>
        <div className={styles.notesTitle}>Hair notes</div>
        <div className={styles.hint}>
          Private to you. Applies to every appointment.
        </div>
      </div>
      <label className={styles.field}>
        <textarea
          className={joinClassNames(styles.input, styles.textarea)}
          {...onField("products")}
          rows={5}
          aria-label="Hair notes"
          placeholder="Products, how they like it, anything to avoid"
        ></textarea>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>
          Allergy or sensitivity{" "}
          <span className={styles.optional}>(optional)</span>
        </span>
        <input
          className={styles.input}
          {...onField("sensitivities")}
          maxLength={80}
          placeholder="e.g. Sensitive scalp"
        />
        <span className={styles.sensHint}>
          Shows on every booking for this client. They never see it.
        </span>
      </label>
    </div>
  );
};

/** Cancel / Save under the client form. */
export const ClientEditFooter = ({ view, form }: ClientEditProps) => (
  <div className={sheet.footerRow}>
    <button className={sheet.cancel} onClick={view.cancelDraft}>
      Cancel
    </button>
    <button
      className={joinClassNames(
        sheet.save48,
        view.duplicate.isOn && sheet.faded,
      )}
      onClick={() => void form.handleSubmit(view.saveDraft)()}
      disabled={view.duplicate.isOn}
    >
      {view.saveLabel}
    </button>
  </div>
);
