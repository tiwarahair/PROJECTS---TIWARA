import { skipToken } from "@reduxjs/toolkit/query";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { PageMessage } from "../../../components/page-message";
import { ReportReview } from "../../../components/report-review";
import { useGetStudioReviewsQuery } from "../../../stores/api-slice";
import { joinClassNames } from "../../../utils/class-names";
import { copyText } from "../core/format";
import { getAllClients, getBookingLink } from "../core/model";
import type { StudioController } from "../core/use-studio";
import { ReviewControls } from "./controls";
import { ReviewRow } from "./review-row";
import { EmptyBox, ReviewsSkeleton } from "./states";
import { ReviewStats } from "./stats";
import { getReviewStats, getVisibleReviews, PAGE_SIZE } from "./view";
import type { ReviewSort } from "./view";
import styles from "../../../styles/features/studio/reviews/index.module.css";

/** Studio → Reviews: stats, search/sort/"Replied to", and every review with reply and report. */
export const StudioReviews = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, isDesktop, actions } = studio;
  const { stylistId } = state.account;
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [isRepliedOnly, setRepliedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const [replyingId, setReplyingId] = useState("");
  const [reportingId, setReportingId] = useState("");

  const { data, isError } = useGetStudioReviewsQuery(stylistId || skipToken, {
    refetchOnMountOrArgChange: true,
  });

  const className = joinClassNames(
    styles.reviews,
    isWide && styles.wide,
    isDesktop && styles.desk,
  );

  const clients = getAllClients(state);

  const openClient = (clientId: string) => {
    if (isWide) {
      actions.openSheet("cliView", {
        selectedClientId: clientId,
        clientAppointmentsTab: "up",
        clientFromBookingId: null,
      });

      return;
    }

    setState({
      tab: "clients",
      selectedClientId: clientId,
      clientAppointmentsTab: "up",
    });

    actions.scrollBody(0, false);
  };

  const copyLink = () => {
    copyText(getBookingLink(state));
    actions.showToast("Booking link copied");
  };

  const getContent = () => {
    if (isError)
      return (
        <PageMessage
          title="Reviews didn’t load"
          text="Check your connection, then try again."
          linkLabel="Try again"
          linkHref="/studio"
          isReload
        />
      );

    if (!data) return <ReviewsSkeleton />;

    const stats = getReviewStats(data);

    if (!stats.total)
      return (
        <>
          <ReviewStats stats={stats} isShort={!isWide} />
          <EmptyBox
            hasIcon
            title="No reviews yet"
            body="Clients are emailed a review link 2 hours after each completed booking. Your rating shows on your profile from 3 reviews."
            action="Copy your booking link"
            onAction={copyLink}
          />
        </>
      );

    const visible = getVisibleReviews(data.reviews, {
      sort,
      isRepliedOnly,
      search,
    });

    const clearSearch = () => setSearch("");

    return (
      <>
        <ReviewStats stats={stats} isShort={!isWide} />
        <ReviewControls
          search={search}
          sort={sort}
          isRepliedOnly={isRepliedOnly}
          replied={stats.replied}
          onSearch={setSearch}
          onSort={setSort}
          onToggleReplied={() => setRepliedOnly((isOn) => !isOn)}
        />
        {stats.rating == null && (
          <p className={styles.note}>
            {`Your rating shows on your profile from 3 reviews. You have ${stats.counted}.`}
          </p>
        )}
        {!visible.length &&
          (search.trim() ? (
            <EmptyBox
              title={`No reviews match “${search.trim()}”`}
              body="Try a client’s name or a service."
              action="Clear search"
              onAction={clearSearch}
            />
          ) : (
            <EmptyBox
              title="No replies yet"
              body="Reviews you reply to will show here."
              action="Clear filter"
              onAction={() => setRepliedOnly(false)}
            />
          ))}
        {!!visible.length && (
          <div className={isWide ? styles.panel : styles.cards}>
            {visible.slice(0, shownCount).map((review) => (
              <ReviewRow
                key={review.id}
                review={review}
                client={clients.find(
                  ({ id }) => !!id && id === review.stylist_client_id,
                )}
                isCard={!isWide}
                isReplying={replyingId === review.id}
                onReply={() => setReplyingId(review.id)}
                onCloseReply={() => setReplyingId("")}
                onReport={() => setReportingId(review.id)}
                onOpenClient={openClient}
              />
            ))}
          </div>
        )}
        {visible.length > shownCount && (
          <button
            type="button"
            className={styles.showMore}
            onClick={() => setShownCount((count) => count + PAGE_SIZE)}
          >
            Show more reviews
          </button>
        )}
      </>
    );
  };

  return (
    <div className={className} data-screen-label="Reviews">
      {!isWide && (
        <button
          className={styles.back}
          onClick={() => setState({ tab: "settings" })}
        >
          <ChevronLeft size={18} strokeWidth={1.7} />
          More
        </button>
      )}
      {getContent()}
      {!!reportingId && (
        <ReportReview
          reviewId={reportingId}
          onClose={() => setReportingId("")}
        />
      )}
    </div>
  );
};
