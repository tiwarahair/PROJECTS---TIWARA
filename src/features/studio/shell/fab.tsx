import { Plus } from "lucide-react";
import { getBlankAddon } from "../services/actions";
import type { StudioState } from "../core/types";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/shell/fab.module.css";

const getAddKind = ({ tab, servicesTab }: StudioState) => {
  if (tab !== "services") return "booking";

  return servicesTab === "addons" ? "addon" : "service";
};

export const Fab = ({ studio }: { studio: StudioController }) => {
  const { state, actions, serviceActions } = studio;

  const adders = {
    booking: { label: "New booking", add: () => actions.openSheet("add") },
    addon: {
      label: "Add add-on",
      add: () => actions.openSheet("addon", { addonDraft: getBlankAddon() }),
    },
    service: {
      label: "Add service",
      add: () => serviceActions.openWizard("add"),
    },
  };

  const { label, add } = adders[getAddKind(state)];

  return (
    <button className={styles.fab} onClick={add} aria-label={label}>
      <Plus size={24} strokeWidth={2.2} />
    </button>
  );
};
