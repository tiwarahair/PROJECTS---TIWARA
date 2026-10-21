// Derived values for the Account page.
import { Heart, RotateCcw, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { QUIZ_DAYS_AGO, SECTIONS } from "./data";
import type { AccountBooking, AccountSection } from "./data";
import {
  formatAccountDate,
  getAddressLine,
  getBookingMoney,
  isUpcomingBooking,
} from "./logic";
import type { BookingMoney } from "./logic";
import type { AccountState } from "./state";
import type { AccountData } from "./use-core";

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
  icon: LucideIcon;
  /** Switches section in place instead of following the link. */
  section?: string;
}

const getBookingCard = (
  booking: AccountBooking,
  bookingMoney: BookingMoney,
): BookingCardView => {
  const { ref, stylistSlug, stylistName, service, at } = booking;
  const when = formatAccountDate(at, true);

  return {
    booking,
    money: bookingMoney,
    aria: `${service} with ${stylistName}, ${when}, ${bookingMoney.tag[0]}`,
    when,
    profile: `/${stylistSlug}`,
    manage: `/manage?ref=${ref}`,
    help: `/help?booking=${ref}`,
    again: `/book?stylist=${stylistSlug}&service=${encodeURIComponent(service)}`,
  };
};

/** The page's derived values; `favouriteIds` comes from the favourites store. */
export const getAccountView = (
  state: AccountState,
  { bookings }: AccountData,
  favouriteIds: string[],
  loggedIn: boolean,
) => {
  const now = Date.now();

  const { sectionId, wide, profile, quiz, dialog, bookingsTab } = state;

  const current = sectionId || (wide ? "overview" : null);
  const mobileHome = !wide && !sectionId;

  const section: AccountSection | undefined = SECTIONS.find(
    ({ id }) => id === current,
  );

  const returnTo = `/account${current ? `?section=${current}` : ""}`;
  const loginHref = `/login?screen=cust-email&return=${encodeURIComponent(returnTo)}`;

  const withMoney = bookings.map((booking) => ({
    booking,
    money: getBookingMoney(booking),
  }));

  const upcomingRaw = withMoney
    .filter(({ booking }) => isUpcomingBooking(booking))
    .sort((first, second) => first.booking.at - second.booking.at);

  const pastRaw = withMoney
    .filter(({ booking }) => !isUpcomingBooking(booking))
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

  const quizDate = new Date(now - QUIZ_DAYS_AGO).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const quick: QuickAction[] = [];

  if (lastDone) {
    const { stylistSlug, stylistName, service } = lastDone.booking;
    const serviceParam = encodeURIComponent(service);

    quick.push({
      key: "again",
      label: `Book again with ${stylistName}`,
      subtitle: service,
      href: `/book?stylist=${stylistSlug}&service=${serviceParam}`,
      icon: RotateCcw,
    });
  }

  quick.push({
    key: "favs",
    label: `Your favourites (${favouriteIds.length})`,
    subtitle: favouriteIds.length
      ? "Stylists you’ve saved"
      : "Save stylists you love",
    href: "/account?section=favourites",
    icon: Heart,
    section: "favourites",
  });

  quick.push({
    key: "quiz",
    label: quiz ? "Retake the hair quiz" : "Take the hair quiz",
    subtitle: quiz
      ? `Last taken ${quizDate}`
      : "Find styles that suit your hair",
    href: "/#quiz",
    icon: Sparkles,
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
    favouriteIds,
    showUpcoming: (bookingsTab || "up") !== "past" || !past.length,
    showPast: showPastTab,
    activeTab: showPastTab ? "past" : "up",
    receipt: receiptBooking
      ? {
          ref: receiptBooking.booking.ref,
          date: formatAccountDate(receiptBooking.booking.at, true),
          stylist: receiptBooking.booking.stylistName,
          where: receiptBooking.booking.where,
          total: receiptBooking.money.total,
          lines: receiptBooking.money.lines,
          payments: receiptBooking.money.payments,
        }
      : null,
    /** "Wed 14 Oct" of the next card-secured booking, else "". */
    getCardInUse: (cardId: string): string => {
      const [next] = bookings
        .filter(
          (booking) =>
            booking.paymentMethodId === cardId &&
            isUpcomingBooking(booking) &&
            (booking.mode === "deposit" || booking.mode === "card"),
        )
        .sort((first, second) => first.at - second.at);

      return next ? formatAccountDate(next.at) : "";
    },
    getStylistName: (id: string) =>
      bookings.find(({ stylistSlug }) => stylistSlug === id)?.stylistName ??
      "Your stylist",
    getAddressLine,
  };
};

export type AccountView = ReturnType<typeof getAccountView>;
