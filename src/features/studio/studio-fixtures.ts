// Studio's ?fixture= review states (prototype Studio.dc.html applyFixture). Each sets up one screen or sheet.
import { serviceTypes } from "../../data";
import type { TaxDetails } from "../../components/tax-details-form/tax-details-logic";
import type { StudioActions, StudioContext } from "./studio-actions";
import type { ServiceActions } from "./studio-service-actions";
import { getTaxonomy, makeVariationRows } from "./studio-service-actions";
import { getCatNameError, getNextCatColour } from "./studio-model";
import type { StudioState } from "./studio-types";

const WRONG_CODE =
  "That code isn’t right. Enter the latest code from your app.";
const SOLE_TAX: Partial<TaxDetails> = {
  kind: "sole",
  nameYes: true,
  legalName: "Amara Okonkwo",
  d: "14",
  m: "06",
  y: "1994",
  ni: "QQ123456C",
  addrSame: false,
  addr: {
    line1: "27 Heald Place",
    line2: "",
    city: "Manchester",
    pc: "M14 5TQ",
  },
};
const LTD_TAX: Partial<TaxDetails> = {
  kind: "ltd",
  coName: "Amara Beauty Ltd",
  coNum: "14829307",
  addrSame: true,
  addr: {
    line1: "118 Wilmslow Road",
    line2: "Unit 4",
    city: "Manchester",
    pc: "M14 5AJ",
  },
};

const getQueryParam = (key: string) => {
  try {
    return new URLSearchParams(location.search).get(key);
  } catch {
    return null;
  }
};

/** Scrolls the first visible match to the top of its scroller once it renders. */
const scrollToSelector = (selector: string) => {
  let tries = 0;
  const go = () => {
    const element = [...document.querySelectorAll<HTMLElement>(selector)].find(
      (item) => item.offsetParent,
    );
    if (!element) {
      if (++tries < 20) window.setTimeout(go, 150);
      return;
    }
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const style = getComputedStyle(parent);
      if (
        /(auto|scroll)/.test(style.overflowY) &&
        parent.scrollHeight > parent.clientHeight
      ) {
        parent.scrollTop +=
          element.getBoundingClientRect().top -
          parent.getBoundingClientRect().top -
          16;
        break;
      }
      parent = parent.parentElement;
    }
  };
  window.setTimeout(go, 400);
};

export const applyFixture = (
  key: string,
  context: StudioContext,
  actions: StudioActions,
  serviceActions: ServiceActions,
) => {
  const { getState, setState, memo } = context;
  const { openTf, openSheet, scrollCalToNow } = actions;
  const { openCats, openWiz, setWiz, setDraft, applySugg, pickSugg } =
    serviceActions;
  const state = getState();
  const main = [{ name: "Main phone", backup: false }];
  const both = main.concat([{ name: "Password manager", backup: true }]);
  const drafts = state.services.map((service) =>
    service.st === "active" ? { ...service, st: "draft" } : service,
  );
  const base: Partial<StudioState> = {
    check: { avail: true, profile: true, stripe: false },
    setupMin: false,
    tab: "home",
    page: null,
    tfa: { devices: [] },
    tax: null,
    taxEdit: false,
    services: drafts,
  };
  if (!["checklist", "checklist-services", "all-done"].includes(key))
    base.setupMin = true;
  const setBase = (patch: Partial<StudioState>) =>
    setState({ ...base, ...patch });
  if (/^pay-/.test(key)) scrollToSelector('[data-screen-label="Tax details"]');
  if (/^biz-legal/.test(key)) scrollToSelector('[data-sec="legal"]');
  const stripeDone = { avail: true, profile: true, stripe: true };
  const toServices = () =>
    setState({ tab: "services", svcTab: "services", setupMin: true });
  const knotless = () =>
    getState().services.find(({ id }) => id === "knotless");

  switch (key) {
    case "checklist":
      setBase({});
      break;
    case "svc-cats":
      toServices();
      break;
    case "cats-sheet":
      toServices();
      window.setTimeout(() => openCats(), 60);
      break;
    case "cats-dup":
      toServices();
      window.setTimeout(() => {
        openCats();
        setState(({ catsUi }) =>
          catsUi
            ? {
                catsUi: {
                  ...catsUi,
                  newName: "locs",
                  newErr: getCatNameError(getState(), "locs"),
                },
              }
            : {},
        );
      }, 80);
      break;
    case "wiz-details":
      toServices();
      window.setTimeout(() => {
        const braids = getTaxonomy("braids");
        openWiz("add", null, {
          categoryId: "c1",
          cat: "braids",
          sub: "Box braids",
          typeId: "box-braids",
          name: "Jumbo box braids",
          sizes: makeVariationRows(braids?.sizes),
          lengths: makeVariationRows(braids?.lengths),
        });
        setWiz({ step: 2 });
      }, 60);
      break;
    case "wiz-newcat":
      toServices();
      window.setTimeout(() => {
        openWiz("add", null, {
          cat: "braids",
          sub: "Box braids",
          typeId: "box-braids",
          name: "Jumbo box braids",
        });
        setState(({ wiz, categories }) =>
          wiz
            ? {
                wiz: {
                  ...wiz,
                  step: 2,
                  newCat: {
                    name: "",
                    colour: getNextCatColour(categories),
                    err: "",
                  },
                },
              }
            : {},
        );
      }, 60);
      break;
    case "wiz-own":
      toServices();
      window.setTimeout(() => {
        openWiz("edit", knotless());
        setWiz({ step: 3 });
      }, 60);
      break;
    case "wiz-sign":
    case "wiz-sign-err":
    case "wiz-own-sign":
      toServices();
      window.setTimeout(() => {
        openWiz("edit", knotless());
        const isError = key === "wiz-sign-err";
        const isOwn = key === "wiz-own-sign";
        setState(({ wiz }) => {
          if (!wiz) return {};
          const draft = {
            ...wiz.draft,
            sizesOn: !isOwn,
            sizes: wiz.draft.sizes.map((row) =>
              row.label === "Large" && isError
                ? { ...row, neg: true, dp: "-90", dh: "-2", dm: "0" }
                : row,
            ),
          };
          return {
            wiz: {
              ...wiz,
              step: 3,
              draft,
              ...(isOwn
                ? {
                    ownEd: {
                      idx: 0,
                      name: "Parting",
                      options: [
                        { label: "Straight", dp: "0", dm: "0" },
                        { label: "Zig-zag", dp: "10", dm: "20" },
                        {
                          label: "Middle part",
                          neg: true,
                          dp: "-5",
                          dm: "-15",
                        },
                      ],
                      err: "",
                    },
                  }
                : {}),
            },
          };
        });
        const tip = getQueryParam("tip");
        if (tip)
          window.setTimeout(() => {
            const selector =
              tip === "ck"
                ? 'button[aria-label="Offer Small"]'
                : 'button[aria-label="Take off price and time"]';
            const element = document.querySelector(selector);
            if (!element) return;
            const rect = element.getBoundingClientRect();
            const text =
              tip === "ck"
                ? "Offer this size"
                : "Takes off the base price and time. Click to add instead.";
            setState({
              tip: {
                key: "fx",
                text,
                x: Math.min(
                  Math.max(rect.left + rect.width / 2, 128),
                  window.innerWidth - 128,
                ),
                y: rect.top,
              },
            });
          }, 700);
      }, 60);
      break;
    case "wiz-own-edit":
      toServices();
      window.setTimeout(() => {
        openWiz("edit", knotless());
        setWiz({
          step: 3,
          ownEd: {
            idx: 0,
            name: "Parting",
            options: [
              { label: "Straight", dp: "0", dm: "0" },
              { label: "Zig-zag", dp: "10", dm: "20" },
            ],
            err: "",
          },
        });
      }, 60);
      break;
    case "wiz-new":
    case "sugg":
    case "sugg-group":
    case "sugg-none":
    case "wiz-filled":
    case "wiz-filled-pricing":
    case "wiz-filled-addons":
    case "wiz-replace":
      toServices();
      window.setTimeout(() => {
        openWiz("add");
        const type = serviceTypes.find(({ id }) => id === "knotless-braids");
        if (key === "sugg") setWiz({ sugg: true });
        if (key === "sugg-group") setWiz({ sugg: true, catF: "locs" });
        if (key === "sugg-none") setWiz({ sugg: true, search: "mohawk fade" });
        if (!type) return;
        if (
          key === "wiz-filled" ||
          key === "wiz-filled-pricing" ||
          key === "wiz-filled-addons"
        ) {
          applySugg(type, true, key === "wiz-filled");
          if (key !== "wiz-filled")
            window.setTimeout(
              () => setWiz({ step: key === "wiz-filled-pricing" ? 3 : 4 }),
              50,
            );
        }
        if (key === "wiz-replace") {
          setDraft({ name: "My knotless" });
          window.setTimeout(() => pickSugg(type), 60);
        }
      }, 60);
      break;
    case "wiz-search":
      toServices();
      window.setTimeout(() => {
        openWiz("add");
        setWiz({ sugg: true, search: "retwist" });
      }, 60);
      break;
    case "cal-day":
      setState({ tab: "bookings", bview: "cal", dayIdx: 0, setupMin: true });
      window.setTimeout(() => {
        try {
          scrollCalToNow();
        } catch {
          // the calendar may not be laid out yet
        }
      }, 120);
      break;
    case "secure-tax":
      setBase({ tfa: { devices: both } });
      openTf("secure");
      break;
    case "tax-home":
      setBase({
        tfa: { devices: both },
        business: {
          ...state.business,
          type: "home",
          v: {
            ...state.business.v,
            line1: "27 Heald Place",
            line2: "",
            city: "Manchester",
            pc: "M14 5TQ",
          },
        },
      });
      openTf("tax");
      break;
    case "tax-mobile":
      setBase({
        tfa: { devices: both },
        business: {
          ...state.business,
          type: "mobile",
          v: { ...state.business.v, basePc: "M16 8AF" },
        },
      });
      openTf("tax");
      break;
    case "tax-shop":
      setBase({ tfa: { devices: both } });
      openTf("tax");
      break;
    case "tax-name-no":
    case "tax-ltd":
    case "tax-err-empty":
    case "tax-err-initials":
    case "tax-err-dob":
    case "tax-err-under18":
    case "tax-err-ni":
    case "tax-err-conum":
    case "tax-err-pc":
      setBase({ tfa: { devices: both } });
      openTf("tax", { fx: key.slice(4) });
      break;
    case "tax-learn":
      setBase({ tfa: { devices: both } });
      openTf("learn", { from: "tax" });
      break;
    case "stripe-sheet":
      setBase({ tfa: { devices: both }, tax: SOLE_TAX });
      window.setTimeout(() => openSheet("stripe"), 50);
      break;
    case "pay-saved":
      setBase({
        tfa: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "settings",
        page: "payouts",
      });
      break;
    case "pay-saved-ltd":
      setBase({
        tfa: { devices: both },
        tax: LTD_TAX,
        check: stripeDone,
        tab: "settings",
        page: "payouts",
      });
      break;
    case "pay-hold":
      setBase({
        tfa: { devices: both },
        check: stripeDone,
        tab: "settings",
        page: "payouts",
      });
      break;
    case "pay-code":
      setBase({
        tfa: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "settings",
        page: "payouts",
      });
      openTf("taxcode", { flow: "info" });
      break;
    case "pay-edit":
      setBase({
        tfa: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "settings",
        page: "payouts",
        taxEdit: true,
      });
      break;
    case "biz-legal":
      setBase({
        tfa: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "settings",
        page: "business",
      });
      break;
    case "biz-legal-ltd":
      setBase({
        tfa: { devices: both },
        tax: LTD_TAX,
        check: stripeDone,
        tab: "settings",
        page: "business",
      });
      break;
    case "earn-hold":
      setBase({ tfa: { devices: both }, check: stripeDone, tab: "earnings" });
      break;
    case "secure-locked":
      setBase({});
      openTf("secure");
      break;
    case "secure-unlocked":
      setBase({ tfa: { devices: both } });
      openTf("secure");
      break;
    case "checklist-services":
      setBase({ tfa: { devices: both }, tax: SOLE_TAX, check: stripeDone });
      break;
    case "services-drafts":
      setBase({
        tfa: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "services",
        svcTab: "services",
      });
      break;
    case "tf-method":
      setBase({});
      openTf("method");
      break;
    case "tf-app":
      setBase({});
      openTf("app");
      break;
    case "tf-app-key":
      setBase({});
      openTf("app", { keyOn: true });
      break;
    case "tf-app-error":
      setBase({});
      openTf("app", { code: "482910", err: "code", errMsg: WRONG_CODE });
      break;
    case "tf-dup":
      setBase({ tfa: { devices: main } });
      openTf("app", {
        kind: "backup",
        opt: "device",
        name: "Main phone",
        code: "",
        err: "name",
        errMsg: "You already have a device with this name",
      });
      break;
    case "tf-backup":
      setBase({ tfa: { devices: main } });
      openTf("backup");
      break;
    case "tf-backup-app":
      setBase({ tfa: { devices: main } });
      openTf("app", { kind: "backup", opt: "pm", name: "Password manager" });
      break;
    case "tf-skip":
      setBase({ tfa: { devices: main } });
      openTf("backup", { skipWarn: true });
      break;
    case "tf-done":
      setBase({ tfa: { devices: both } });
      openTf("done");
      break;
    case "home-gate":
      setBase({ check: { avail: false, profile: false, stripe: false } });
      break;
    case "share-locked":
      setBase({ tab: "settings", page: "profile", shareTip: true });
      break;
    case "sec-off":
      setBase({ tab: "settings", page: "security" });
      break;
    case "sec-on1":
      setBase({ tab: "settings", page: "security", tfa: { devices: main } });
      break;
    case "sec-on2":
      setBase({ tab: "settings", page: "security", tfa: { devices: both } });
      break;
    case "sec-remove":
      setBase({ tab: "settings", page: "security", tfa: { devices: both } });
      openTf("remove", { name: "Password manager" });
      break;
    case "all-done":
      memo.seenDone = {
        avail: true,
        profile: true,
        secure: true,
        services: false,
      };
      setBase({
        tfa: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        services: drafts.map((service, index) =>
          index === 0 ? { ...service, st: "active" } : service,
        ),
      });
      actions.checkDone();
      break;
  }
};

export { getQueryParam };
