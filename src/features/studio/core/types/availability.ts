export interface BlockedTime {
  id: string;
  day: string;
  dayIndex: number;
  span: string;
  reason: string;
  frequency?: string;
  ends?: string;
  endDayOffset?: number | null;
  color?: string;
  /** The reason as typed (reason adds the repeat label). */
  note?: string;
}

export interface ClosedPeriod {
  id: string;
  from: string;
  to: string;
  span: string;
  reason: string;
}

export interface WorkingHours {
  day: string;
  on: boolean;
  start: string;
  end: string;
}

export interface BlockDraft {
  day: number;
  start: string;
  end: string;
  reason: string;
  allDay?: boolean;
  frequency?: string;
  ends?: string;
  endDayOffset?: number | null;
  color?: string;
  editId?: string;
  force?: boolean;
}

export interface ClosedDraft {
  from: string;
  to: string;
  reason: string;
  editId?: string;
}
