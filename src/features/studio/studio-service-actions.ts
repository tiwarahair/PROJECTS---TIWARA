// Services, add-ons, categories and the service wizard's actions (prototype Studio.dc.html: openCats, addCategory,
// openWiz, suggFill, pickSugg, applySugg, setWiz, setDraft, setVarRow, svcActions, openAddon, addonActions, esOpen).
import { defaultAddons, platformCustomisations } from "../../data";
import type { ServiceType } from "../../types/service-type";
import { getSpec } from "../../utils/services";
import type { StudioActions, StudioContext } from "./studio-actions";
import { ICONS, TAXONOMY } from "./studio-data";
import { toMin } from "./studio-format";
import {
  formatAddon,
  getCatById,
  getCatNameError,
  getNextCatColour,
  getTypeOf,
} from "./studio-model";
import type {
  StudioAddon,
  StudioBooking,
  StudioService,
  VariationRow,
  WizardDraft,
  WizardState,
} from "./studio-types";

export const makeVariationRows = (
  labels: string[] | null | undefined,
): VariationRow[] =>
  (labels || []).map((label) => ({ label, on: false, dp: "", dh: "", dm: "" }));

export const getBlankAddon = (): StudioAddon => ({
  id: "",
  categoryId: null,
  name: "",
  price: "",
  hr: "",
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
  const { openSheet, openActs, toastMsg } = actions;

  const openCats = () =>
    openSheet("cats", {
      catsUi: {
        newName: "",
        newColour: getNextCatColour(getState().categories),
        newErr: "",
        editId: null,
        editName: "",
        editColour: null,
        editErr: "",
      },
    });

  const addCategory = (name: string, colour?: string | null) => {
    const state = getState();
    const error = getCatNameError(state, name);
    if (error) return { err: error };
    const categories = state.categories;
    const id = "c" + Date.now().toString(36);
    const category = {
      id,
      name: String(name).trim().slice(0, 40),
      sort: categories.length
        ? Math.max(...categories.map(({ sort }) => sort)) + 1
        : 0,
      colour: colour || getNextCatColour(categories),
    };
    setState({ categories: categories.concat([category]) });
    return { id, cat: category };
  };

  const setWiz = (patch: Partial<WizardState>) =>
    setState(({ wiz }) => ({ wiz: wiz ? { ...wiz, ...patch } : wiz }));

  const setDraft = (patch: Partial<WizardDraft>) =>
    setState(({ wiz }) => ({
      wiz: wiz ? { ...wiz, draft: { ...wiz.draft, ...patch } } : wiz,
    }));

  const setVarRow = (
    key: "sizes" | "lengths",
    index: number,
    patch: Partial<VariationRow>,
  ) => {
    const draft = getState().wiz?.draft;
    if (!draft) return;
    const list = draft[key].map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    setDraft(key === "sizes" ? { sizes: list } : { lengths: list });
  };

  const openWiz = (
    mode: "add" | "edit",
    service?: StudioService | null,
    preset: Partial<WizardDraft> = {},
  ) => {
    const type = service ? getTypeOf(service) : null;
    const draft: WizardDraft = service
      ? {
          name: service.name,
          desc: service.desc || "",
          cat: service.cat,
          sub: type ? type.name : service.sub || "",
          typeId: type ? type.id : null,
          categoryId: service.categoryId || null,
          own: (service.own || []).map(({ name, options }) => ({
            name,
            options: options.map((option) => ({ ...option })),
          })),
          price: "" + service.price,
          durH: "" + (service.durH || 0),
          durM: "" + (service.durM || 0),
          sizesOn: !!service.sizesOn,
          lengthsOn: !!service.lengthsOn,
          sizes: (service.sizes || []).map((row) => ({ ...row })),
          lengths: (service.lengths || []).map((row) => ({ ...row })),
          addons: (service.addons || []).map((link) => ({ ...link })),
          st: service.st,
          extra: service.extraCustom ? String(service.extra || 0) : "",
        }
      : {
          name: "",
          desc: "",
          cat: null,
          sub: "",
          typeId: null,
          categoryId: null,
          own: [],
          price: "",
          durH: "",
          durM: "",
          sizesOn: false,
          lengthsOn: false,
          sizes: [],
          lengths: [],
          addons: [],
          st: "active",
          extra: "",
        };
    openSheet("svcwiz", {
      wiz: {
        mode,
        step: 2,
        sugg: false,
        flash: null,
        editId: service ? service.id : null,
        search: "",
        other: false,
        review: false,
        openAddon: null,
        newAddon: null,
        aq: "",
        draft: { ...draft, ...preset },
      },
    });
  };

  /** What a suggested service type fills in (prototype suggFill). */
  const suggFill = (type: ServiceType) => {
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
      const isNeg = price < 0 || minutes < 0;
      const absMinutes = Math.abs(minutes);
      const sign = isNeg ? "-" : "";
      return {
        label,
        on: true,
        neg: isNeg,
        dp: (price ? sign : "") + Math.abs(price),
        dh:
          (Math.floor(absMinutes / 60) ? sign : "") +
          Math.floor(absMinutes / 60),
        dm: (absMinutes % 60 ? sign : "") + (absMinutes % 60),
      };
    };
    return {
      name: type.name,
      desc: spec.desc || "",
      cat: type.groupId,
      sub: type.name,
      typeId: type.id,
      price: String(spec.add),
      durH: String(Math.floor(spec.mins / 60)),
      durM: String(spec.mins % 60),
      sizesOn: !!custom,
      lengthsOn: !!custom,
      sizes: custom
        ? custom.size.map(toRow)
        : group?.sizes
          ? makeVariationRows(group.sizes)
          : [],
      lengths: custom
        ? custom.length.map(toRow)
        : group?.lengths
          ? makeVariationRows(group.lengths)
          : [],
      addonDefs: defaultAddons[type.groupId] || [],
    };
  };

  const applySugg = (
    type: ServiceType,
    isReplace: boolean,
    isHeld?: boolean,
  ) => {
    const state = getState();
    const wizard = state.wiz;
    if (!wizard) return;
    const draft = wizard.draft;
    const fill = suggFill(type);
    const isEmpty = (value: unknown) =>
      !String(value == null ? "" : value).trim();
    const pending = (wizard.pendAddons || []).slice();
    const addons = state.addons.concat(pending);
    const links: WizardDraft["addons"] = [];
    fill.addonDefs.forEach(([name, price, minutes], index) => {
      let addon = addons.find(
        (item) =>
          (item.st || "active") !== "archived" &&
          String(item.name).toLowerCase() === name.toLowerCase(),
      );
      if (!addon) {
        addon = {
          id: "ad" + Date.now() + index,
          categoryId: getCatById(state, draft.categoryId)
            ? draft.categoryId
            : null,
          name,
          price,
          hr: Math.floor(minutes / 60),
          min: minutes % 60,
          st: "active",
        };
        addons.push(addon);
        pending.push(addon);
      }
      links.push({ aid: addon.id, ovP: null, ovH: null, ovM: null });
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
    if ((isReplace || isEmpty(draft.desc)) && fill.desc)
      put("desc", fill.desc, "desc");
    if (isReplace || !draft.typeId) {
      put("cat", fill.cat);
      put("sub", fill.sub);
      put("typeId", fill.typeId, "type");
    }
    if (isReplace || isEmpty(draft.price)) put("price", fill.price, "price");
    if (isReplace || (!parseInt(draft.durH) && !parseInt(draft.durM))) {
      put("durH", fill.durH, "price");
      put("durM", fill.durM);
    }
    if (
      isReplace ||
      !(draft.sizesOn || draft.lengthsOn) ||
      (patch.cat && patch.cat !== draft.cat)
    ) {
      put("sizesOn", fill.sizesOn);
      put("lengthsOn", fill.lengthsOn);
      put("sizes", fill.sizes);
      put("lengths", fill.lengths);
      if (fill.sizesOn) flash.opts = 1;
    }
    if (isReplace || !draft.addons.length) {
      const keep = isReplace ? [] : draft.addons;
      put(
        "addons",
        keep.concat(
          links.filter((link) => !keep.some(({ aid }) => aid === link.aid)),
        ),
      );
    }
    setState({
      wiz: {
        ...wizard,
        sugg: false,
        flash,
        pendAddons: pending,
        draft: { ...draft, ...patch },
      },
    });
    toastMsg(
      isWide()
        ? "Filled in from " + type.name + ". Check and edit anything you need."
        : "Filled in from " + type.name,
    );
    window.clearTimeout(timers.flash);
    if (!isHeld)
      timers.flash = window.setTimeout(() => {
        if (getState().wiz) setWiz({ flash: null });
      }, 1100);
  };

  const pickSugg = (type: ServiceType) => {
    const draft = getState().wiz?.draft;
    if (!draft) return;
    const hasEntries = !!(
      String(draft.name || "").trim() ||
      String(draft.desc || "").trim() ||
      draft.typeId ||
      String(draft.price || "").trim() ||
      parseInt(draft.durH) ||
      parseInt(draft.durM) ||
      draft.sizesOn ||
      draft.lengthsOn
    );
    setWiz({ sugg: false });
    if (!hasEntries) {
      applySugg(type, true);
      return;
    }
    window.setTimeout(
      () =>
        setState({
          confirm: {
            title: "Replace what you’ve entered?",
            body:
              "We’ll fill in the name, description, service type, price, time and options from " +
              type.name +
              ".",
            yesLabel: "Replace",
            noLabel: "Keep mine",
            yes: () => {
              setState({ confirm: null });
              applySugg(type, true);
            },
            no: () => {
              setState({ confirm: null });
              applySugg(type, false);
            },
          },
        }),
      180,
    );
  };

  const svcActions = (
    service: StudioService,
    event?: { currentTarget?: EventTarget | null } | null,
  ) => {
    const isArchived = service.st === "archived";
    openActs({
      title: service.name,
      sub: service.dur + " · £" + service.price,
      anchor: getAnchor(event),
      items: [
        { label: "Edit", d: ICONS.edit, run: () => openWiz("edit", service) },
        {
          label: "Duplicate",
          d: ICONS.copy,
          run: () => {
            const services = getState().services;
            const index = services.findIndex(({ id }) => id === service.id);
            const copy = {
              ...service,
              id: service.id + "-copy-" + Date.now(),
              name: service.name + " (copy)",
              sizes: (service.sizes || []).map((row) => ({ ...row })),
              lengths: (service.lengths || []).map((row) => ({ ...row })),
              addons: (service.addons || []).map((link) => ({ ...link })),
            };
            const list = services.slice();
            list.splice(index + 1, 0, copy);
            setState({ services: list });
            toastMsg(service.name + " duplicated");
          },
        },
        {
          label: "Quick booking link",
          d: ICONS.link,
          run: () => toastMsg("Booking link for " + service.name + " copied"),
        },
        isArchived
          ? {
              label: "Restore",
              d: ICONS.restore,
              run: () => {
                setState(({ services }) => ({
                  services: services.map((item) =>
                    item.id === service.id ? { ...item, st: "active" } : item,
                  ),
                }));
                toastMsg(service.name + " restored");
              },
            }
          : {
              label: "Archive",
              d: ICONS.archive,
              run: () => {
                setState(({ services }) => ({
                  services: services.map((item) =>
                    item.id === service.id ? { ...item, st: "archived" } : item,
                  ),
                }));
                toastMsg(service.name + " archived");
              },
            },
        {
          label: "Delete",
          d: ICONS.trash,
          danger: true,
          run: () =>
            setState({
              confirm: {
                body:
                  '"' +
                  service.name +
                  '" will be removed from your services. Bookings already made are kept.',
                yes: () => {
                  setState(({ services }) => ({
                    services: services.filter(({ id }) => id !== service.id),
                    confirm: null,
                  }));
                  toastMsg(service.name + " deleted");
                },
              },
            }),
        },
      ],
    });
  };

  const openAddon = (addon: StudioAddon) =>
    openSheet("addon", { addonDraft: { ...addon }, adNewCat: null });

  const addonActions = (
    addon: StudioAddon,
    event?: { currentTarget?: EventTarget | null } | null,
  ) => {
    const isArchived = addon.st === "archived";
    openActs({
      title: addon.name,
      sub: formatAddon(addon),
      anchor: getAnchor(event),
      items: [
        { label: "Edit", d: ICONS.edit, run: () => openAddon(addon) },
        {
          label: "Duplicate",
          d: ICONS.copy,
          run: () => {
            const addons = getState().addons;
            const index = addons.findIndex(({ id }) => id === addon.id);
            const list = addons.slice();
            list.splice(index + 1, 0, {
              ...addon,
              id: addon.id + "-copy-" + Date.now(),
              name: addon.name + " (copy)",
            });
            setState({ addons: list });
            toastMsg(addon.name + " duplicated");
          },
        },
        isArchived
          ? {
              label: "Restore",
              d: ICONS.restore,
              run: () => {
                setState(({ addons }) => ({
                  addons: addons.map((item) =>
                    item.id === addon.id ? { ...item, st: "active" } : item,
                  ),
                }));
                toastMsg(addon.name + " restored");
              },
            }
          : {
              label: "Archive",
              d: ICONS.archive,
              run: () => {
                setState(({ addons }) => ({
                  addons: addons.map((item) =>
                    item.id === addon.id ? { ...item, st: "archived" } : item,
                  ),
                }));
                toastMsg(addon.name + " archived");
              },
            },
        {
          label: "Delete",
          d: ICONS.trash,
          danger: true,
          run: () =>
            setState({
              confirm: {
                body:
                  '"' +
                  addon.name +
                  '" will be removed from every service that uses it.',
                yes: () => {
                  setState(({ addons, services }) => ({
                    addons: addons.filter(({ id }) => id !== addon.id),
                    services: services.map((service) => ({
                      ...service,
                      addons: (service.addons || []).filter(
                        ({ aid }) => aid !== addon.id,
                      ),
                    })),
                    confirm: null,
                  }));
                  toastMsg(addon.name + " deleted");
                },
              },
            }),
        },
      ],
    });
  };

  const getBookingAddons = (booking: { id: number }) =>
    getState().bookings.find(({ id }) => id === booking.id)?.addons || [];

  /** Opens the booking's "Edit service" step with a draft of its service (prototype esOpen). */
  const esOpen = (booking: StudioBooking & { durMin: number }) => {
    const service = getState().services.find(
      ({ name }) => name === booking.svc,
    );
    setState({
      bkStep: "editsvc",
      csQ: "",
      es: {
        svcId: service ? service.id : null,
        svcName: booking.svc,
        cat: service ? service.cat : null,
        time: toMin(booking.time),
        dur: booking.durMin,
        price: String(booking.price),
        price0: String(booking.price),
        priceOpen: !!booking.priceReason,
        priceReason: booking.priceReason || "",
        extra: service?.extra ? Number(service.extra) : null,
        addons: getBookingAddons(booking).map((addon) => ({ ...addon })),
      },
    });
  };

  const esPatch = (
    patch: Partial<NonNullable<ReturnType<typeof getState>["es"]>>,
  ) => setState(({ es }) => ({ es: es ? { ...es, ...patch } : es }));

  return {
    openCats,
    addCategory,
    setWiz,
    setDraft,
    setVarRow,
    openWiz,
    suggFill,
    applySugg,
    pickSugg,
    svcActions,
    openAddon,
    addonActions,
    getBookingAddons,
    esOpen,
    esPatch,
  };
};

export type ServiceActions = ReturnType<typeof createServiceActions>;
