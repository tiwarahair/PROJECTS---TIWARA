import type { StudioActions, StudioContext } from "../../core/actions";
import { GATE_REASON, ICONS } from "../../core/constants";
import { copyText } from "../../core/format";
import { formatAddon, getServiceBookingLink, isLive } from "../../core/model";
import type { StudioAddon, StudioService } from "../../core/types";
import { getAnchor } from "./helpers";
import type { WizardActions } from "./wizard";

interface MenuEvent {
  currentTarget?: EventTarget | null;
}

const STATUS_ITEMS = {
  archived: {
    label: "Restore",
    icon: ICONS.restore,
    status: "active",
    done: "restored",
  },
  active: {
    label: "Archive",
    icon: ICONS.archive,
    status: "archived",
    done: "archived",
  },
};

const insertAfter = <T extends { id: string }>(
  list: T[],
  id: string,
  item: T,
) => {
  const index = list.findIndex((entry) => entry.id === id);
  const copy = list.slice();

  copy.splice(index + 1, 0, item);

  return copy;
};

export const createMenuActions = (
  { getState, setState }: StudioContext,
  { openSheet, openActionSheet, showToast }: StudioActions,
  { openWizard }: WizardActions,
) => {
  const getStatusItem = (
    current: string | undefined,
    name: string,
    setStatus: (status: string) => void,
  ) => {
    const { label, icon, status, done } =
      STATUS_ITEMS[current === "archived" ? "archived" : "active"];

    return {
      label,
      icon,
      run: () => {
        setStatus(status);
        showToast(`${name} ${done}`);
      },
    };
  };

  const copyServiceLink = ({ id, name, status }: StudioService) => {
    const state = getState();

    if (!isLive(state)) {
      showToast(GATE_REASON);

      return;
    }

    if (status !== "active") {
      showToast(`Make ${name} active to share its booking link.`);

      return;
    }

    void copyText(getServiceBookingLink(state, id)).then(
      () => showToast(`Booking link for ${name} copied`),
      () => showToast("The booking link couldn’t be copied. Try again."),
    );
  };

  const openServiceActions = (
    service: StudioService,
    event?: MenuEvent | null,
  ) => {
    const setStatus = (status: string) =>
      setState(({ services }) => ({
        services: services.map((item) =>
          item.id === service.id ? { ...item, status } : item,
        ),
      }));

    openActionSheet({
      title: service.name,
      subtitle: `${service.duration} · £${service.price}`,
      anchor: getAnchor(event),
      items: [
        {
          label: "Edit",
          icon: ICONS.edit,
          run: () => openWizard("edit", service),
        },
        {
          label: "Duplicate",
          icon: ICONS.copy,
          run: () => {
            const copy = {
              ...service,
              id: crypto.randomUUID(),
              name: `${service.name} (copy)`,
              sizes: (service.sizes || []).map((row) => ({ ...row })),
              lengths: (service.lengths || []).map((row) => ({ ...row })),
              addons: (service.addons || []).map((link) => ({ ...link })),
            };

            setState({
              services: insertAfter(getState().services, service.id, copy),
            });

            showToast(`${service.name} duplicated`);
          },
        },
        {
          label: "Quick booking link",
          icon: ICONS.link,
          run: () => copyServiceLink(service),
        },
        getStatusItem(service.status, service.name, setStatus),
        {
          label: "Delete",
          icon: ICONS.trash,
          danger: true,
          run: () =>
            setState({
              confirm: {
                body: `"${service.name}" will be removed from your services. Bookings already made are kept.`,
                yes: () => {
                  setState(({ services }) => ({
                    services: services.filter(({ id }) => id !== service.id),
                    confirm: null,
                  }));

                  showToast(`${service.name} deleted`);
                },
              },
            }),
        },
      ],
    });
  };

  const openAddon = (addon: StudioAddon) =>
    openSheet("addon", { addonDraft: { ...addon }, addonNewCategory: null });

  const openAddonActions = (addon: StudioAddon, event?: MenuEvent | null) => {
    const setStatus = (status: string) =>
      setState(({ addons }) => ({
        addons: addons.map((item) =>
          item.id === addon.id ? { ...item, status } : item,
        ),
      }));

    openActionSheet({
      title: addon.name,
      subtitle: formatAddon(addon),
      anchor: getAnchor(event),
      items: [
        { label: "Edit", icon: ICONS.edit, run: () => openAddon(addon) },
        {
          label: "Duplicate",
          icon: ICONS.copy,
          run: () => {
            setState({
              addons: insertAfter(getState().addons, addon.id, {
                ...addon,
                id: crypto.randomUUID(),
                name: `${addon.name} (copy)`,
              }),
            });

            showToast(`${addon.name} duplicated`);
          },
        },
        getStatusItem(addon.status, addon.name, setStatus),
        {
          label: "Delete",
          icon: ICONS.trash,
          danger: true,
          run: () =>
            setState({
              confirm: {
                body: `"${addon.name}" will be removed from every service that uses it.`,
                yes: () => {
                  setState(({ addons, services }) => ({
                    addons: addons.filter(({ id }) => id !== addon.id),
                    services: services.map((service) => ({
                      ...service,
                      addons: (service.addons || []).filter(
                        ({ addonId }) => addonId !== addon.id,
                      ),
                    })),
                    confirm: null,
                  }));

                  showToast(`${addon.name} deleted`);
                },
              },
            }),
        },
      ],
    });
  };

  return { openServiceActions, openAddon, openAddonActions };
};
