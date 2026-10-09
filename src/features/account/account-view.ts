// Derived values for the Account page (prototype Account.dc.html renderVals()).
import { stylists } from "../../data";
import { money } from "../../utils/pricing";
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
  sub: string;
  href: string;
  icon: string;
  /** Switches section in place instead of following the link. */
  section?: string;
}

const getBookingCard = (
  booking: AccountBooking,
  bookingMoney: BookingMoney,
): BookingCardView => {
  const { id, sid, svc, at } = booking;
  return {
    booking,
    money: bookingMoney,
    aria:
      svc +
      " with " +
      bookingMoney.stylist.name +
      ", " +
      formatAccountDate(at, true) +
      ", " +
      bookingMoney.tag[0],
    when: formatAccountDate(at, true),
    profile: "/stylist?stylist=" + sid,
    manage: "/manage?view=booking&stylist=" + sid,
    help: "/help?booking=" + id,
    again: "/book?stylist=" + sid + "&service=" + encodeURIComponent(svc),
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
  const { sec, wide, me, quiz, addrs, cards, bookings, dlg, bkTab } = state;
  const current = sec || (wide ? "overview" : null);
  const mobileHome = !wide && !sec;
  const section: AccountSection | undefined = SECTIONS.find(
    ({ id }) => id === current,
  );
  const returnTo =
    "/account" + (current ? "?section=" + current + "&" : "?") + "login=1";
  const loginHref =
    "/onboarding?screen=cust-email&return=" + encodeURIComponent(returnTo);

  const withMoney = bookings.map((booking) => ({
    booking,
    money: getBookingMoney(booking, addrs, cards),
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
  if (lastDone)
    quick.push({
      key: "again",
      label: "Book again with " + lastDone.money.stylist.name,
      sub: lastDone.booking.svc,
      href:
        "/book?stylist=" +
        lastDone.booking.sid +
        "&service=" +
        encodeURIComponent(lastDone.booking.svc),
      icon: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
    });
  quick.push({
    key: "favs",
    label: "Your favourites (" + favourites.length + ")",
    sub: favourites.length ? "Stylists you’ve saved" : "Save stylists you love",
    href: "/account?section=favourites",
    icon: getSectionIcon("favourites"),
    section: "favourites",
  });
  quick.push({
    key: "quiz",
    label: quiz ? "Retake the hair quiz" : "Take the hair quiz",
    sub: quiz ? "Last taken " + quizDate : "Find styles that suit your hair",
    href: "/#quiz",
    icon: getSectionIcon("hair"),
  });

  const showPastTab = bkTab === "past" && past.length > 0;
  const blocked = upcoming.length > 0;
  const receiptBooking =
    dlg?.k === "receipt"
      ? withMoney.find(({ booking }) => booking.id === dlg.id)
      : undefined;

  return {
    now,
    current,
    mobileHome,
    section,
    loginHref,
    initials: (me.first[0] || "") + (me.last[0] || ""),
    accountName: me.first + " " + me.last,
    screenLabel: state.deleted
      ? "Account deleted"
      : !loggedIn
        ? "Account: logged out"
        : mobileHome
          ? "Account: home list"
          : "Account: " + (section?.label ?? ""),
    title: current === "overview" ? "Hi " + me.first : (section?.label ?? ""),
    description:
      current === "overview"
        ? upcoming.length
          ? "Here’s what’s coming up."
          : "Nothing booked yet."
        : (section?.description ?? ""),
    upcoming,
    past,
    quick,
    quizDate,
    favourites,
    showUpcoming: (bkTab || "up") !== "past" || !past.length,
    showPast: showPastTab,
    activeTab: showPastTab ? "past" : "up",
    blocked,
    receipt: receiptBooking
      ? {
          ref: receiptBooking.booking.id,
          date: formatAccountDate(receiptBooking.booking.at, true),
          stylist: receiptBooking.money.stylist.name,
          where: receiptBooking.money.where,
          total: money(receiptBooking.money.total),
          lines: receiptBooking.money.lines,
          pays: receiptBooking.money.pays,
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
