import type { StudioState } from "../../core/types";

export type NewClient = NonNullable<StudioState["addNew"]>;

export interface AddonValue {
  price: number;
  minutes: number;
  quantity: number;
}

export const LAST_STEP = 5;

export const BLANK_NEW_CLIENT: NewClient = {
  name: "",
  contact: "",
  email: "",
  address: "",
};

export const EXTRA_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 45, 60].map(
  (value) => ({
    key: value,
    value: String(value),
    label: value ? `${value} min` : "None",
  }),
);

export const HOUR_OPTIONS = Array.from({ length: 13 }, (_slot, index) => ({
  key: index,
  value: String(index),
  label: `${index}h`,
}));

export const MINUTE_OPTIONS = Array.from({ length: 12 }, (_slot, index) => ({
  key: index * 5,
  value: String(index * 5),
  label: `${index * 5}m`,
}));
