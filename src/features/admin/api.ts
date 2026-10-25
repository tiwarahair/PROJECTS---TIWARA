import {
  ADMIN_PAGE_SIZE,
  answerAppeal,
  decideReview,
  fetchActionFilters,
  fetchActions,
  fetchProfile,
  fetchProfiles,
  fetchProfileStats,
  fetchReports,
  fetchReportStats,
  markProfileChecked,
  saveProfileNote,
  suspendStylist,
  unsuspendStylist,
} from "../../lib/admin-api";
import type {
  AdminAction,
  AdminActionFilters,
  AdminActionsQuery,
  AdminPage,
  AdminProfile,
  AdminProfileDetail,
  AdminProfilesQuery,
  AdminProfileStats,
  AdminReportsPage,
  AdminReportsQuery,
  AdminReportStats,
  AppealAnswerDraft,
  ProfileNoteDraft,
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
      getProfileStats: build.query<AdminProfileStats | null, void>({
        providesTags: ["Admin"],
        queryFn: () => toQueryResult(fetchProfileStats()),
      }),
      getProfiles: build.infiniteQuery<
        AdminPage<AdminProfile> | null,
        AdminProfilesQuery,
        number
      >({
        providesTags: ["Admin"],
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (lastPage, _allPages, lastPageParam) =>
            lastPage?.has_more ? lastPageParam + 1 : undefined,
        },
        queryFn: ({ queryArg, pageParam }) =>
          toQueryResult(fetchProfiles(queryArg, pageParam)),
      }),
      getAdminProfile: build.query<AdminProfileDetail | null, string>({
        providesTags: ["Admin"],
        queryFn: (stylistId) => toQueryResult(fetchProfile(stylistId)),
      }),
      saveProfileNote: build.mutation<null, ProfileNoteDraft>({
        queryFn: (draft) => toQueryResult(saveProfileNote(draft)),
        // the sheet shows the saved note when it's opened again
        onQueryStarted: async (
          { stylistId, note },
          { dispatch, queryFulfilled },
        ) => {
          const isSaved = await queryFulfilled.then(
            () => true,
            () => false,
          );

          if (!isSaved) return;

          dispatch(
            adminApi.util.updateQueryData(
              "getAdminProfile",
              stylistId,
              (profile) => {
                if (profile) profile.note = note.trim();
              },
            ),
          );
        },
      }),
      markProfileChecked: build.mutation<null, ProfileNoteDraft>({
        queryFn: (draft) => toQueryResult(markProfileChecked(draft)),
        invalidatesTags: ["Admin"],
      }),
      suspendStylist: build.mutation<null, ProfileNoteDraft>({
        queryFn: (draft) => toQueryResult(suspendStylist(draft)),
        invalidatesTags: ["Admin", "StylistProfile"],
      }),
      unsuspendStylist: build.mutation<null, ProfileNoteDraft>({
        queryFn: (draft) => toQueryResult(unsuspendStylist(draft)),
        invalidatesTags: ["Admin", "StylistProfile"],
      }),
      getActions: build.infiniteQuery<
        AdminPage<AdminAction> | null,
        AdminActionsQuery,
        number
      >({
        providesTags: ["Admin"],
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (lastPage, _allPages, lastPageParam) =>
            lastPage?.has_more ? lastPageParam + 1 : undefined,
        },
        queryFn: ({ queryArg, pageParam }) =>
          toQueryResult(fetchActions(queryArg, pageParam)),
      }),
      getActionFilters: build.query<AdminActionFilters | null, void>({
        providesTags: ["Admin"],
        queryFn: () => toQueryResult(fetchActionFilters()),
      }),
    }),
  });

export const {
  useGetReportStatsQuery,
  useGetReportsInfiniteQuery,
  useDecideReviewMutation,
  useAnswerAppealMutation,
  useGetProfileStatsQuery,
  useGetProfilesInfiniteQuery,
  useGetAdminProfileQuery,
  useSaveProfileNoteMutation,
  useMarkProfileCheckedMutation,
  useSuspendStylistMutation,
  useUnsuspendStylistMutation,
  useGetActionsInfiniteQuery,
  useGetActionFiltersQuery,
} = adminApi;
