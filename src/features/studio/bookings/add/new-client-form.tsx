import { DuplicateNotice } from "../dialogs";
import type { NewClient } from "./types";
import type { AddBookingView } from "./view";
import styles from "../../../../styles/features/studio/bookings/add/new-client-form.module.css";
import shared from "../../../../styles/features/studio/bookings/add/index.module.css";

interface NewClientFormProps {
  view: AddBookingView;
  newClient: NewClient;
}

export const NewClientForm = ({ view, newClient }: NewClientFormProps) => (
  <div className={styles.newClient}>
    <div className={styles.newHead}>
      <span className={styles.newTitle}>New client</span>
      <button className={styles.backToList} onClick={view.toggleNew}>
        Back to list
      </button>
    </div>
    <div className={styles.fields}>
      <label className={shared.block}>
        <span className={shared.fieldLabel}>Full name</span>
        <input
          className={shared.input}
          value={newClient.name}
          onChange={(event) => view.patchNew({ name: event.target.value })}
          placeholder="e.g. Adaeze Nwosu"
        />
      </label>
      <label className={shared.block}>
        <span className={shared.fieldLabel}>Phone</span>
        <input
          className={shared.input}
          type="tel"
          inputMode="tel"
          value={newClient.contact}
          onChange={(event) => view.patchNew({ contact: event.target.value })}
        />
      </label>
      <label className={shared.block}>
        <span className={shared.fieldLabel}>
          Email <span className={shared.optional}></span>
        </span>
        <input
          className={shared.input}
          type="email"
          inputMode="email"
          value={newClient.email || ""}
          onChange={(event) => view.patchNew({ email: event.target.value })}
          placeholder="name@email.com"
        />
      </label>
      {view.isAddressShown && (
        <label className={shared.block}>
          <span className={shared.fieldLabel}>
            Address <span className={shared.optional}>(optional)</span>
          </span>
          <input
            className={shared.input}
            value={newClient.address}
            onChange={(event) => view.patchNew({ address: event.target.value })}
            placeholder="Street, postcode"
          />
        </label>
      )}
    </div>
    <DuplicateNotice duplicate={view.duplicate} />
    <div className={styles.hint}>
      Add an email so they get their confirmation, reminders and receipts. A
      phone number alone is fine, but they won’t get these.
    </div>
  </div>
);
