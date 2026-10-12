// Account sections, icons and demo data (sections, icons, taken emails, legacy tab names, seed bookings,
// quiz rows).

export interface AccountSection {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export const SECTIONS: AccountSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Your next appointment and quick links.",
    icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  },
  {
    id: "bookings",
    label: "Bookings",
    description: "Upcoming, past and cancelled appointments.",
    icon: "M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM3 10h18M8 2v4M16 2v4",
  },
  {
    id: "favourites",
    label: "Favourites",
    description: "Stylists you’ve saved.",
    icon: "M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z",
  },
  {
    id: "hair",
    label: "Hair profile",
    description: "Your hair quiz results, so we can suggest styles.",
    icon: "M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  },
  {
    id: "personal",
    label: "Personal details",
    description: "Your name and how stylists can contact you.",
    icon: "M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
  {
    id: "security",
    label: "Login & security",
    description: "Your password and the ways you log in.",
    icon: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  },
  {
    id: "payments",
    label: "Payment methods",
    description: "Cards saved for deposits and payments.",
    icon: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20",
  },
  {
    id: "addresses",
    label: "Saved addresses",
    description: "Where mobile stylists come to you.",
    icon: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  },
  {
    id: "shared",
    label: "Shared with stylists",
    description: "Allergies or sensitivities you’ve shared.",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    id: "communication",
    label: "Communication",
    description: "Emails from us and your bookings calendar.",
    icon: "M3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 7l9 6 9-6",
  },
  {
    id: "privacy",
    label: "Privacy & data",
    description: "Your data, cookies and your account.",
    icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  },
];

export const HELP_ICON =
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 2.3-2.4 3.8M12 17h.01";
export const LOG_OUT_ICON =
  "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3";

export const SECTION_IDS = SECTIONS.map(({ id }) => id);

// old ?tab= names
export const LEGACY_TABS: Record<string, string> = {
  details: "shared",
  marketing: "communication",
};

// demo: emails another account already uses
export const TAKEN_EMAILS = ["kemi.a@icloud.com", "amara@amarabeauty.co.uk"];

export const SEED_PROFILE = {
  first: "Nia",
  last: "Okafor",
  email: "nia.okafor@gmail.com",
  mobile: "7700 900412",
};

export type Profile = typeof SEED_PROFILE;

export const DEMO_PHOTO = "site/onboarding-client.jpg";

export type BookingStatus =
  "confirmed" | "awaiting" | "completed" | "cancelled" | "noshow";

export interface AccountBooking {
  id: string;
  stylistId: string;
  service: string;
  customisation: string;
  extra: number;
  /** Fallback price when the service is not on the stylist's menu. */
  fallbackPrice: number;
  at: number;
  minutes: number;
  status: BookingStatus;
  mode: "deposit" | "card" | "full";
  card: string;
}

const DAY_MS = 864e5;

/** n days from today at h:m. */
const at = (days: number, hours: number, minutes: number): number => {
  const date = new Date();

  date.setHours(hours, minutes, 0, 0);
  date.setDate(date.getDate() + days);

  return date.getTime();
};

/** Demo bookings; some fixtures keep only past ones, bk-none has none. */
export const getSeedBookings = (fixture: string): AccountBooking[] => {
  const all: AccountBooking[] = [
    {
      id: "TH-48213",
      stylistId: "amara-beauty",
      service: "Knotless braids",
      customisation: "Medium · Shoulder · 1B Natural Black",
      extra: 20,
      fallbackPrice: 140,
      at: at(9, 10, 30),
      minutes: 330,
      status: "confirmed",
      mode: "deposit",
      card: "c1",
    },
    {
      id: "TH-48377",
      stylistId: "crowned-by-kemi",
      service: "Faux locs",
      customisation: "Medium · Mid-back",
      extra: 0,
      fallbackPrice: 160,
      at: at(16, 11, 0),
      minutes: 360,
      status: "awaiting",
      mode: "card",
      card: "c1",
    },
    {
      id: "TH-47702",
      stylistId: "silk-and-roots",
      service: "Silk press",
      customisation: "",
      extra: 0,
      fallbackPrice: 65,
      at: at(-12, 9, 30),
      minutes: 120,
      status: "completed",
      mode: "full",
      card: "c1",
    },
    {
      id: "TH-47118",
      stylistId: "studio-zuri",
      service: "Knotless braids",
      customisation: "Medium · Mid-back",
      extra: 15,
      fallbackPrice: 150,
      at: at(-34, 13, 0),
      minutes: 300,
      status: "cancelled",
      mode: "deposit",
      card: "c2",
    },
    {
      id: "TH-46590",
      stylistId: "locd-and-lovely",
      service: "Loc re-twist",
      customisation: "",
      extra: 0,
      fallbackPrice: 70,
      at: at(-61, 10, 0),
      minutes: 150,
      status: "noshow",
      mode: "deposit",
      card: "c1",
    },
  ];

  if (["bk-empty", "ov-empty", "delete-allowed", "deleted"].includes(fixture))
    return all.filter(({ at: time }) => time < Date.now());

  if (fixture === "bk-none") return [];

  return all;
};

export const QUIZ_DAYS_AGO = 36 * DAY_MS;

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

export const SEED_CARDS: SavedCard[] = [
  { id: "c1", brand: "Visa", last4: "4242", expiry: "08/28", isDefault: true },
  {
    id: "c2",
    brand: "Mastercard",
    last4: "4444",
    expiry: "03/27",
    isDefault: false,
  },
];

export const SHARED_ENTRIES = [
  { id: "amara-beauty", text: "Sensitive scalp" },
  { id: "crowned-by-kemi", text: "" },
  { id: "silk-and-roots", text: "" },
];
