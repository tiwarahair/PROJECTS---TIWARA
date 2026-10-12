// Studio's pure time, money and drawing helpers (they don't read state).

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES_SEPT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

const pad2 = (value: number) => (value < 10 ? "0" : "") + value;

/** "09:30" → 570. */
export const timeToMinutes = (time: string | null | undefined): number => {
  if (!time) return 0;

  const parts = String(time).split(":").map(Number);

  return (parts[0] ?? 0) * 60 + (parts[1] || 0);
};

/** 570 → "09:30", wrapping round midnight. */
export const hhmm = (minutes: number): string => {
  const wrapped = ((minutes % 1440) + 1440) % 1440;

  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
};

export const formatDuration = (hours: unknown, minutes: unknown): string => {
  const hourCount = parseInt(String(hours)) || 0;
  const minuteCount = parseInt(String(minutes)) || 0;

  if (hourCount && minuteCount) return `${hourCount}h ${minuteCount}m`;

  return hourCount ? `${hourCount}h` : `${minuteCount}m`;
};

export const minutesToDuration = (minutes: number): string =>
  formatDuration(Math.floor(minutes / 60), minutes % 60);

/** "4h 30m" → 270. */
export const durationToMinutes = (
  duration: string | null | undefined,
): number => {
  if (!duration) return 0;

  const hours = (String(duration).match(/(\d+)\s*h/) || [0, 0])[1];
  const minutes = (String(duration).match(/(\d+)\s*m/) || [0, 0])[1];

  return +(hours ?? 0) * 60 + +(minutes ?? 0);
};

export const formatMinutes = (value: unknown): string => {
  const minutes = parseInt(String(value)) || 0;

  if (!minutes) return "None";

  return minutes >= 60
    ? formatDuration(Math.floor(minutes / 60), minutes % 60)
    : `${minutes} min`;
};

/** "10:30" + "4h 30m" → "10:30–15:00". */
export const timeRange = (
  time: string,
  duration: string | null | undefined,
): string => {
  if (!time) return time;

  const minutes = durationToMinutes(duration);

  if (!minutes) return time;

  const [hours = 0, startMinutes = 0] = time.split(":").map(Number);
  const end = (hours * 60 + startMinutes + minutes) % 1440;

  return `${time}–${pad2(Math.floor(end / 60))}:${pad2(end % 60)}`;
};

export interface DayInfo {
  weekday: string;
  dayNumber: number;
  monthName: string;
  label: string;
  short: string;
}

const DAY_LABELS: Record<number, string> = { 0: "Today", 1: "Tomorrow" };
const SHORT_DAY_LABELS: Record<number, string> = { 0: "Today", 1: "Tmrw" };

export const dayInfo = (offset: number): DayInfo => {
  const date = new Date();

  date.setDate(date.getDate() + offset);
  const weekday = DAY_NAMES[date.getDay()] ?? "";
  const dayNumber = date.getDate();
  const monthName = MONTH_NAMES[date.getMonth()] ?? "";
  const label = DAY_LABELS[offset] ?? `${weekday} ${dayNumber} ${monthName}`;

  return {
    weekday,
    dayNumber,
    monthName,
    label,
    short: SHORT_DAY_LABELS[offset] ?? weekday,
  };
};

/** "Tue 1 Sep" for a day offset from today. */
export const dateLabel = (offset: number): string => {
  const date = new Date();

  date.setDate(date.getDate() + (offset || 0));
  const dayName = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];

  return `${dayName} ${date.getDate()} ${monthName}`;
};

/** Midday on the day `offset` days from today. */
export const dateAt = (offset: number): Date => {
  const date = new Date();

  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);

  return date;
};

export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const dayName = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES_SEPT[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${dayName} ${date.getDate()} ${monthName}, ${hours}:${minutes}`;
};

export const hexWithAlpha = (hex: string, alpha: number): string => {
  const value = parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red},${green},${blue},${alpha})`;
};

export const parseNumber = (value: unknown): number => {
  const parsed = parseFloat(String(value));

  return isNaN(parsed) ? 0 : parsed;
};

export const getInitials = (name: string | null | undefined): string =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => (word[0] ?? "").toUpperCase())
    .join("");

/** A client's photo, or an initials tile. */
export const getAvatarSrc = (
  client: { img?: string; walkIn?: boolean; name?: string } | null | undefined,
): string => {
  if (client?.img) return client.img;

  if (!client || client.walkIn || !client.name)
    return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  const initials = getInitials(client.name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#F6F2EA"/><text x="40" y="41" text-anchor="middle" dominant-baseline="central" font-family="Hanken Grotesk,Helvetica,Arial,sans-serif" font-size="30" font-weight="600" fill="#3d3833">${initials}</text></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/** The initials image stored on a client added from the New booking sheet */
export const getInitialsImage = (name: string): string => {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#efe8db"/><text x="32" y="40" text-anchor="middle" font-family="Hanken Grotesk,Helvetica,sans-serif" font-size="24" font-weight="600" fill="#8f1112">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export interface MiniCalendarDay {
  key: string;
  dayNumber: string;
  disabled: boolean;
  background: string;
  color: string;
  weight: string;
  dot: string;
  pick: () => void;
}

const getCellColor = (isPast: boolean, isSelected: boolean) => {
  if (isPast) return "var(--neutral-300,#c9c2b4)";

  return isSelected ? "var(--neutral-100)" : "var(--text-primary)";
};

/** A Monday-first month grid of day offsets from today. */
export const getMiniCalendarDays = (
  month: number,
  year: number,
  selected: number | null | undefined,
  setter: (offset: number) => void,
  minOffset = 1,
  dotFor?: (offset: number, isSelected: boolean) => string,
): MiniCalendarDay[] => {
  const now = new Date();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cells: MiniCalendarDay[] = [];

  for (let index = 0; index < lead; index++)
    cells.push({
      key: `l${index}`,
      dayNumber: "",
      disabled: true,
      background: "transparent",
      color: "transparent",
      weight: "400",
      dot: "transparent",
      pick: () => {},
    });

  for (let day = 1; day <= dayCount; day++) {
    const date = new Date(year, month, day);
    const offset = Math.round((date.getTime() - today.getTime()) / 86400000);
    const isPast = offset < minOffset;
    const isSelected = selected === offset;

    cells.push({
      key: `d${day}`,
      dayNumber: String(day),
      disabled: isPast,
      background: isSelected ? "#1a1714" : "transparent",
      color: getCellColor(isPast, isSelected),
      weight: isSelected ? "700" : "500",
      dot: dotFor ? dotFor(offset, isSelected) : "transparent",
      pick: () => setter(offset),
    });
  }

  return cells;
};

export interface ChartPoint {
  x: number;
  y: number;
  value: number;
}

/** The Home revenue curve in a 340×120 box. */
export const makeChart = (data: number[]) => {
  const width = 340;
  const padX = 8;
  const top = 18;
  const bottom = 112;
  const max = Math.max(...data, 1);
  const count = data.length;

  const points: ChartPoint[] = data.map((value, index) => ({
    x: padX + ((width - 2 * padX) * index) / (count - 1),
    y: bottom - (bottom - top) * (value / max),
    value,
  }));

  const first = points[0] ?? { x: 0, y: 0, value: 0 };
  const last = points[count - 1] ?? first;
  let line = `M${first.x.toFixed(1)},${first.y.toFixed(1)}`;

  for (let index = 1; index < count; index++) {
    const previous = points[index - 1] ?? first;
    const point = points[index] ?? first;
    const midX = ((previous.x + point.x) / 2).toFixed(1);
    const previousY = previous.y.toFixed(1);
    const pointX = point.x.toFixed(1);
    const pointY = point.y.toFixed(1);

    line += ` C${midX},${previousY} ${midX},${pointY} ${pointX},${pointY}`;
  }

  const lastX = last.x.toFixed(1);
  const firstX = first.x.toFixed(1);
  const area = `${line} L${lastX},${bottom} L${firstX},${bottom} Z`;

  return { line, area, points };
};

let qrCache: { key: string; background: string }[] | null = null;

/** A seeded fake QR grid for the authenticator step. */
export const getQrCells = () => {
  if (qrCache) return qrCache;

  const size = 21;
  const cells: { key: string; background: string }[] = [];
  let seed = 7;

  const random = () => {
    seed = (seed * 16807) % 2147483647;

    return seed / 2147483647;
  };

  const finder = (row: number, column: number): number | null => {
    for (const [originRow, originColumn] of [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ] as const) {
      const y = row - originRow;
      const x = column - originColumn;

      if (y >= 0 && y < 7 && x >= 0 && x < 7)
        return y === 0 ||
          y === 6 ||
          x === 0 ||
          x === 6 ||
          (y >= 2 && y <= 4 && x >= 2 && x <= 4)
          ? 1
          : 0;

      if (y >= -1 && y <= 7 && x >= -1 && x <= 7) return 0;
    }

    return null;
  };

  for (let row = 0; row < size; row++)
    for (let column = 0; column < size; column++) {
      const found = finder(row, column);

      const getIsOn = () => {
        if (found !== null) return !!found;

        // row/column 6 are the alternating timing patterns
        if (row === 6 || column === 6) return (row + column) % 2 === 0;

        return random() < 0.48;
      };

      const isOn = getIsOn();

      cells.push({
        key: `q${row * size + column}`,
        background: isOn ? "#1a1714" : "transparent",
      });
    }

  qrCache = cells;

  return cells;
};

export const copyText = (text: string) => {
  try {
    void navigator.clipboard.writeText(text);
  } catch {
    // clipboard can be unavailable; the toast still confirms
  }
};
