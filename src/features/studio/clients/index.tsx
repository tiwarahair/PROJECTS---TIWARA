import { ChevronLeft } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import { ClientCards } from "./cards";
import { ClientControls } from "./controls";
import { ClientsEmpty } from "./empty";
import { ClientFilters } from "./filters";
import { ClientProfile } from "./profile";
import { ClientTable } from "./table";
import { getClientsView } from "./view";
import styles from "../../../styles/features/studio/clients/index.module.css";

interface StudioClientsProps {
  studio: StudioController;
}

export const StudioClients = ({ studio }: StudioClientsProps) => {
  const { setState, isWide, isDesktop } = studio;
  const view = getClientsView(studio);

  return (
    <div
      className={joinClassNames(
        styles.clients,
        isWide && styles.wide,
        isDesktop && styles.desk,
      )}
      data-screen-label="Clients"
    >
      {view.isList && (
        <div className={styles.list}>
          {!isWide && (
            <button
              className={styles.back}
              onClick={() => setState({ tab: "settings" })}
            >
              <ChevronLeft size={18} strokeWidth={1.7} />
              More
            </button>
          )}
          <ClientControls studio={studio} view={view} />
          <ClientFilters view={view} />
          {view.clientRows.length === 0 && <ClientsEmpty view={view} />}
          {view.clientRows.length > 0 && (
            <div className={styles.rows}>
              {view.isTable ? (
                <ClientTable view={view} />
              ) : (
                <ClientCards view={view} />
              )}
            </div>
          )}
        </div>
      )}
      {view.isProfile && (
        <div className={styles.profilePage}>
          <button
            className={joinClassNames(styles.back, styles.backProfile)}
            onClick={() => setState({ selectedClientId: null })}
          >
            <ChevronLeft size={18} strokeWidth={1.7} />
            Clients
          </button>
          <ClientProfile view={view} variant="page" />
        </div>
      )}
    </div>
  );
};

export { getClientsView };
