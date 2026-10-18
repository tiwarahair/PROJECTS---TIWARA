// Studio → Settings: composes the page views and wires the embedded pages (policy, business, account, tax).
import type { BusinessValue } from "../../../components/business-details/types";
import type { PolicyValue } from "../../../components/payment-policy/types";
import type { PaymentPolicyApi } from "../../../components/payment-policy";
import type { AccountSettingsApi } from "../../../components/account-settings/use-account-settings";
import type { TaxDetails } from "../../../components/tax-details-form/logic";
import { addPaymentPolicy } from "../../../lib/studio-api";
import { hasRecentSecondFactor } from "../../../lib/two-factor";
import { getAvailabilityView } from "./availability/view";
import { getSettingsNav } from "./nav-view";
import { getProfileView } from "./profile/view";
import { getRulesView } from "./rules/view";
import { saveBusiness } from "./business";
import { hasTwoFactor } from "../core/model";
import { fromPolicy } from "./records";
import type { StudioController } from "../core/use-studio";

export const getSettingsView = (
  studio: StudioController,
  navigate: (to: string) => void,
  signOut: () => void,
) => {
  const { state, setState, props, isDesktop, isNew, actions, context } = studio;

  const { showToast, openSubpage, openSheet, openTwoFactor, scrollBody } =
    actions;

  const { sync } = context;
  const nav = getSettingsNav(studio, navigate);
  const { page, isOn, isAccountPage } = nav;

  const savePolicy = (value: PolicyValue) => {
    const { policy } = context.getState();

    setState({ policy: { ...policy, ...value } });

    sync?.save((stylistId) => addPaymentPolicy(fromPolicy(value, stylistId)), {
      policy,
    });

    showToast("Payment policy saved");
  };

  const checkPolicy = async (value: PolicyValue) => {
    if (
      !sync ||
      !hasTwoFactor(state) ||
      (await hasRecentSecondFactor().catch(() => false))
    ) {
      savePolicy(value);

      return true;
    }

    showToast("For your security, enter a code from your authenticator app.");
    openTwoFactor("taxcode", { flow: "info", from: "policy" });
    context.memo.afterSecondFactor = () => context.memo.policyApi?.save();

    return false;
  };

  return {
    ...nav,
    isRootMobile: !studio.isWide && state.tab === "settings" && !state.page,
    isPage: state.tab === "settings" && (studio.isWide || !!state.page),
    isAvailability: isOn && page === "availability",
    isProfile: isOn && page === "profile",
    isRules: isOn && page === "rules",
    isPolicy: isOn && page === "policy",
    isBusiness: isOn && page === "business",
    hasOwnFooter:
      isOn && !!page && ["availability", "profile", "rules"].includes(page),
    accountPage: isAccountPage
      ? (page as
          "personal" | "security" | "notifications" | "payouts" | "calendar")
      : "personal",
    isAccountShown: isOn && isAccountPage,
    hasAccountSave:
      isOn && !!page && ["personal", "security", "payouts"].includes(page),
    isNavDesktop: isDesktop,
    signOut,
    ...getRulesView(studio),
    ...getAvailabilityView(studio),
    ...getProfileView(studio),
    policyValue: state.policy,
    policyBookings: state.bookings.filter(
      ({ dayOffset, status }) =>
        (dayOffset || 0) >= 0 && status !== "cancelled",
    ).length,
    onPolicySave: checkPolicy,

    // the embedded page reports whether it can save; the mobile header button calls back into it
    onPolicyState: (api: PaymentPolicyApi) => {
      context.memo.policyApi = api;

      if (!!api.canSave !== !!context.getState().policyCanSave)
        setState({ policyCanSave: !!api.canSave });
    },
    savePolicyHeader: () => {
      if (context.memo.policyApi?.canSave) context.memo.policyApi.save();
    },
    onBusinessSave: (value: BusinessValue) => {
      const before = { business: state.business, profile: state.profile };

      // Profile shows the same contact email
      setState({
        business: value,
        profile: {
          ...state.profile,
          mobile: value.type === "mobile",
          email: value.details.email,
        },
      });

      sync?.save(
        (stylistId) => saveBusiness(stylistId, value, state.business),
        before,
      );

      showToast("Business details saved");
    },
    onBusinessState: (api: { canSave: boolean; save: () => void }) => {
      context.memo.businessApi = api;

      if (!!api.canSave !== !!context.getState().businessCanSave)
        setState({ businessCanSave: !!api.canSave });
    },
    saveBusinessHeader: () => {
      if (context.memo.businessApi?.canSave) context.memo.businessApi.save();
    },
    onAccountState: (api: AccountSettingsApi) => {
      context.memo.accountApi = api;

      if (!!api.canSave !== !!context.getState().accountCanSave)
        setState({ accountCanSave: !!api.canSave });
    },
    saveAccountHeader: () => {
      if (context.memo.accountApi?.canSave) context.memo.accountApi.save();
    },
    connectStripe: () => openSheet("stripe"),
    editTaxFromBusiness: () => {
      setState({ page: "payouts" });
      scrollBody(0, false);
    },
    payoutStatus:
      state.payoutStatus ??
      ((!state.check?.stripe ? "none" : props.payouts || "active") as
        "none" | "verifying" | "action" | "paused" | "active"),
    payoutBank: state.payoutBank,
    openStripeDashboard: () => void actions.openStripeDashboard(),
    accountUpcoming: isNew
      ? 0
      : state.bookings.filter(
          ({ dayOffset, status }) =>
            (dayOffset || 0) >= 0 && status !== "cancelled",
        ).length,
    onAccountNav: (to: "business" | "earnings") => {
      if (to === "earnings") {
        setState({ tab: "earnings", page: null });
        scrollBody(0, false);
      } else openSubpage(to);
    },
    onTaxEdit: () => void actions.openTaxEdit(),
    onTaxAdd: () => {
      if (!hasTwoFactor(state)) {
        openTwoFactor("secure");

        return;
      }

      setState({ taxEdit: true });
    },
    onTaxSave: (value: TaxDetails) =>
      void actions.saveTax(value, () => {
        context.memo.isTaxEdited = false;
        setState({ taxEdit: false });
      }),
    onTaxCancel: () => setState({ taxEdit: false }),
    onTaxDirty: (isDirty: boolean) => {
      context.memo.isTaxEdited = isDirty;
    },
    onTaxLearn: () => openTwoFactor("learn", { flow: "info" }),
    onTwoFactorTurnOn: () => openTwoFactor("method", { flow: "settings" }),
    onTwoFactorAddBackup: () => openTwoFactor("backup", { flow: "add" }),
    onTwoFactorRemove: (name: string) => openTwoFactor("remove", { name }),
  };
};

export type SettingsView = ReturnType<typeof getSettingsView>;
