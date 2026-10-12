// Studio's ?fixture= review states. Each sets up one screen or sheet.
import { serviceTypes } from "../../data";
import type { TaxDetails } from "../../components/tax-details-form/tax-details-logic";
import type { StudioActions, StudioContext } from "./studio-actions";
import type { ServiceActions } from "./studio-service-actions";
import { getTaxonomy, makeVariationRows } from "./studio-service-actions";
import {
  getCategoryNameError,
  getNextCategoryColour,
  getQueryParam,
} from "./studio-model";
import type { StudioState } from "./studio-types";

const WRONG_CODE =
  "That code isn’t right. Enter the latest code from your app.";

const SOLE_TAX: Partial<TaxDetails> = {
  kind: "sole",
  nameYes: true,
  legalName: "Amara Okonkwo",
  day: "14",
  month: "06",
  year: "1994",
  nationalInsuranceNumber: "QQ123456C",
  isAddressSame: false,
  address: {
    line1: "27 Heald Place",
    line2: "",
    city: "Manchester",
    postcode: "M14 5TQ",
  },
};

const LTD_TAX: Partial<TaxDetails> = {
  kind: "ltd",
  companyName: "Tiwára's House Ltd",
  companyNumber: "14829307",
  isAddressSame: true,
  address: {
    line1: "14 Blossom Street",
    line2: "",
    city: "Manchester",
    postcode: "M4 6AJ",
  },
};

/** Scrolls the first visible match to the top of its scroller once it renders. */
const scrollToSelector = (selector: string) => {
  let tries = 0;

  const tryScroll = () => {
    const element = [...document.querySelectorAll<HTMLElement>(selector)].find(
      (item) => item.offsetParent,
    );

    if (!element) {
      if (++tries < 20) window.setTimeout(tryScroll, 150);

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

  window.setTimeout(tryScroll, 400);
};

export const applyFixture = (
  key: string,
  context: StudioContext,
  actions: StudioActions,
  serviceActions: ServiceActions,
) => {
  const { getState, setState, memo } = context;
  const { openTwoFactor, openSheet, scrollCalendarToNow } = actions;

  const {
    openCategories,
    openWizard,
    setWizard,
    setDraft,
    applySuggestion,
    pickSuggestion,
  } = serviceActions;

  const state = getState();
  const main = [{ name: "Main phone", backup: false }];
  const both = main.concat([{ name: "Password manager", backup: true }]);

  const drafts = state.services.map((service) =>
    service.status === "active" ? { ...service, status: "draft" } : service,
  );

  const base: Partial<StudioState> = {
    check: { availability: true, profile: true, stripe: false },
    setupMinimised: false,
    tab: "home",
    page: null,
    twoFactorSettings: { devices: [] },
    tax: null,
    taxEdit: false,
    services: drafts,
  };

  if (!["checklist", "checklist-services", "all-done"].includes(key))
    base.setupMinimised = true;

  const setBase = (patch: Partial<StudioState>) =>
    setState({ ...base, ...patch });

  if (/^pay-/.test(key)) scrollToSelector('[data-screen-label="Tax details"]');

  if (/^biz-legal/.test(key)) scrollToSelector('[data-sec="legal"]');

  const stripeDone = { availability: true, profile: true, stripe: true };

  const toServices = () =>
    setState({
      tab: "services",
      servicesTab: "services",
      setupMinimised: true,
    });

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
      window.setTimeout(() => openCategories(), 60);
      break;
    case "cats-dup":
      toServices();

      window.setTimeout(() => {
        openCategories();

        setState(({ categoriesUi }) =>
          categoriesUi
            ? {
                categoriesUi: {
                  ...categoriesUi,
                  newName: "locs",
                  newError: getCategoryNameError(getState(), "locs"),
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

        openWizard("add", null, {
          categoryId: "c1",
          taxonomyId: "braids",
          subcategory: "Box braids",
          typeId: "box-braids",
          name: "Jumbo box braids",
          sizes: makeVariationRows(braids?.sizes),
          lengths: makeVariationRows(braids?.lengths),
        });

        setWizard({ step: 2 });
      }, 60);

      break;
    case "wiz-newcat":
      toServices();

      window.setTimeout(() => {
        openWizard("add", null, {
          taxonomyId: "braids",
          subcategory: "Box braids",
          typeId: "box-braids",
          name: "Jumbo box braids",
        });

        setState(({ wizard, categories }) =>
          wizard
            ? {
                wizard: {
                  ...wizard,
                  step: 2,
                  newCategory: {
                    name: "",
                    colour: getNextCategoryColour(categories),
                    error: "",
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
        openWizard("edit", knotless());
        setWizard({ step: 3 });
      }, 60);

      break;
    case "wiz-sign":
    case "wiz-sign-err":
    case "wiz-own-sign":
      toServices();

      window.setTimeout(() => {
        openWizard("edit", knotless());
        const isError = key === "wiz-sign-err";
        const isOwn = key === "wiz-own-sign";

        setState(({ wizard }) => {
          if (!wizard) return {};

          const draft = {
            ...wizard.draft,
            sizesOn: !isOwn,
            sizes: wizard.draft.sizes.map((row) =>
              row.label === "Large" && isError
                ? {
                    ...row,
                    negative: true,
                    priceDelta: "-90",
                    hoursDelta: "-2",
                    minutesDelta: "0",
                  }
                : row,
            ),
          };

          return {
            wizard: {
              ...wizard,
              step: 3,
              draft,
              ...(isOwn
                ? {
                    ownEdit: {
                      index: 0,
                      name: "Parting",
                      options: [
                        {
                          label: "Straight",
                          priceDelta: "0",
                          minutesDelta: "0",
                        },
                        {
                          label: "Zig-zag",
                          priceDelta: "10",
                          minutesDelta: "20",
                        },
                        {
                          label: "Middle part",
                          negative: true,
                          priceDelta: "-5",
                          minutesDelta: "-15",
                        },
                      ],
                      error: "",
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
        openWizard("edit", knotless());

        setWizard({
          step: 3,
          ownEdit: {
            index: 0,
            name: "Parting",
            options: [
              { label: "Straight", priceDelta: "0", minutesDelta: "0" },
              { label: "Zig-zag", priceDelta: "10", minutesDelta: "20" },
            ],
            error: "",
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
        openWizard("add");
        const type = serviceTypes.find(({ id }) => id === "knotless-braids");

        if (key === "sugg") setWizard({ suggestionsOpen: true });

        if (key === "sugg-group")
          setWizard({ suggestionsOpen: true, categoryFilter: "locs" });

        if (key === "sugg-none")
          setWizard({ suggestionsOpen: true, search: "mohawk fade" });

        if (!type) return;

        if (
          key === "wiz-filled" ||
          key === "wiz-filled-pricing" ||
          key === "wiz-filled-addons"
        ) {
          applySuggestion(type, true, key === "wiz-filled");

          if (key !== "wiz-filled")
            window.setTimeout(
              () => setWizard({ step: key === "wiz-filled-pricing" ? 3 : 4 }),
              50,
            );
        }

        if (key === "wiz-replace") {
          setDraft({ name: "My knotless" });
          window.setTimeout(() => pickSuggestion(type), 60);
        }
      }, 60);

      break;
    case "wiz-search":
      toServices();

      window.setTimeout(() => {
        openWizard("add");
        setWizard({ suggestionsOpen: true, search: "retwist" });
      }, 60);

      break;
    case "cal-day":
      setState({
        tab: "bookings",
        bookingsLayout: "cal",
        dayIndex: 0,
        setupMinimised: true,
      });

      window.setTimeout(() => {
        try {
          scrollCalendarToNow();
        } catch {
          // the calendar may not be laid out yet
        }
      }, 120);

      break;
    case "secure-tax":
      setBase({ twoFactorSettings: { devices: both } });
      openTwoFactor("secure");
      break;
    case "tax-home":
      setBase({
        twoFactorSettings: { devices: both },
        business: {
          ...state.business,
          type: "home",
          details: {
            ...state.business.details,
            line1: "27 Heald Place",
            line2: "",
            city: "Manchester",
            postcode: "M14 5TQ",
          },
        },
      });

      openTwoFactor("tax");
      break;
    case "tax-mobile":
      setBase({
        twoFactorSettings: { devices: both },
        business: {
          ...state.business,
          type: "mobile",
          details: { ...state.business.details, basePostcode: "M16 8AF" },
        },
      });

      openTwoFactor("tax");
      break;
    case "tax-shop":
      setBase({ twoFactorSettings: { devices: both } });
      openTwoFactor("tax");
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
      setBase({ twoFactorSettings: { devices: both } });
      openTwoFactor("tax", { fixture: key.slice(4) });
      break;
    case "tax-learn":
      setBase({ twoFactorSettings: { devices: both } });
      openTwoFactor("learn", { from: "tax" });
      break;
    case "stripe-sheet":
      setBase({ twoFactorSettings: { devices: both }, tax: SOLE_TAX });
      window.setTimeout(() => openSheet("stripe"), 50);
      break;
    case "pay-saved":
      setBase({
        twoFactorSettings: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "settings",
        page: "payouts",
      });

      break;
    case "pay-saved-ltd":
      setBase({
        twoFactorSettings: { devices: both },
        tax: LTD_TAX,
        check: stripeDone,
        tab: "settings",
        page: "payouts",
      });

      break;
    case "pay-hold":
      setBase({
        twoFactorSettings: { devices: both },
        check: stripeDone,
        tab: "settings",
        page: "payouts",
      });

      break;
    case "pay-code":
      setBase({
        twoFactorSettings: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "settings",
        page: "payouts",
      });

      openTwoFactor("taxcode", { flow: "info" });
      break;
    case "pay-edit":
      setBase({
        twoFactorSettings: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "settings",
        page: "payouts",
        taxEdit: true,
      });

      break;
    case "biz-legal":
      setBase({
        twoFactorSettings: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "settings",
        page: "business",
      });

      break;
    case "biz-legal-ltd":
      setBase({
        twoFactorSettings: { devices: both },
        tax: LTD_TAX,
        check: stripeDone,
        tab: "settings",
        page: "business",
      });

      break;
    case "earn-hold":
      setBase({
        twoFactorSettings: { devices: both },
        check: stripeDone,
        tab: "earnings",
      });

      break;
    case "secure-locked":
      setBase({});
      openTwoFactor("secure");
      break;
    case "secure-unlocked":
      setBase({ twoFactorSettings: { devices: both } });
      openTwoFactor("secure");
      break;
    case "checklist-services":
      setBase({
        twoFactorSettings: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
      });

      break;
    case "services-drafts":
      setBase({
        twoFactorSettings: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        tab: "services",
        servicesTab: "services",
      });

      break;
    case "tf-method":
      setBase({});
      openTwoFactor("method");
      break;
    case "tf-app":
      setBase({});
      openTwoFactor("app");
      break;
    case "tf-app-key":
      setBase({});
      openTwoFactor("app", { keyShown: true });
      break;
    case "tf-app-error":
      setBase({});

      openTwoFactor("app", {
        code: "482910",
        error: "code",
        errorMessage: WRONG_CODE,
      });

      break;
    case "tf-dup":
      setBase({ twoFactorSettings: { devices: main } });

      openTwoFactor("app", {
        kind: "backup",
        option: "device",
        name: "Main phone",
        code: "",
        error: "name",
        errorMessage: "You already have a device with this name",
      });

      break;
    case "tf-backup":
      setBase({ twoFactorSettings: { devices: main } });
      openTwoFactor("backup");
      break;
    case "tf-backup-app":
      setBase({ twoFactorSettings: { devices: main } });

      openTwoFactor("app", {
        kind: "backup",
        option: "pm",
        name: "Password manager",
      });

      break;
    case "tf-skip":
      setBase({ twoFactorSettings: { devices: main } });
      openTwoFactor("backup", { skipWarn: true });
      break;
    case "tf-done":
      setBase({ twoFactorSettings: { devices: both } });
      openTwoFactor("done");
      break;
    case "home-gate":
      setBase({
        check: { availability: false, profile: false, stripe: false },
      });

      break;
    case "share-locked":
      setBase({ tab: "settings", page: "profile", shareTip: true });
      break;
    case "sec-off":
      setBase({ tab: "settings", page: "security" });
      break;
    case "sec-on1":
      setBase({
        tab: "settings",
        page: "security",
        twoFactorSettings: { devices: main },
      });

      break;
    case "sec-on2":
      setBase({
        tab: "settings",
        page: "security",
        twoFactorSettings: { devices: both },
      });

      break;
    case "sec-remove":
      setBase({
        tab: "settings",
        page: "security",
        twoFactorSettings: { devices: both },
      });

      openTwoFactor("remove", { name: "Password manager" });
      break;
    case "all-done":
      memo.seenDone = {
        availability: true,
        profile: true,
        secure: true,
        services: false,
      };

      setBase({
        twoFactorSettings: { devices: both },
        tax: SOLE_TAX,
        check: stripeDone,
        services: drafts.map((service, index) =>
          index === 0 ? { ...service, status: "active" } : service,
        ),
      });

      actions.checkDone();
      break;
  }
};
