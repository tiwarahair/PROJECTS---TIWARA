// Derived values for the Account page.
import { stylists } from "../../data";
import { QUIZ_DAYS_AGO, SECTIONS } from "./account-data";
import type { AccountBooking, AccountSection } from "./account-data";
import {
  formatAccountDate,
  getAccountStylist,
  getAddressLine,
  getBookingMoney,
} from "./account-logic";
import type { BookingMoney } from "./account-logic";
import type { AccountState } from "./use-account";
import { formatMoney } from "../../utils/money";

export interface BookingCardView {
  booking: AccountBooking;
  money: BookingMoney;
  aria: string;
  when: string;
  profile: string;
  manage: string;
  help: string;
  again: string;
}

export interface QuickAction {
  key: string;
  label: string;
  subtitle: string;
  href: string;
  icon: string;
  /** Switches section in place instead of following the link. */
  section?: string;
}

const getBookingCard = (
  booking: AccountBooking,
  bookingMoney: BookingMoney,
): BookingCardView => {
  const { id, stylistId, service, at } = booking;
  const when = formatAccountDate(at, true);

  return {
    booking,
    money: bookingMoney,
    aria: `${service} with ${bookingMoney.stylist.name}, ${when}, ${bookingMoney.tag[0]}`,
    when,
    profile: `/${stylistId}`,
    manage: `/manage?view=booking&stylist=${stylistId}`,
    help: `/help?booking=${id}`,
    again: `/book?stylist=${stylistId}&service=${encodeURIComponent(service)}`,
  };
};

const getSectionIcon = (id: string): string =>
  SECTIONS.find((section) => section.id === id)?.icon ?? "";

/** The page's derived values; `favouriteIds` comes from the favourites store. */
export const getAccountView = (
  state: AccountState,
  favouriteIds: string[],
  loggedIn: boolean,
) => {
  const now = Date.now();

  const {
    sectionId,
    wide,
    profile,
    quiz,
    addresses,
    cards,
    bookings,
    dialog,
    bookingsTab,
  } = state;

  const current = sectionId || (wide ? "overview" : null);
  const mobileHome = !wide && !sectionId;

  const section: AccountSection | undefined = SECTIONS.find(
    ({ id }) => id === current,
  );

  const returnTo = `/account${current ? `?section=${current}` : ""}`;
  const loginHref = `/login?screen=cust-email&return=${encodeURIComponent(returnTo)}`;

  const withMoney = bookings.map((booking) => ({
    booking,
    money: getBookingMoney(booking, addresses, cards),
  }));

  const isUpcoming = ({ at, status }: AccountBooking) =>
    at >= now && status !== "cancelled";

  const upcomingRaw = withMoney
    .filter(({ booking }) => isUpcoming(booking))
    .sort((first, second) => first.booking.at - second.booking.at);

  const pastRaw = withMoney
    .filter(({ booking }) => !isUpcoming(booking))
    .sort((first, second) => second.booking.at - first.booking.at);

  const upcoming = upcomingRaw.map(({ booking, money: bookingMoney }) =>
    getBookingCard(booking, bookingMoney),
  );

  const past = pastRaw.map(({ booking, money: bookingMoney }) =>
    getBookingCard(booking, bookingMoney),
  );

  const lastDone = pastRaw.find(
    ({ booking }) => booking.status === "completed",
  );

  const favourites = favouriteIds
    .map((id) => stylists.find((stylist) => stylist.id === id))
    .filter((stylist) => !!stylist);

  const quizDate = new Date(now - QUIZ_DAYS_AGO).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const quick: QuickAction[] = [];

  if (lastDone) {
    const { stylistId, service } = lastDone.booking;
    const serviceParam = encodeURIComponent(service);

    quick.push({
      key: "again",
      label: `Book again with ${lastDone.money.stylist.name}`,
      subtitle: service,
      href: `/book?stylist=${stylistId}&service=${serviceParam}`,
      icon: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
    });
  }

  quick.push({
    key: "favs",
    label: `Your favourites (${favourites.length})`,
    subtitle: favourites.length
      ? "Stylists you’ve saved"
      : "Save stylists you love",
    href: "/account?section=favourites",
    icon: getSectionIcon("favourites"),
    section: "favourites",
  });

  quick.push({
    key: "quiz",
    label: quiz ? "Retake the hair quiz" : "Take the hair quiz",
    subtitle: quiz
      ? `Last taken ${quizDate}`
      : "Find styles that suit your hair",
    href: "/#quiz",
    icon: getSectionIcon("hair"),
  });

  const getScreenLabel = () => {
    if (state.deleted) return "Account deleted";

    if (!loggedIn) return "Account: logged out";

    if (mobileHome) return "Account: home list";

    return `Account: ${section?.label ?? ""}`;
  };

  const overviewDescription = upcoming.length
    ? "Here’s what’s coming up."
    : "Nothing booked yet.";

  const showPastTab = bookingsTab === "past" && past.length > 0;
  const blocked = upcoming.length > 0;

  const receiptBooking =
    dialog?.kind === "receipt"
      ? withMoney.find(({ booking }) => booking.id === dialog.id)
      : undefined;

  return {
    now,
    current,
    mobileHome,
    section,
    loginHref,
    initials: (profile.first[0] || "") + (profile.last[0] || ""),
    accountName: `${profile.first} ${profile.last}`,
    screenLabel: getScreenLabel(),
    title:
      current === "overview" ? `Hi ${profile.first}` : (section?.label ?? ""),
    description:
      current === "overview"
        ? overviewDescription
        : (section?.description ?? ""),
    upcoming,
    past,
    quick,
    quizDate,
    favourites,
    showUpcoming: (bookingsTab || "up") !== "past" || !past.length,
    showPast: showPastTab,
    activeTab: showPastTab ? "past" : "up",
    blocked,
    receipt: receiptBooking
      ? {
          ref: receiptBooking.booking.id,
          date: formatAccountDate(receiptBooking.booking.at, true),
          stylist: receiptBooking.money.stylist.name,
          where: receiptBooking.money.where,
          total: formatMoney(receiptBooking.money.total),
          lines: receiptBooking.money.lines,
          payments: receiptBooking.money.payments,
        }
      : null,
    /** "Wed 14 Oct" of the next card-secured booking, else "". */
    getCardInUse: (cardId: string): string => {
      const [next] = bookings
        .filter(
          ({ card, at, mode, status }) =>
            card === cardId &&
            at >= now &&
            (mode === "deposit" || mode === "card") &&
            status !== "cancelled",
        )
        .sort((first, second) => first.at - second.at);

      return next ? formatAccountDate(next.at) : "";
    },
    getStylistName: (id: string) => getAccountStylist(id).name,
    getAddressLine,
  };
};

export type AccountView = ReturnType<typeof getAccountView>;
