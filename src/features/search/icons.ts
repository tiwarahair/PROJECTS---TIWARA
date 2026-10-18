import {
  Calendar,
  MapPin,
  Navigation,
  Search,
  Spool,
  WavesVertical,
  type LucideIcon,
} from "lucide-react";
import {
  AllStylesIcon,
  BraidsIcon,
  NaturalHairIcon,
  TreatmentIcon,
  WigIcon,
} from "../../components/icons/custom-icons";

export const SEARCH_ICONS = {
  grid: AllStylesIcon,
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
  treatments: TreatmentIcon,
};

export const getGroupIcon = (groupId: string) =>
  GROUP_ICONS[groupId] ?? SEARCH_ICONS.grid;

export const getRowStrokeWidth = (icon: LucideIcon) =>
  icon === SEARCH_ICONS.pin ? 1.8 : 1.7;
