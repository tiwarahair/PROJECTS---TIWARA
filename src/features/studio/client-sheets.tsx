import { useRef } from "react";
import { joinClassNames } from "../../utils/class-names";
import type { ClientsView } from "./clients-view";
import { ClientProfile } from "./studio-clients";
import styles from "./client-sheets.module.css";
import clientStyles from "./studio-clients.module.css";
import sheet from "./studio-sheet.module.css";

/** The client's profile in the side panel. */
export const ClientViewSheet = ({ view }: { view: ClientsView }) => (
  <div className={clientStyles.profileSheet}>
    <ClientProfile view={view} variant="sheet" />
  </div>
);

type DraftField =
  "first" | "last" | "phone" | "email" | "products" | "sensitivities";

/** Add or edit a client. */
export const ClientEditSheet = ({ view }: { view: ClientsView }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const { draft, draftImage, duplicate } = view;

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
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
          )}
          <span className={styles.camera}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
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
          />
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
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input
          className={styles.input}
          type="email"
          {...onField("email")}
          placeholder="name@email.com"
        />
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
export const ClientEditFooter = ({ view }: { view: ClientsView }) => (
  <div className={sheet.footerRow}>
    <button className={sheet.cancel} onClick={view.cancelDraft}>
      Cancel
    </button>
    <button
      className={joinClassNames(
        sheet.save48,
        !view.isDraftValid && sheet.faded,
      )}
      onClick={view.saveDraft}
      disabled={!view.isDraftValid}
    >
      {view.saveLabel}
    </button>
  </div>
);
