import { createLucideIcon } from "lucide-react";

const createPathIcon = (name: string, path: string) =>
  createLucideIcon(name, [["path", { d: path, key: name }]]);

export const BraidsIcon = createPathIcon(
  "braids",
  "M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9s8 5 8 9",
);

export const WigIcon = createPathIcon(
  "wig",
  "M12 2.5C7.6 2.5 5.6 5.8 5.6 9.8c0 2.8-.8 5-2.6 6.8 1.4 1 3.2 1 4.4 0-.4 1.8.4 3.4 2 4.4.6-2.4.6-5-.2-7.4-.6-1.8-.8-3.4-.8-4.8 1.8-.6 3-1.8 3.6-3.6M12 2.5c4.4 0 6.4 3.3 6.4 7.3 0 2.8.8 5 2.6 6.8-1.4 1-3.2 1-4.4 0 .4 1.8-.4 3.4-2 4.4-.6-2.4-.6-5 .2-7.4.6-1.8.8-3.4.8-4.8-1.8-.6-3-1.8-3.6-3.6",
);

export const NaturalHairIcon = createPathIcon(
  "natural-hair",
  "M8.53 17.93A1.83 1.83 0 0 1 5.83 15.9A1.83 1.83 0 0 1 4.17 12.94A1.83 1.83 0 0 1 3.85 9.57A1.83 1.83 0 0 1 4.93 6.35A1.83 1.83 0 0 1 7.21 3.85A1.83 1.83 0 0 1 10.31 2.48A1.83 1.83 0 0 1 13.69 2.48A1.83 1.83 0 0 1 16.79 3.85A1.83 1.83 0 0 1 19.07 6.35A1.83 1.83 0 0 1 20.15 9.57A1.83 1.83 0 0 1 19.83 12.94A1.83 1.83 0 0 1 18.17 15.9A1.83 1.83 0 0 1 15.47 17.93M8.53 17.93V12.4a3.47 3.47 0 0 1 6.94 0v5.53",
);

export const StylistIcon = createPathIcon(
  "stylist",
  "M6.5 12.5c-.8-1.2-1-2.8-1-4.5A6.5 6.5 0 0 1 12 2a6.5 6.5 0 0 1 6.5 6c0 1.7-.2 3.3-1 4.5zM10.5 12.5V15M13.5 12.5V15M4 21.5v-.5a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v.5M9 16l3 4 3-4",
);

export const MoonIcon = createPathIcon(
  "moon",
  "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
);
