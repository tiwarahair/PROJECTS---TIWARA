import { getAvatarSrc } from "../core/format";
import { getClient } from "../core/model";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/clients/summary-sheet.module.css";

/** The older "Client" sheet, still reachable from the booking flow. */
export const ClientSummarySheet = ({
  studio,
}: {
  studio: StudioController;
}) => {
  const { state, actions, seedPast } = studio;

  if (!state.sheetClientId) return null;

  const client = getClient(state, state.sheetClientId);

  const history = seedPast
    .filter((row) => row.client === client.id)
    .map((row) => ({
      key: row.when + row.time,
      service: row.service,
      when: `${row.when} · £${row.price}`,
    }));

  const subtitleLine = [
    client.area || "",
    client.fav ? `Usually books ${client.fav}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className={styles.clientHead}>
        <img
          className={styles.clientAvatar}
          src={getAvatarSrc(client)}
          alt=""
        />
        <div className={styles.flex1}>
          <div className={styles.clientName}>{client.name}</div>
          {subtitleLine && <div className={styles.muted}>{subtitleLine}</div>}
        </div>
      </div>
      <div className={styles.clientStats}>
        <div className={styles.clientStat}>
          <div className={styles.statValue}>{client.visits || 0}</div>
          <div className={styles.statLabel}>Visits</div>
        </div>
        <div className={styles.clientStat}>
          <div className={styles.statValue}>{`£${client.spent || 0}`}</div>
          <div className={styles.statLabel}>Spent</div>
        </div>
        <div className={styles.clientStat}>
          <div className={styles.statSmall}>{client.last || "None yet"}</div>
          <div className={styles.statLabel}>Last visit</div>
        </div>
      </div>
      {history.length > 0 && (
        <>
          <div className={styles.historyTitle}>Recent appointments</div>
          <div className={styles.history}>
            {history.map(({ key, service, when }) => (
              <div key={key} className={styles.historyRow}>
                <span className={styles.bold}>{service}</span>
                <span className={styles.secondary}>{when}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {!state.clientFromBookingId && (
        <button
          className={styles.bookButton}
          onClick={() => {
            const clientId = state.sheetClientId ?? null;

            actions.closeSheet();

            window.setTimeout(() => {
              actions.openSheet("add", {
                addStep: 2,
                addClient: clientId,
                addService: null,
                addDay: null,
                addTime: null,
                addCustom: false,
              });
            }, 230);
          }}
        >
          Book an appointment
        </button>
      )}
    </>
  );
};
