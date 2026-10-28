import type { FieldErrors } from "react-hook-form";
import type { PublicStylist } from "../../../lib/public-stylist";
import type { Catalogue } from "../../../types/catalogue";
import {
  findService,
  getServiceOptions,
  hasStep2,
} from "../../../utils/services";
import { getClosedLine } from "../logic/calendar";
import { toChoices } from "../logic/choices";
import { EMPTY_ADDRESS, STEPS } from "../logic/constants";
import { getAddressCheck, getFirstErrorTarget } from "../logic/details";
import { clearDraft, getDraftPatch, saveDraft } from "../logic/draft";
import { focusLater } from "../logic/focus";
import { getBookingMoney, getCustomisationLine } from "../logic/pricing";
import { getFreshSelection, getStartStep } from "../logic/state";
import type { Details } from "../logic/types";
import { useAccount } from "./use-account";
import { useDetailsForm } from "./use-details-form";
import { useFlowState } from "./use-flow-state";
import { useHold } from "./use-hold";
import { useLeaveGuard } from "./use-leave-guard";
import { usePay } from "./use-pay";
import { useTravelCheck } from "./use-travel-check";

export const useBooking = (
  { stylist, hours }: PublicStylist,
  { types }: Catalogue,
) => {
  const flow = useFlowState(stylist);
  const { state, stateRef, setState, crumbsRef, scrollToTitle } = flow;

  const detailsForm = useDetailsForm(flow);
  const leave = useLeaveGuard(flow);

  const account = useAccount({
    flow,
    detailsForm,
    isLeaving: leave.isLeaving,
    stylistId: stylist.id,
  });

  const service = findService(stylist, state.serviceId);
  const options = getServiceOptions(service, types);
  const money = getBookingMoney(stylist, service, options, state.selection);
  const isMobileStylist = stylist.businessType === "mobile";
  const choices = toChoices(options, state.selection);
  const hasCustomiseStep = !!(service && hasStep2(service));
  const needSize = options.size.length > 0 && !state.selection.size;
  const needLength = options.length.length > 0 && !state.selection.length;

  const hold = useHold({
    flow,
    choices,
    canListTimes: !!service && !needSize && !needLength,
  });

  const travel = useTravelCheck(
    state.serviceId,
    state.appointmentAddress,
    isMobileStylist,
  );

  const pay = usePay({
    flow,
    point: travel.point,
    stylist: { name: stylist.name, email: stylist.email },
    onConfirm: account.saveContactToAccount,
  });

  const address = {
    ...getAddressCheck(state.appointmentAddress),
    inArea: travel.inArea,
    outBlock: travel.outBlock,
  };

  const isAddressMissing = isMobileStylist && !address.isValid;

  const nextDisabled =
    state.holding ||
    (state.step === 2 && (needSize || needLength)) ||
    (state.step === 3 && (!(state.date && state.time) || hold.isLoadingSlots));

  const goToStep = (step: number) => setState({ step }, scrollToTitle);

  const goToNextStep = async () => {
    const extra = state.step === 3 ? await hold.holdChosenTime() : {};

    if (!extra) return;

    if (state.step === 3 && !account.hasSession && !state.guest) {
      setState({ ...extra, loginStart: "choice", repickNote: false });

      return;
    }

    setState(
      ({ step }) => ({
        ...extra,
        step: Math.min(6, step + 1),
        repickNote: false,
      }),
      scrollToTitle,
    );
  };

  const actions = {
    ...leave.actions,
    ...account.actions,
    ...hold.actions,
    setState,
    scrollToTitle,
    goToStep,
    pickService: (serviceId: string) => {
      const picked = findService(stylist, serviceId);

      setState(
        {
          serviceId,
          step: getStartStep(picked),
          selection: getFreshSelection(picked),
          showPrev: false,
          date: null,
          time: null,
        },
        scrollToTitle,
      );
    },
    goBack: () =>
      setState(
        ({ step }) => ({
          step: Math.max(
            1,
            step - 1 - (step === 3 && !hasCustomiseStep ? 1 : 0),
          ),
        }),
        scrollToTitle,
      ),
    goNext: () => {
      if (nextDisabled) return;

      if (state.step !== 4) return void goToNextStep();

      const focusFirstError = (errors: FieldErrors<Details>) => {
        if (state.loggedIn && Object.keys(errors).length)
          setState({ editContact: true });

        focusLater(
          getFirstErrorTarget(
            { address: isAddressMissing, ...errors },
            address.outBlock,
          ),
        );
      };

      void detailsForm.handleSubmit(() => {
        if (isAddressMissing || address.outBlock) return focusFirstError({});

        void goToNextStep();
      }, focusFirstError)();
    },
    saveDraftNow: () => saveDraft(stateRef.current),
    resumeContinue: () => {
      if (!state.resumeDraft) return;

      const patch = getDraftPatch(state.resumeDraft, state);

      if (patch.details) detailsForm.reset(patch.details);

      setState(patch, scrollToTitle);
    },
    resumeStartOver: () => {
      clearDraft(state.id);
      setState({ resumeDraft: null });
    },
    clearAddress: () =>
      setState(({ appointmentAddress }) => ({
        appointmentAddress: {
          ...EMPTY_ADDRESS,
          notes: appointmentAddress.notes,
        },
      })),
  };

  return {
    state,
    crumbsRef,
    stylist,
    service,
    options,
    money,
    customisationLine: getCustomisationLine(options, state.selection),
    isMobileStylist,
    address,
    detailsForm,
    needsMobile: account.needsMobile,
    showContactFields: account.showContactFields,
    hasCustomiseStep,
    needSize,
    needLength,
    nextDisabled,
    pay,
    holdOn: hold.holdOn,
    slotsByDay: hold.slotsByDay,
    isLoadingSlots: hold.isLoadingSlots,
    closedLine: getClosedLine(hours),
    holdLeftMs: hold.holdLeftMs,
    steps: STEPS.filter(
      ({ stepNumber }) => stepNumber !== 2 || hasCustomiseStep,
    ),
    actions,
  };
};

export type BookingController = ReturnType<typeof useBooking>;
