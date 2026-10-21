import type { BookingAddress, Details } from "./types";

export const DRAFT_TTL_MS = 864e5;

export const EMPTY_DETAILS: Details = {
  first: "",
  last: "",
  email: "",
  phone: "",
  notes: "",
};

export const EMPTY_ADDRESS: BookingAddress = {
  postcode: "",
  line1: "",
  line2: "",
  town: "",
  notes: "",
  source: "",
  lat: null,
  lng: null,
};

export const STEPS = [
  { stepNumber: 1, label: "Service" },
  { stepNumber: 2, label: "Customise" },
  { stepNumber: 3, label: "Time" },
  { stepNumber: 4, label: "Details" },
  { stepNumber: 5, label: "Review" },
  { stepNumber: 6, label: "Pay" },
];
