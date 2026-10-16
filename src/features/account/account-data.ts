// Account sections, icons and demo data (sections, icons, taken emails, legacy tab names, seed bookings,
// quiz rows).
import {
  Calendar,
  CreditCard,
  Heart,
  House,
  Lock,
  Mail,
  MapPin,
  Shield,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AccountSection {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  strokeWidth?: number;
}

export const SECTIONS: AccountSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Your next appointment and quick links.",
    icon: House,
  },
  {
    id: "bookings",
    label: "Bookings",
    description: "Upcoming, past and cancelled appointments.",
    icon: Calendar,
  },
  {
    id: "favourites",
    label: "Favourites",
    description: "Stylists you’ve saved.",
    icon: Heart,
  },
  {
    id: "hair",
    label: "Hair profile",
    description: "Your hair quiz results, so we can suggest styles.",
    icon: Sparkles,
  },
  {
    id: "personal",
    label: "Personal details",
    description: "Your name and how stylists can contact you.",
    icon: User,
  },
  {
    id: "security",
    label: "Login & security",
    description: "Your password and the ways you log in.",
    icon: Lock,
  },
  {
    id: "payments",
    label: "Payment methods",
    description: "Cards saved for deposits and payments.",
    icon: CreditCard,
  },
  {
    id: "addresses",
    label: "Saved addresses",
    description: "Where mobile stylists come to you.",
    icon: MapPin,
    strokeWidth: 1.8,
  },
  {
    id: "shared",
    label: "Shared with stylists",
    description: "Allergies or sensitivities you’ve shared.",
    icon: Users,
  },
  {
    id: "communication",
    label: "Communication",
    description: "Emails from us and your bookings calendar.",
    icon: Mail,
  },
  {
    id: "privacy",
    label: "Privacy & data",
    description: "Your data, cookies and your account.",
    icon: Shield,
  },
];

export const SECTION_IDS = SECTIONS.map(({ id }) => id);

// old ?tab= names
export const LEGACY_TABS: Record<string, string> = {
  details: "shared",
  marketing: "communication",
};

// demo: emails another account already uses
export const TAKEN_EMAILS = ["kemi.a@icloud.com", "amara@tiwarashouse.com"];

export const SEED_PROFILE = {
  first: "Nia",
  last: "Okafor",
  email: "nia.okafor@gmail.com",
  mobile: "7700 900412",
};

export type Profile = typeof SEED_PROFILE;

export const DEMO_PHOTO = "site/onboarding-client.jpg";

// demo: the signed-in client's current password
export const CURRENT_PASSWORD = "sunflower9";

type BookingStatus =
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
