import { Check, Plus, Search } from "lucide-react";
import { asStyle } from "../../../../utils/as-style";
import { joinClassNames } from "../../../../utils/class-names";
import { NewClientForm } from "./new-client-form";
import type { AddBookingView } from "./view";
import styles from "../../../../styles/features/studio/bookings/add/who-step.module.css";
import shared from "../../../../styles/features/studio/bookings/add/index.module.css";

interface WhoStepProps {
  view: AddBookingView;
}

const ClientPicker = ({ view }: WhoStepProps) => (
  <>
    <div className={styles.searchWrap}>
      <Search
        className={styles.searchIcon}
        size={15}
        strokeWidth={2}
        color="var(--text-secondary)"
      />
      <input
        className={styles.searchInput}
        value={view.clientQuery}
        onChange={view.onClientQuery}
        placeholder="Search by name or phone"
      />
    </div>
    <div className={styles.clientList}>
      <button className={styles.newRow} onClick={view.toggleNew}>
        <span className={styles.newIcon}>
          <Plus size={15} strokeWidth={2.2} />
        </span>
        <span className={styles.newLabel}>{view.newLabel}</span>
      </button>
      {view.clients.map(
        ({ key, delay, name, imgSrc, subtitle, isOn, pick }) => (
          <button
            key={key}
            className={joinClassNames(
              styles.clientRow,
              isOn && styles.clientRowOn,
            )}
            // runtime: each row's entrance is staggered
            style={asStyle({ "--delay": delay })}
            onClick={pick}
          >
            <img className={styles.avatar36} src={imgSrc} alt="" />
            <span className={shared.grow}>
              <span className={styles.clientName}>{name}</span>
              <span className={shared.clientSub}>{subtitle}</span>
            </span>
            {isOn && (
              <Check size={16} strokeWidth={2.4} color="var(--accent-700)" />
            )}
          </button>
        ),
      )}
      {view.isNoMatch && (
        <div className={styles.noMatch}>
          {`No client matches “${view.clientQuery}”. Add them as a new client above.`}
        </div>
      )}
    </div>
    <button
      className={joinClassNames(
        styles.walkIn,
        view.isWalkIn && styles.walkInOn,
      )}
      onClick={view.pickWalkIn}
    >
      <span className={shared.grow}>
        <span className={styles.walkInLabel}>No client, this is a walk-in</span>
      </span>
    </button>
  </>
);

/** Step 1: pick a client, add a new one, or make it a walk-in. */
export const WhoStep = ({ view }: WhoStepProps) => (
  <>
    <div className={shared.question}>Who is it for?</div>
    {!view.newClient && <ClientPicker view={view} />}
    {view.newClient && <NewClientForm view={view} newClient={view.newClient} />}
  </>
);
