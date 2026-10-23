// Review moderation: the admin alerts, decision outcomes for the reviewer, stylist and reporters, and appeal answers.
import { renderNotice } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";
import type { BookingDetails } from "./booking-emails.ts";

type Outcome = "kept" | "text_removed" | "removed";

export interface ReportAlert {
  reason: string;
  stylist_name: string;
  rating: number;
  admin_url: string;
}

export interface ReportSummary {
  open: number;
  overdue: number;
  appeals: number;
  admin_url: string;
}

export interface ReviewDecision extends BookingDetails {
  outcome: Outcome;
  reason: string | null;
  rating: number;
  appeal_until: string | null;
  client_first?: string | null;
  appeal_url?: string | null;
  can_appeal?: boolean;
  studio_url?: string;
}

export interface AppealAnswer extends BookingDetails {
  outcome: Outcome;
  is_changed: boolean;
  audience: "reviewer" | "stylist";
  client_first?: string | null;
  studio_url?: string;
}

const REASONS: Record<string, string> = {
  abusive: "abusive or hateful",
  personal_info: "personal information",
  conflict: "a conflict of interest",
  spam: "spam or advertising",
  threat: "a threat or extortion",
  other: "another reason",
};

const OUTCOMES: Record<Outcome, string> = {
  kept: "it stays up and counts toward the rating",
  text_removed: "the words were removed; the star rating stays and still counts",
  removed: "the review was removed and no longer counts",
};

const londonDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "long",
});

const getGreeting = (first?: string | null) => (first ? `Hi ${first}, ` : "");

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export const reportAlert = ({ reason, stylist_name: stylist, rating, admin_url: url }: ReportAlert): RenderedEmail =>
  renderNotice({
    title: `Hidden review to check: ${REASONS[reason] ?? reason}`,
    paragraphs: [
      `A ${rating}-star review of ${stylist} was reported as ${REASONS[reason] ?? reason}.`,
      "It’s hidden from the profile and the rating until someone decides. Please check it within 24 hours.",
    ],
    button: { label: "Open Reports", url },
    footnote: "You get this because you’re a Tiwára’s House admin.",
  });

export const reportSummary = ({ open, overdue, appeals, admin_url: url }: ReportSummary): RenderedEmail =>
  renderNotice({
    title: `${plural(open, "open report")}${overdue ? `, ${overdue} overdue` : ""}`,
    paragraphs: [
      `Waiting in Admin: ${plural(open, "reported review")} and ${plural(appeals, "appeal")}.`,
      ...(overdue ? [`${plural(overdue, "item")} ${overdue === 1 ? "is" : "are"} past its due time.`] : []),
    ],
    button: { label: "Open Reports", url },
    footnote: "You get this because you’re a Tiwára’s House admin.",
  });

const getAppealLine = (until: string | null) =>
  until ? `You can appeal once, until ${londonDate.format(new Date(until))}.` : "This decision is final.";

export const decisionForReviewer = ({
  client_first: first,
  stylist_name: stylist,
  service_name: service,
  outcome,
  reason,
  appeal_until: until,
  appeal_url: url,
}: ReviewDecision): RenderedEmail =>
  renderNotice({
    title: `We’ve checked your review of ${stylist}`,
    paragraphs: [
      `${getGreeting(first)}your review of ${service} was reported${reason ? ` for ${REASONS[reason] ?? reason}` : ""}, and it breaks our review rules, so ${OUTCOMES[outcome]}.`,
      getAppealLine(until),
    ],
    ...(url ? { button: { label: "Appeal this decision", url } } : {}),
    footnote: "Reviews must be about the appointment, without personal details, abuse or advertising.",
  });

export const decisionForStylist = ({
  client_name: client,
  service_name: service,
  outcome,
  can_appeal: canAppeal,
  appeal_until: until,
  studio_url: url,
}: ReviewDecision): RenderedEmail =>
  renderNotice({
    title: outcome === "kept" ? "A reported review stays up" : "We’ve acted on a reported review",
    paragraphs: [
      `We checked ${client}’s review of ${service}: ${OUTCOMES[outcome]}.`,
      ...(canAppeal && until
        ? [`If you disagree, you can appeal once from Reviews in Studio until ${londonDate.format(new Date(until))}.`]
        : []),
    ],
    ...(url ? { button: { label: "Open Reviews", url } } : {}),
    footnote: "Please don’t contact clients about their reviews.",
  });

export const reportOutcome = ({ stylist_name: stylist, outcome }: ReviewDecision): RenderedEmail =>
  renderNotice({
    title: "Thanks for your report",
    paragraphs: [
      `We checked the review of ${stylist} you reported: ${OUTCOMES[outcome]}.`,
      outcome === "kept"
        ? "A bad rating on its own doesn’t break our rules, so we leave honest reviews up."
        : "Thanks for helping keep reviews honest.",
    ],
    footnote: "Reports are checked by the Tiwára’s House team.",
  });

export const appealAnswered = ({
  audience,
  client_first: first,
  client_name: client,
  stylist_name: stylist,
  service_name: service,
  outcome,
  is_changed: isChanged,
  studio_url: url,
}: AppealAnswer): RenderedEmail =>
  renderNotice({
    title: isChanged ? "An appeal changed our decision" : "We’ve answered the appeal",
    paragraphs: [
      audience === "reviewer"
        ? `${getGreeting(first)}we looked again at your review of ${stylist}.`
        : `We looked again at ${client}’s review of ${service}.`,
      `${isChanged ? "We changed our decision" : "We kept our decision"}: ${OUTCOMES[outcome]}. This is final.`,
    ],
    ...(audience === "stylist" && url ? { button: { label: "Open Reviews", url } } : {}),
    footnote: "Each decision can be appealed once.",
  });
