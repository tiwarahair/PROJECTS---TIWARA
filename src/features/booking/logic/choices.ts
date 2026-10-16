import type { BookingChoices } from "../../../lib/booking-api";
import type { ServiceOptions } from "../../../utils/services";
import type { Selection } from "./types";

export const toChoices = (
  options: ServiceOptions,
  selection: Selection,
): BookingChoices => {
  const picked = [
    options.size.find(({ label }) => label === selection.size),
    options.length.find(({ label }) => label === selection.length),
    ...options.own.map(({ name, options: answers }) =>
      answers.find(({ label }) => label === selection.own[name]),
    ),
  ];

  return {
    variations: picked.flatMap((option) => (option?.id ? [option.id] : [])),
    addons: options.addons.flatMap(({ id, name }) =>
      id && selection.addons.includes(name) ? [id] : [],
    ),
    ...(options.colour ? { colour: selection.colour } : {}),
  };
};
