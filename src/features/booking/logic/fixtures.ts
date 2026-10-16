import type { Stylist } from "../../../types/stylist";
import {
  findService,
  getActiveServices,
  getServiceOptions,
} from "../../../utils/services";
import { EMPTY_DETAILS } from "./constants";
import { getFreshSelection } from "./state";
import type { BookingState, Details } from "./types";

const DEMO_DETAILS: Details = {
  first: "Nia",
  last: "Okafor",
  email: "nia.okafor@gmail.com",
  phone: "07700 900123",
  notes: "",
};

/** Next week's Wednesday: the demo date every fixture books. */
const getFixtureDate = (): Date => {
  const date = new Date();

  date.setDate(date.getDate() + ((10 - date.getDay()) % 7 || 7));

  return date;
};

const pickLabel = (
  options: { label: string }[],
  label: string,
): string | null =>
  options.length
    ? ((options.find((option) => option.label === label) ?? options[0])
        ?.label ?? null)
    : null;

const findServiceOrFirst = (stylist: Stylist, name: string) =>
  findService(stylist, name) ?? getActiveServices(stylist)[0];

export const applyFixture = (
  state: BookingState,
  fixture: string,
  defaultStylist: Stylist,
): { openPrivacy: boolean; showErrors: boolean } => {
  const fixtureDate = getFixtureDate();

  const setFixtureDate = () => {
    state.calendarMonth = fixtureDate.getMonth();
    state.calendarYear = fixtureDate.getFullYear();
    state.date = fixtureDate.getDate();
    state.time = "10:30";

    const startsAt = new Date(fixtureDate);

    startsAt.setHours(10, 30, 0, 0);

    state.booked = {
      id: "",
      secret: "",
      ref: "TH-48213",
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 2 * 36e5).toISOString(),
    };
  };

  if (!state.serviceId) {
    const service = findServiceOrFirst(defaultStylist, "Knotless braids");

    state.serviceId = service ? service.id : "";
    state.selection = getFreshSelection(service);
  }

  if (state.selection.size === null) {
    const options = getServiceOptions(
      findService(defaultStylist, state.serviceId),
    );

    state.selection.size = pickLabel(options.size, "Medium");
    state.selection.length = pickLabel(options.length, "Shoulder");
  }

  state.details = { ...DEMO_DETAILS };
  state.step = 4;
  state.guest = true;

  if (fixture === "time-picked" || fixture === "details-login") {
    state.details = { ...EMPTY_DETAILS };
    state.guest = false;
  }

  if (fixture === "details-login") state.loginStart = "email";

  if (fixture === "time-picked") {
    state.step = 3;
    setFixtureDate();
  }

  if (fixture === "details-card") state.loggedIn = true;

  if (fixture === "details-empty") state.allergy.on = true;

  if (["details-text", "review", "privacy"].includes(fixture))
    Object.assign(state.allergy, { on: true, text: "Sensitive scalp" });

  if (fixture === "details-text")
    state.allergy.text =
      "Sensitive scalp, and I react to strong-hold edge control. Please use something fragrance-free.";

  if (fixture === "details-prefill")
    Object.assign(state.allergy, {
      on: true,
      text: "Sensitive scalp",
      prior: true,
    });

  if (fixture === "natural") {
    const service = findServiceOrFirst(defaultStylist, "Wash & style");

    state.serviceId = service?.id ?? "";
    state.selection = getFreshSelection(service);
    state.step = 3;
  }

  if (fixture === "custom-before" || fixture === "custom-after") {
    state.step = 2;
    const service = findService(defaultStylist, state.serviceId);

    state.selection = getFreshSelection(service);

    if (fixture === "custom-after") {
      const { size, length } = getServiceOptions(service);

      state.selection.size = pickLabel(size, "Medium");
      state.selection.length = pickLabel(length, "Bra");
    }
  }

  if (fixture === "email-typo") state.details.email = "nia.okafor@gmial.com";

  if (["pay", "confirm"].includes(fixture)) {
    state.step = 6;
    setFixtureDate();
  }

  if (fixture === "confirm") state.confirmed = true;

  if (fixture === "review") {
    state.step = 5;
    setFixtureDate();
  }

  const isMobileStylist = defaultStylist.businessType === "mobile";

  if (["address", "address-out", "address-empty"].includes(fixture))
    state.step = 4;

  if (state.step >= 4 && !state.date) setFixtureDate();

  if (
    isMobileStylist &&
    !["details-errors", "address-empty", "address-out"].includes(fixture)
  )
    state.appointmentAddress = {
      ...state.appointmentAddress,
      postcode: "M14 5TQ",
      line1: "12 Dickenson Road",
      line2: "",
      town: "Manchester",
      source: "pick",
    };

  if (fixture === "address-out")
    state.appointmentAddress = {
      ...state.appointmentAddress,
      postcode: "BL1 4QR",
      line1: "12 Chorley New Road",
      line2: "",
      town: "Bolton",
      source: "pick",
    };

  if (fixture === "details-errors") state.details = { ...EMPTY_DETAILS };

  if (["pay-declined", "pay-network", "pay-taken"].includes(fixture))
    state.step = 6;

  if (fixture === "pay-declined")
    Object.assign(state, {
      payError: "Your card was declined. Try another card or payment method.",
      payKind: "declined",
    });

  if (fixture === "pay-network")
    Object.assign(state, {
      payError: "Something went wrong and you haven't been charged. Try again.",
      payKind: "network",
    });

  if (fixture === "pay-taken")
    Object.assign(state, {
      payError: `Sorry, ${state.time} was just booked by someone else. You haven't been charged.`,
      payKind: "taken",
    });

  if (fixture === "confirm-saved") {
    state.confirmed = true;
    state.account = { ...state.account, saved: true };
  }

  if (fixture === "confirm-sent") {
    state.confirmed = true;
    state.account = { ...state.account, sent: true, sentAt: Date.now() };
  }

  if (state.step >= 4 && !state.confirmed && state.time)
    state.hold = {
      id: "",
      secret: "",
      // hold-amber starts with 95 seconds left
      until:
        Date.now() +
        (fixture === "hold-amber" ? 95000 : state.holdSeconds * 1000),
    };

  if (fixture === "hold-expired") state.holdExpired = true;

  if (fixture === "leave") state.leave = `/${state.id}`;

  if (fixture === "time") {
    state.step = 3;
    state.date = null;
    state.time = null;
    state.hold = null;
  }

  if (fixture === "resume") {
    state.resumeDraft = {
      at: Date.now(),
      step: 5,
      serviceId: state.serviceId,
      selection: state.selection,
      calendarMonth: state.calendarMonth,
      calendarYear: state.calendarYear,
      date: state.date,
      time: state.time,
      details: { ...state.details },
      appointmentAddress: { ...state.appointmentAddress },
      holdUntil: null,
    };

    Object.assign(state, {
      step: 1,
      serviceId: "",
      selection: getFreshSelection(null),
      date: null,
      time: null,
      hold: null,
      details: { ...EMPTY_DETAILS },
    });
  }

  return {
    openPrivacy: fixture === "privacy",
    showErrors: fixture === "details-errors",
  };
};
