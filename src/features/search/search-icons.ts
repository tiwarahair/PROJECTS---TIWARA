import {
  Calendar,
  Droplet,
  Grid2x2Plus,
  MapPin,
  Navigation,
  Search,
  Spool,
  WavesVertical,
  type LucideIcon,
} from "lucide-react";
import {
  BraidsIcon,
  NaturalHairIcon,
  WigIcon,
} from "../../components/icons/custom-icons";

export const SEARCH_ICONS = {
  grid: Grid2x2Plus,
  pin: MapPin,
  arrow: Navigation,
  search: Search,
  calendar: Calendar,
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  braids: BraidsIcon,
  wigs: WigIcon,
  weaves: Spool,
  locs: WavesVertical,
  natural: NaturalHairIcon,
  treatments: Droplet,
};

export const getGroupIcon = (groupId: string) =>
  GROUP_ICONS[groupId] ?? SEARCH_ICONS.grid;
