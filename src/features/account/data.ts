// Account sections, icons, legacy tab names and the booking and card shapes.
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

export interface Profile {
  first: string;
  last: string;
  email: string;
  mobile: string;
}

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

export const QUIZ_DAYS_AGO = 36 * DAY_MS;

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}
