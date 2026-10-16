// Services, add-ons, categories and the service wizard's actions.
import { defaultAddons, platformCustomisations } from "../../../data";
import type { ServiceType } from "../../../types/service-type";
import { getSpec } from "../../../utils/services";
import type { StudioActions, StudioContext } from "../core/actions";
import { ICONS, TAXONOMY } from "../core/data";
import { timeToMinutes } from "../core/format";
import {
  formatAddon,
  getCategoryById,
  getCategoryNameError,
  getNextCategoryColour,
  getTypeOf,
} from "../core/model";
import type {
  StudioAddon,
  StudioBooking,
  StudioService,
  VariationRow,
  WizardDraft,
  WizardState,
} from "../core/types";

export const makeVariationRows = (
  labels: string[] | null | undefined,
): VariationRow[] =>
  (labels || []).map((label) => ({
    label,
    on: false,
    priceDelta: "",
    hoursDelta: "",
    minutesDelta: "",
  }));

export const getBlankAddon = (): StudioAddon => ({
  id: "",
  categoryId: null,
  name: "",
  price: "",
  hours: "",
  min: "",
});

export const getTaxonomy = (id: string | null | undefined) =>
  TAXONOMY.find((group) => group.id === id) ?? null;

/** Anchor a menu under the element that opened it (wide layouts only). */
export const getAnchor = (
  event?: { currentTarget?: EventTarget | null } | null,
) => {
  const host = event?.currentTarget as Element | null | undefined;

  if (!host?.getBoundingClientRect) return null;

  const rect = host.getBoundingClientRect();

  return {
    top: rect.bottom + 6,
    right: Math.max(12, window.innerWidth - rect.right),
  };
};

export const createServiceActions = (
  context: StudioContext,
  actions: StudioActions,
) => {
  const { getState, setState, timers, isWide } = context;
  const { openSheet, openActionSheet, showToast } = actions;

  const openCategories = () =>
    openSheet("cats", {
      categoriesUi: {
        newName: "",
        newColour: getNextCategoryColour(getState().categories),
        newError: "",
        editId: null,
        editName: "",
        editColour: null,
        editError: "",
      },
    });

  const addCategory = (name: string, colour?: string | null) => {
    const state = getState();
    const error = getCategoryNameError(state, name);

    if (error) return { error };

    const categories = state.categories;
    const id = crypto.randomUUID();

    const category = {
      id,
      name: String(name).trim().slice(0, 40),
      sort: categories.length
        ? Math.max(...categories.map(({ sort }) => sort)) + 1
        : 0,
      colour: colour || getNextCategoryColour(categories),
    };

    setState({ categories: categories.concat([category]) });

    return { id, category };
  };

  const setWizard = (patch: Partial<WizardState>) =>
    setState(({ wizard }) => ({
      wizard: wizard ? { ...wizard, ...patch } : wizard,
    }));

  const setDraft = (patch: Partial<WizardDraft>) =>
    setState(({ wizard }) => ({
      wizard: wizard
        ? { ...wizard, draft: { ...wizard.draft, ...patch } }
        : wizard,
    }));

  const setVarRow = (
    key: "sizes" | "lengths",
    index: number,
    patch: Partial<VariationRow>,
  ) => {
    const draft = getState().wizard?.draft;

    if (!draft) return;

    const list = draft[key].map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );

    setDraft(key === "sizes" ? { sizes: list } : { lengths: list });
  };

  const openWizard = (
    mode: "add" | "edit",
    service?: StudioService | null,
    preset: Partial<WizardDraft> = {},
  ) => {
    const type = service ? getTypeOf(service) : null;

    const draft: WizardDraft = service
      ? {
          name: service.name,
          description: service.description || "",
          taxonomyId: service.taxonomyId,
          subcategory: type ? type.name : service.subcategory || "",
          typeId: type ? type.id : null,
          categoryId: service.categoryId || null,
          own: (service.own || []).map(({ name, options }) => ({
            name,
            options: options.map((option) => ({ ...option })),
          })),
          price: `${service.price}`,
          durationHours: `${service.durationHours || 0}`,
          durationMinutes: `${service.durationMinutes || 0}`,
          sizesOn: !!service.sizesOn,
          lengthsOn: !!service.lengthsOn,
          sizes: (service.sizes || []).map((row) => ({ ...row })),
          lengths: (service.lengths || []).map((row) => ({ ...row })),
          addons: (service.addons || []).map((link) => ({ ...link })),
          status: service.status,
          extra: service.extraCustom ? String(service.extra || 0) : "",
        }
      : {
          name: "",
          description: "",
          taxonomyId: null,
          subcategory: "",
          typeId: null,
          categoryId: null,
          own: [],
          price: "",
          durationHours: "",
          durationMinutes: "",
          sizesOn: false,
          lengthsOn: false,
          sizes: [],
          lengths: [],
          addons: [],
          status: "active",
          extra: "",
        };

    openSheet("svcwiz", {
      wizard: {
        mode,
        step: 2,
        suggestionsOpen: false,
        flash: null,
        editId: service ? service.id : null,
        search: "",
        other: false,
        review: false,
        openAddon: null,
        newAddon: null,
        addonQuery: "",
        draft: { ...draft, ...preset },
      },
    });
  };

  /** What a suggested service type fills in. */
  const getSuggestionFill = (type: ServiceType) => {
    const spec = getSpec(type.name);

    const custom =
      platformCustomisations[
        type.groupId as keyof typeof platformCustomisations
      ];

    const group = getTaxonomy(type.groupId);

    const toRow = ([label, price, minutes]: [
      string,
      number,
      number,
    ]): VariationRow => {
      const isNegativeValue = price < 0 || minutes < 0;
      const absoluteMinutes = Math.abs(minutes);
      const sign = isNegativeValue ? "-" : "";

      return {
        label,
        on: true,
        negative: isNegativeValue,
        priceDelta: (price ? sign : "") + Math.abs(price),
        hoursDelta:
          (Math.floor(absoluteMinutes / 60) ? sign : "") +
          Math.floor(absoluteMinutes / 60),
        minutesDelta:
          (absoluteMinutes % 60 ? sign : "") + (absoluteMinutes % 60),
      };
    };

    const getSizes = () => {
      if (custom) return custom.size.map(toRow);

      return group?.sizes ? makeVariationRows(group.sizes) : [];
    };

    const getLengths = () => {
      if (custom) return custom.length.map(toRow);

      return group?.lengths ? makeVariationRows(group.lengths) : [];
    };

    return {
      name: type.name,
      description: spec.description || "",
      taxonomyId: type.groupId,
      subcategory: type.name,
      typeId: type.id,
      price: String(spec.addedPrice),
      durationHours: String(Math.floor(spec.minutes / 60)),
      durationMinutes: String(spec.minutes % 60),
      sizesOn: !!custom,
      lengthsOn: !!custom,
      sizes: getSizes(),
      lengths: getLengths(),
      addonDefinitions: defaultAddons[type.groupId] || [],
    };
  };

  const applySuggestion = (
    type: ServiceType,
    isReplace: boolean,
    isHeld?: boolean,
  ) => {
    const state = getState();
    const wizard = state.wizard;

    if (!wizard) return;

    const draft = wizard.draft;
    const fill = getSuggestionFill(type);

    const isEmpty = (value: string) => !value.trim();

    const pending = (wizard.pendingAddons || []).slice();
    const addons = state.addons.concat(pending);
    const links: WizardDraft["addons"] = [];

    fill.addonDefinitions.forEach(([name, price, minutes]) => {
      let addon = addons.find(
        (item) =>
          (item.status || "active") !== "archived" &&
          String(item.name).toLowerCase() === name.toLowerCase(),
      );

      if (!addon) {
        addon = {
          id: crypto.randomUUID(),
          categoryId: getCategoryById(state, draft.categoryId)
            ? draft.categoryId
            : null,
          name,
          price,
          hours: Math.floor(minutes / 60),
          min: minutes % 60,
          status: "active",
        };

        addons.push(addon);
        pending.push(addon);
      }

      links.push({
        addonId: addon.id,
        priceOverride: null,
        hoursOverride: null,
        minutesOverride: null,
      });
    });

    const patch: Partial<WizardDraft> = {};
    const flash: Record<string, number> = {};

    const put = <K extends keyof WizardDraft>(
      key: K,
      value: WizardDraft[K],
      flashKey?: string,
    ) => {
      patch[key] = value;

      if (flashKey) flash[flashKey] = 1;
    };

    if (isReplace || isEmpty(draft.name)) put("name", fill.name, "name");

    if ((isReplace || isEmpty(draft.description)) && fill.description)
      put("description", fill.description, "description");

    if (isReplace || !draft.typeId) {
      put("taxonomyId", fill.taxonomyId);
      put("subcategory", fill.subcategory);
      put("typeId", fill.typeId, "type");
    }

    if (isReplace || isEmpty(draft.price)) put("price", fill.price, "price");

    if (
      isReplace ||
      (!parseInt(draft.durationHours) && !parseInt(draft.durationMinutes))
    ) {
      put("durationHours", fill.durationHours, "price");
      put("durationMinutes", fill.durationMinutes);
    }

    if (
      isReplace ||
      !(draft.sizesOn || draft.lengthsOn) ||
      (patch.taxonomyId && patch.taxonomyId !== draft.taxonomyId)
    ) {
      put("sizesOn", fill.sizesOn);
      put("lengthsOn", fill.lengthsOn);
      put("sizes", fill.sizes);
      put("lengths", fill.lengths);

      if (fill.sizesOn) flash.options = 1;
    }

    if (isReplace || !draft.addons.length) {
      const keep = isReplace ? [] : draft.addons;

      put(
        "addons",
        keep.concat(
          links.filter(
            (link) => !keep.some(({ addonId }) => addonId === link.addonId),
          ),
        ),
      );
    }

    setState({
      wizard: {
        ...wizard,
        suggestionsOpen: false,
        flash,
        pendingAddons: pending,
        draft: { ...draft, ...patch },
      },
    });

    showToast(
      isWide()
        ? `Filled in from ${type.name}. Check and edit anything you need.`
        : `Filled in from ${type.name}`,
    );

    window.clearTimeout(timers.flash);

    if (!isHeld)
      timers.flash = window.setTimeout(() => {
        if (getState().wizard) setWizard({ flash: null });
      }, 1100);
  };

  const pickSuggestion = (type: ServiceType) => {
    const draft = getState().wizard?.draft;

    if (!draft) return;

    const hasEntries = !!(
      String(draft.name || "").trim() ||
      String(draft.description || "").trim() ||
      draft.typeId ||
      String(draft.price || "").trim() ||
      parseInt(draft.durationHours) ||
      parseInt(draft.durationMinutes) ||
      draft.sizesOn ||
      draft.lengthsOn
    );

    setWizard({ suggestionsOpen: false });

    if (!hasEntries) {
      applySuggestion(type, true);

      return;
    }

    window.setTimeout(
      () =>
        setState({
          confirm: {
            title: "Replace what you’ve entered?",
            body: `We’ll fill in the name, description, service type, price, time and options from ${type.name}.`,
            yesLabel: "Replace",
            noLabel: "Keep mine",
            yes: () => {
              setState({ confirm: null });
              applySuggestion(type, true);
            },
            onNo: () => {
              setState({ confirm: null });
              applySuggestion(type, false);
            },
          },
        }),
      180,
    );
  };

  const openServiceActions = (
    service: StudioService,
    event?: { currentTarget?: EventTarget | null } | null,
  ) => {
    const isArchived = service.status === "archived";

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
            const services = getState().services;
            const index = services.findIndex(({ id }) => id === service.id);

            const copy = {
              ...service,
              id: crypto.randomUUID(),
              name: `${service.name} (copy)`,
              sizes: (service.sizes || []).map((row) => ({ ...row })),
              lengths: (service.lengths || []).map((row) => ({ ...row })),
              addons: (service.addons || []).map((link) => ({ ...link })),
            };

            const list = services.slice();

            list.splice(index + 1, 0, copy);
            setState({ services: list });
            showToast(`${service.name} duplicated`);
          },
        },
        {
          label: "Quick booking link",
          icon: ICONS.link,
          run: () => showToast(`Booking link for ${service.name} copied`),
        },
        isArchived
          ? {
              label: "Restore",
              icon: ICONS.restore,
              run: () => {
                setState(({ services }) => ({
                  services: services.map((item) =>
                    item.id === service.id
                      ? { ...item, status: "active" }
                      : item,
                  ),
                }));

                showToast(`${service.name} restored`);
              },
            }
          : {
              label: "Archive",
              icon: ICONS.archive,
              run: () => {
                setState(({ services }) => ({
                  services: services.map((item) =>
                    item.id === service.id
                      ? { ...item, status: "archived" }
                      : item,
                  ),
                }));

                showToast(`${service.name} archived`);
              },
            },
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

  const openAddonActions = (
    addon: StudioAddon,
    event?: { currentTarget?: EventTarget | null } | null,
  ) => {
    const isArchived = addon.status === "archived";

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
            const addons = getState().addons;
            const index = addons.findIndex(({ id }) => id === addon.id);
            const list = addons.slice();

            list.splice(index + 1, 0, {
              ...addon,
              id: crypto.randomUUID(),
              name: `${addon.name} (copy)`,
            });

            setState({ addons: list });
            showToast(`${addon.name} duplicated`);
          },
        },
        isArchived
          ? {
              label: "Restore",
              icon: ICONS.restore,
              run: () => {
                setState(({ addons }) => ({
                  addons: addons.map((item) =>
                    item.id === addon.id ? { ...item, status: "active" } : item,
                  ),
                }));

                showToast(`${addon.name} restored`);
              },
            }
          : {
              label: "Archive",
              icon: ICONS.archive,
              run: () => {
                setState(({ addons }) => ({
                  addons: addons.map((item) =>
                    item.id === addon.id
                      ? { ...item, status: "archived" }
                      : item,
                  ),
                }));

                showToast(`${addon.name} archived`);
              },
            },
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

  const getBookingAddons = (booking: { id: number }) =>
    getState().bookings.find(({ id }) => id === booking.id)?.addons || [];

  /** Opens the booking's "Edit service" step with a draft of its service. */
  const openAddonEdit = (
    booking: StudioBooking & { durationMinutes: number },
  ) => {
    const service = getState().services.find(
      ({ name }) => name === booking.service,
    );

    setState({
      bookingStep: "editsvc",
      changeServiceQuery: "",
      serviceEdit: {
        serviceId: service ? service.id : null,
        serviceName: booking.service,
        taxonomyId: service ? service.taxonomyId : null,
        time: timeToMinutes(booking.time),
        duration: booking.durationMinutes,
        price: String(booking.price),
        originalPrice: String(booking.price),
        priceOpen: !!booking.priceReason,
        priceReason: booking.priceReason || "",
        extra: service?.extra ? Number(service.extra) : null,
        addons: getBookingAddons(booking).map((addon) => ({ ...addon })),
      },
    });
  };

  const patchServiceEdit = (
    patch: Partial<NonNullable<ReturnType<typeof getState>["serviceEdit"]>>,
  ) =>
    setState(({ serviceEdit }) => ({
      serviceEdit: serviceEdit ? { ...serviceEdit, ...patch } : serviceEdit,
    }));

  return {
    openCategories,
    addCategory,
    setWizard,
    setDraft,
    setVarRow,
    openWizard,
    getSuggestionFill,
    applySuggestion,
    pickSuggestion,
    openServiceActions,
    openAddon,
    openAddonActions,
    getBookingAddons,
    openAddonEdit,
    patchServiceEdit,
  };
};

export type ServiceActions = ReturnType<typeof createServiceActions>;
