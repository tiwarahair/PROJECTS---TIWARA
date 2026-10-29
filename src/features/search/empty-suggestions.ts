// The empty state's "try this instead" buttons.
import type { StyleSelection } from "./logic";
import { RADII } from "./state";
import type { SearchState } from "./state";
import type { Update } from "./update";

export const getEmptySuggestions = (
  state: SearchState,
  selection: StyleSelection,
  update: Update,
  clearDate: () => void,
  hasDistance: boolean,
) => {
  const nextRadius = hasDistance
    ? RADII.find((radius) => radius > state.radius)
    : undefined;

  const { group, serviceType } = selection;

  return [
    ...(state.query.date || state.time !== "any"
      ? [{ key: "d", label: "Try any date", pick: clearDate }]
      : []),
    ...(nextRadius
      ? [
          {
            key: "r",
            label: `Widen to ${nextRadius} miles`,
            pick: () => update({ radius: nextRadius }),
          },
        ]
      : []),
    ...(state.maxPrice != null
      ? [
          {
            key: "p",
            label: "Remove price limit",
            pick: () => update({ maxPrice: null }),
          },
        ]
      : []),
    ...(serviceType && group
      ? [
          {
            key: "g",
            label: `Try ${group.name}`,
            pick: () =>
              update((current) => ({
                query: { ...current.query, type: "", group: group.id },
              })),
          },
        ]
      : []),
  ];
};
