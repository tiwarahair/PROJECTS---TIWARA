import {
  ADMIN_PAGE_SIZE,
  answerAppeal,
  decideReview,
  fetchReports,
  fetchReportStats,
} from "../../lib/admin-api";
import type {
  AdminReportsPage,
  AdminReportsQuery,
  AdminReportStats,
  AppealAnswerDraft,
  ReviewDecisionDraft,
} from "../../lib/admin-api";
import { api, toQueryResult } from "../../stores/api-slice";

const adminApi = api
  .enhanceEndpoints({ addTagTypes: ["Admin"] })
  .injectEndpoints({
    endpoints: (build) => ({
      getReportStats: build.query<AdminReportStats | null, void>({
        providesTags: ["Admin"],
        queryFn: () => toQueryResult(fetchReportStats()),
      }),
      getReports: build.infiniteQuery<
        AdminReportsPage | null,
        AdminReportsQuery,
        number
      >({
        providesTags: ["Admin"],
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (lastPage, _allPages, lastPageParam) =>
            lastPage && (lastPageParam + 1) * ADMIN_PAGE_SIZE < lastPage.total
              ? lastPageParam + 1
              : undefined,
        },
        queryFn: ({ queryArg, pageParam }) =>
          toQueryResult(fetchReports(queryArg, pageParam)),
      }),
      decideReview: build.mutation<null, ReviewDecisionDraft>({
        queryFn: (draft) => toQueryResult(decideReview(draft)),
        invalidatesTags: ["Admin", "Reviews", "StylistProfile"],
      }),
      answerAppeal: build.mutation<null, AppealAnswerDraft>({
        queryFn: (draft) => toQueryResult(answerAppeal(draft)),
        invalidatesTags: ["Admin", "Reviews", "StylistProfile"],
      }),
    }),
  });

export const {
  useGetReportStatsQuery,
  useGetReportsInfiniteQuery,
  useDecideReviewMutation,
  useAnswerAppealMutation,
} = adminApi;
