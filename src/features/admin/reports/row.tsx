import { ClipboardCheck, Eye } from "lucide-react";
import { useSearchParams } from "react-router";
import { ActionMenuButton } from "../../../components/action-menu";
import { Avatar } from "../../../components/ds/avatar";
import { Tooltip } from "../../../components/ds/tooltip";
import { StarRating } from "../../../components/star-rating";
import type { AdminReport, ReportsTab } from "../../../lib/admin-api";
import { joinClassNames } from "../../../utils/class-names";
import { formatReviewDate } from "../../../utils/review-date";
import { getAdminParams } from "../shell/nav-items";
import {
  formatWhen,
  getAgeText,
  getDueText,
  getReporter,
  isOverdue,
  OUTCOMES,
  REASONS,
} from "./view";
import rowStyles from "../../../styles/features/studio/reviews/row.module.css";
import styles from "../../../styles/features/admin/reports.module.css";

interface ReportRowProps {
  report: AdminReport;
  tab: ReportsTab;
  isCard: boolean;
  onDecide: () => void;
}

const STATUS_NOTES: Partial<Record<AdminReport["status"], string>> = {
  text_removed: "The words are removed from the profile.",
  removed: "Removed from the profile.",
};

/** One reported review: who wrote it about whom, the reports on it, any decision or appeal, and its menu. */
export const ReportRow = ({
  report,
  tab,
  isCard,
  onDecide,
}: ReportRowProps) => {
  const {
    client_name: clientName,
    stylist_name: stylistName,
    stylist_slug: slug,
    rating,
    created_at: createdAt,
    service_name: serviceName,
    body,
    status,
    reports,
    decision,
    appeal,
  } = report;

  const [params, setParams] = useSearchParams();
  const isLate = tab !== "decided" && isOverdue(report);
  const dueText = getDueText(report);

  const tags = [
    status === "hidden" && tab !== "decided" ? "Hidden while checking" : "",
    appeal ? "Appealed" : "",
    tab === "decided" && decision ? OUTCOMES[decision.outcome] : "",
  ].filter(Boolean);

  const actionLabel = appeal ? "Look again" : "Decide";

  return (
    <article
      className={joinClassNames(
        rowStyles.row,
        isCard && rowStyles.card,
        isCard ? styles.card : styles.wide,
      )}
    >
      <div
        className={joinClassNames(
          rowStyles.head,
          styles.head,
          !isLate && !tags.length && styles.headMenuOnly,
        )}
      >
        <span className={joinClassNames(rowStyles.who, styles.person)}>
          <Avatar
            className={joinClassNames(rowStyles.avatar, styles.avatar)}
            name={clientName}
            size={40}
            isDecorative
          />
          <span className={styles.who}>
            <span className={rowStyles.name}>{clientName}</span>
            <span className={styles.about}>
              reviewed{" "}
              <a
                className={styles.stylistLink}
                href={`/${slug}`}
                target="_blank"
                rel="noreferrer"
              >
                {stylistName}
              </a>
            </span>
          </span>
        </span>
        <span className={styles.side}>
          {isLate && (
            <Tooltip label={dueText} placement="below">
              {/* a button so keyboard users get the due time too */}
              <button
                type="button"
                className={joinClassNames(styles.tag, styles.tagOverdue)}
              >
                Overdue
              </button>
            </Tooltip>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              className={joinClassNames(styles.tag, styles.tagQuiet)}
            >
              {tag}
            </span>
          ))}
          <ActionMenuButton
            label={`More actions for ${clientName}’s review`}
            title={`${clientName}’s review`}
            subtitle={`About ${stylistName}`}
            isVertical
            items={[
              ...(tab === "decided"
                ? []
                : [
                    {
                      label: actionLabel,
                      icon: ClipboardCheck,
                      run: onDecide,
                    },
                  ]),
              {
                label: "View in Profiles",
                icon: Eye,
                run: () =>
                  setParams(
                    getAdminParams(params, {
                      tab: "profiles",
                      stylist: report.stylist_id,
                    }),
                  ),
              },
            ]}
          />
        </span>
      </div>
      <div className={isCard ? rowStyles.content : styles.content}>
        <div className={rowStyles.meta}>
          <StarRating rating={rating} />
          <span>{`${formatReviewDate(createdAt)} · ${serviceName}`}</span>
        </div>
        {!!body && <p className={rowStyles.body}>{body}</p>}
        {!!STATUS_NOTES[status] && tab !== "decided" && (
          <p className={rowStyles.removed}>{STATUS_NOTES[status]}</p>
        )}
        <div className={styles.reports}>
          {reports.map(
            ({ reason, details, created_at: reportedAt, ...reporter }) => (
              <div key={reportedAt + reason} className={styles.report}>
                <div className={styles.reportLine}>
                  <span className={styles.reason}>{REASONS[reason]}</span>
                  <span className={styles.muted}>
                    {`reported by ${getReporter(reporter)}`}
                  </span>
                  <span className={styles.faint}>{formatWhen(reportedAt)}</span>
                </div>
                {!!details && (
                  <p className={styles.details}>{`“${details}”`}</p>
                )}
              </div>
            ),
          )}
        </div>
        {!!appeal && !!decision && (
          <div className={styles.appeal}>
            <span>
              <b>{OUTCOMES[decision.outcome]}</b>
              <span
                className={styles.muted}
              >{` by ${decision.admin_name}, ${formatWhen(decision.created_at)}`}</span>
            </span>
            <span>
              <b>{`Appeal from the ${appeal.appellant}: `}</b>
              {`“${appeal.body}”`}
            </span>
          </div>
        )}
        {tab === "decided" && !!decision && (
          <p className={styles.decided}>
            <b>{OUTCOMES[decision.outcome]}</b>
            {` by ${decision.admin_name}, ${formatWhen(decision.created_at)}. “${decision.note}”`}
          </p>
        )}
        <div className={styles.ageRow}>
          {!isLate && dueText ? (
            <Tooltip label={dueText} placement="below">
              <button type="button" className={styles.age}>
                {getAgeText(report, tab)}
              </button>
            </Tooltip>
          ) : (
            <span className={styles.age}>{getAgeText(report, tab)}</span>
          )}
        </div>
      </div>
    </article>
  );
};
