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

export type { AccountBooking } from "../../types/client-booking";

const DAY_MS = 864e5;

export const QUIZ_DAYS_AGO = 36 * DAY_MS;

export type { SavedCard } from "../../types/saved-card";
