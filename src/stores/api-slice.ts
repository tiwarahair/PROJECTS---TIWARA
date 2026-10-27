import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  getAvailableSlots,
  getBookingStatus,
  holdBooking,
  isInTravelArea,
  startCheckout,
} from "../lib/booking-api";
import type {
  BookingStatus,
  CheckoutRequest,
  HeldBooking,
  HoldRequest,
  SlotRequest,
} from "../lib/booking-api";
import {
  cancelBooking,
  getManagedBooking,
  secureBookingLink,
  sendBookingCode,
  verifyBookingCode,
  getRescheduleSlots,
  rescheduleBooking,
} from "../lib/manage-booking-api";
import {
  claimBookingInvite,
  getBookingInvite,
  getOwnerManageToken,
  renewBookingInvite,
} from "../lib/booking-invite-api";
import type { BookingInvite } from "../lib/booking-invite-api";
import type {
  CancellationTerms,
  CodeCheck,
  ManagedBooking,
  RescheduleSlotsRequest,
} from "../lib/manage-booking-api";
import { fetchPublicProfile } from "../lib/public-profiles";
import { SEARCH_PAGE_SIZE, searchStylists } from "../lib/search-api";
import type { SearchArgs, SearchRow } from "../lib/search-api";
import type { PublicProfile } from "../lib/public-profiles";
import { supabase } from "../lib/supabase";
import { fetchStudioBookings } from "../lib/studio-api/bookings";
import { fetchStylistStudio } from "../lib/studio-api";
import { closeBusiness, reopenBusiness } from "../lib/studio-api/settings";
import type { StudioBookings } from "../lib/studio-api/bookings";
import { fetchStudioEarnings } from "../lib/studio-api/earnings";
import type { StudioEarnings } from "../lib/studio-api/earnings";
import { fetchCloseChecks } from "../lib/studio-api/disputes";
import { fetchHomeStats, fetchStudioActivity } from "../lib/studio-api/home";
import type { ActivityRow, HomeStats } from "../lib/studio-api/home";
import type { CloseChecks } from "../lib/studio-api/disputes";
import type { StylistStudio } from "../lib/studio-api";
import { fetchPaymentLink, startLinkPayment } from "../lib/payment-link-api";
import {
  fetchBookingConfirmation,
  startBookingConfirmation,
} from "../lib/booking-confirm-api";
import type { BookingConfirmation } from "../lib/booking-confirm-api";
import {
  fetchCardUpdate,
  saveCardUpdate,
  startCardUpdate,
} from "../lib/card-update-api";
import type { CardUpdate } from "../lib/card-update-api";
import {
  fetchAppealPage,
  fetchReviewPage,
  fetchStylistReviews,
  REVIEWS_PAGE_SIZE,
  reportReview,
  submitAppeal,
  submitReview,
} from "../lib/review-api";
import type {
  AppealPage,
  PublicReviewsPage,
  ReviewDraft,
  ReviewPage,
  ReviewReport,
} from "../lib/review-api";
import {
  appealReview,
  fetchStudioReviews,
  replyToReview,
} from "../lib/studio-api/reviews";
import type { StudioReviews } from "../lib/studio-api/reviews";
import type { PaymentLink } from "../lib/payment-link-api";
import { listTwoFactorDevices } from "../lib/two-factor";
import type { TwoFactorDevice } from "../lib/two-factor";
import type { Profile } from "../types/profile";

export interface ApiError {
  message: string;
}

export const getErrorMessage = (error: unknown) =>
  typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : "";

/** RTK Query's result shape for a promise that may throw. Supabase rpc errors are plain objects, not Errors. */
export const toQueryResult = <T>(task: Promise<T>) =>
  task.then(
    (data) => ({ data }),
    (error: unknown) => ({
      error: { message: getErrorMessage(error) || String(error) },
    }),
  );

export const api = createApi({
  reducerPath: "api",
  baseQuery: fakeBaseQuery<ApiError>(),
  tagTypes: [
    "Studio",
    "StylistProfile",
    "Search",
    "TwoFactor",
    "Slots",
    "ManagedBooking",
    "Bookings",
    "Earnings",
    "Reviews",
    "Addresses",
    "ClientBookings",
    "ClientCards",
    "AccountPhoto",
    "Sensitivities",
  ],
  refetchOnReconnect: true,
  endpoints: (build) => ({
    getProfile: build.query<Profile, string>({
      keepUnusedDataFor: 600,
      queryFn: async (userId) => {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, phone, marketing_opt_in, photo_path")
          .eq("id", userId)
          .single();

        if (error) return { error };

        return {
          data: {
            first: data.first_name ?? "",
            last: data.last_name ?? "",
            mobile: data.phone ?? "",
            marketing: data.marketing_opt_in,
            photoPath: data.photo_path,
          },
        };
      },
    }),
    updateProfile: build.mutation<
      null,
      {
        userId: string;
        patch: Partial<Profile>;
      }
    >({
      queryFn: async ({
        userId,
        patch: { first, last, mobile, marketing },
      }) => {
        const { error } = await supabase
          .from("profiles")
          .update({
            first_name: first,
            last_name: last,
            phone: mobile,
            marketing_opt_in: marketing,
          })
          .eq("id", userId);

        return error ? { error } : { data: null };
      },
      // the header, Studio and Account read the profile from this cache
      onQueryStarted: async (
        { userId, patch },
        { dispatch, queryFulfilled },
      ) => {
        try {
          await queryFulfilled;
        } catch {
          // the caller shows the failure
          return;
        }

        dispatch(
          api.util.updateQueryData("getProfile", userId, (profile) => ({
            ...profile,
            ...patch,
          })),
        );
      },
    }),
    // closing or reopening reloads Studio, which then shows the closed screen or the dashboard
    setBusinessClosed: build.mutation<null, boolean>({
      queryFn: (isClosed) =>
        toQueryResult<null>(
          (isClosed ? closeBusiness() : reopenBusiness()).then(() => null),
        ),
      invalidatesTags: ["Studio", "StylistProfile", "Search"],
    }),
    getStylistStudio: build.query<StylistStudio, string>({
      providesTags: ["Studio"],
      queryFn: (ownerId) => toQueryResult(fetchStylistStudio(ownerId)),
    }),
    getStudioBookings: build.query<StudioBookings, string>({
      providesTags: ["Bookings"],
      queryFn: (stylistId) => toQueryResult(fetchStudioBookings(stylistId)),
    }),
    getStudioEarnings: build.query<StudioEarnings, string>({
      providesTags: ["Earnings"],
      keepUnusedDataFor: 60,
      queryFn: (stylistId) => toQueryResult(fetchStudioEarnings(stylistId)),
    }),
    getHomeStats: build.query<HomeStats, { stylistId: string; days: number }>({
      providesTags: ["Bookings", "Earnings"],
      queryFn: ({ stylistId, days }) =>
        toQueryResult(fetchHomeStats(stylistId, days)),
    }),
    getStudioActivity: build.query<ActivityRow[], string>({
      providesTags: ["Bookings", "Earnings"],
      queryFn: (stylistId) => toQueryResult(fetchStudioActivity(stylistId)),
    }),
    getCloseChecks: build.query<CloseChecks, string>({
      providesTags: ["Earnings"],
      queryFn: (stylistId) => toQueryResult(fetchCloseChecks(stylistId)),
    }),
    getStylistProfile: build.query<PublicProfile | null, string>({
      providesTags: ["StylistProfile"],
      keepUnusedDataFor: 300,
      queryFn: (slug) => toQueryResult(fetchPublicProfile(slug)),
      // a retired slug's result is also the current slug's, so its redirect needs no second request
      onQueryStarted: (slug, { dispatch, queryFulfilled }) => {
        queryFulfilled
          .then(({ data }) => {
            if (data && data.slug !== slug)
              void dispatch(
                api.util.upsertQueryData("getStylistProfile", data.slug, data),
              );
          })
          .catch(() => undefined);
      },
    }),
    // results pages for the Search list; each row carries the total
    searchStylists: build.infiniteQuery<SearchRow[], SearchArgs, number>({
      providesTags: ["Search"],
      keepUnusedDataFor: 300,
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage, _allPages, lastPageParam) =>
          (lastPageParam + 1) * SEARCH_PAGE_SIZE <
          Number(lastPage[0]?.total_count ?? 0)
            ? lastPageParam + 1
            : undefined,
      },
      queryFn: ({ queryArg, pageParam }) =>
        toQueryResult(searchStylists(queryArg, pageParam)),
    }),
    // a few rows only: the filter sheet's total and the What dropdown's stylists
    peekStylists: build.query<SearchRow[], { args: SearchArgs; size: number }>({
      providesTags: ["Search"],
      keepUnusedDataFor: 300,
      queryFn: ({ args, size }) => toQueryResult(searchStylists(args, 0, size)),
    }),
    getAvailableSlots: build.query<string[], SlotRequest>({
      providesTags: ["Slots"],
      queryFn: (request) => toQueryResult(getAvailableSlots(request)),
    }),
    holdBooking: build.mutation<HeldBooking, HoldRequest>({
      invalidatesTags: () => ["Slots"],
      queryFn: (request) => toQueryResult(holdBooking(request)),
    }),
    isInTravelArea: build.query<
      boolean,
      { serviceId: string; lat: number; lng: number }
    >({
      queryFn: (request) => toQueryResult(isInTravelArea(request)),
    }),
    startCheckout: build.mutation<{ clientSecret: string }, CheckoutRequest>({
      queryFn: (request) => toQueryResult(startCheckout(request)),
    }),
    getBookingStatus: build.query<
      BookingStatus | null,
      { id: string; secret: string }
    >({
      keepUnusedDataFor: 0,
      queryFn: (hold) => toQueryResult(getBookingStatus(hold)),
    }),
    getManagedBooking: build.query<ManagedBooking | null, string>({
      providesTags: ["ManagedBooking"],
      queryFn: (token) => toQueryResult(getManagedBooking(token)),
    }),
    getPaymentLink: build.query<PaymentLink, string>({
      queryFn: (token) => toQueryResult(fetchPaymentLink(token)),
    }),
    startLinkPayment: build.mutation<
      { clientSecret: string },
      { token: string; turnstileToken: string }
    >({
      queryFn: ({ token, turnstileToken }) =>
        toQueryResult(startLinkPayment(token, turnstileToken)),
    }),
    getBookingConfirmation: build.query<BookingConfirmation, string>({
      queryFn: (token) => toQueryResult(fetchBookingConfirmation(token)),
    }),
    startBookingConfirmation: build.mutation<
      { clientSecret: string },
      { token: string; turnstileToken: string }
    >({
      queryFn: ({ token, turnstileToken }) =>
        toQueryResult(startBookingConfirmation(token, turnstileToken)),
    }),
    getCardUpdate: build.query<CardUpdate, string>({
      queryFn: (token) => toQueryResult(fetchCardUpdate(token)),
    }),
    startCardUpdate: build.mutation<
      { clientSecret: string },
      { token: string; turnstileToken: string }
    >({
      queryFn: ({ token, turnstileToken }) =>
        toQueryResult(startCardUpdate(token, turnstileToken)),
    }),
    saveCardUpdate: build.mutation<CardUpdate, string>({
      queryFn: (token) => toQueryResult(saveCardUpdate(token)),
    }),
    getReviewPage: build.query<ReviewPage, string>({
      queryFn: (token) => toQueryResult(fetchReviewPage(token)),
    }),
    submitReview: build.mutation<ReviewPage, ReviewDraft>({
      queryFn: (draft) => toQueryResult(submitReview(draft)),
      onQueryStarted: ({ token }, { dispatch, queryFulfilled }) => {
        queryFulfilled
          .then(({ data }) => {
            void dispatch(
              api.util.upsertQueryData("getReviewPage", token, data),
            );
          })
          .catch(() => undefined);
      },
    }),
    getAppealPage: build.query<AppealPage, string>({
      queryFn: (token) => toQueryResult(fetchAppealPage(token)),
    }),
    submitAppeal: build.mutation<AppealPage, { token: string; body: string }>({
      queryFn: (draft) => toQueryResult(submitAppeal(draft)),
      onQueryStarted: ({ token }, { dispatch, queryFulfilled }) => {
        queryFulfilled
          .then(({ data }) => {
            void dispatch(
              api.util.upsertQueryData("getAppealPage", token, data),
            );
          })
          .catch(() => undefined);
      },
    }),
    getStylistReviews: build.infiniteQuery<PublicReviewsPage, string, number>({
      providesTags: ["Reviews"],
      keepUnusedDataFor: 300,
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: ({ total }, _allPages, lastPageParam) =>
          (lastPageParam + 1) * REVIEWS_PAGE_SIZE < total
            ? lastPageParam + 1
            : undefined,
      },
      queryFn: ({ queryArg, pageParam }) =>
        toQueryResult(fetchStylistReviews(queryArg, pageParam)),
    }),
    reportReview: build.mutation<"reported" | "already_reported", ReviewReport>(
      {
        queryFn: (report) => toQueryResult(reportReview(report)),
        invalidatesTags: ["Reviews", "StylistProfile"],
      },
    ),
    getStudioReviews: build.query<StudioReviews, string>({
      providesTags: ["Reviews"],
      queryFn: (stylistId) => toQueryResult(fetchStudioReviews(stylistId)),
    }),
    replyToReview: build.mutation<unknown, { reviewId: string; reply: string }>(
      {
        queryFn: (reply) => toQueryResult(replyToReview(reply)),
        invalidatesTags: ["Reviews"],
      },
    ),
    appealReview: build.mutation<
      "appealed" | "closed",
      { reviewId: string; body: string }
    >({
      queryFn: (appeal) => toQueryResult(appealReview(appeal)),
      invalidatesTags: ["Reviews"],
    }),
    getRescheduleSlots: build.query<string[], RescheduleSlotsRequest>({
      providesTags: ["ManagedBooking"],
      queryFn: (request) => toQueryResult(getRescheduleSlots(request)),
    }),
    rescheduleBooking: build.mutation<
      void,
      { token: string; startsAt: string }
    >({
      invalidatesTags: () => ["ManagedBooking", "ClientBookings"],
      queryFn: (request) => toQueryResult(rescheduleBooking(request)),
    }),
    sendBookingCode: build.mutation<{ email: string; sent: boolean }, string>({
      queryFn: (token) => toQueryResult(sendBookingCode(token)),
    }),
    verifyBookingCode: build.mutation<
      CodeCheck,
      { token: string; code: string }
    >({
      invalidatesTags: (result) =>
        result === "verified" ? ["ManagedBooking"] : [],
      queryFn: (request) => toQueryResult(verifyBookingCode(request)),
    }),
    secureBookingLink: build.mutation<
      { email: string; stylist_name: string },
      string
    >({
      queryFn: (token) => toQueryResult(secureBookingLink(token)),
    }),
    cancelBooking: build.mutation<CancellationTerms, string>({
      invalidatesTags: () => ["ManagedBooking", "ClientBookings"],
      queryFn: (token) => toQueryResult(cancelBooking(token)),
    }),
    getOwnerManageToken: build.query<string, string>({
      keepUnusedDataFor: 0,
      queryFn: (ref) => toQueryResult(getOwnerManageToken(ref)),
    }),
    getBookingInvite: build.query<BookingInvite, string>({
      keepUnusedDataFor: 0,
      queryFn: (token) => toQueryResult(getBookingInvite(token)),
    }),
    renewBookingInvite: build.mutation<{ email: string }, string>({
      queryFn: (token) => toQueryResult(renewBookingInvite(token)),
    }),
    claimBookingInvite: build.mutation<
      { tokenHash: string },
      { token: string; password: string }
    >({
      queryFn: (request) => toQueryResult(claimBookingInvite(request)),
    }),
    getTwoFactorDevices: build.query<TwoFactorDevice[], string>({
      providesTags: ["TwoFactor"],
      queryFn: () => toQueryResult(listTwoFactorDevices()),
    }),
  }),
});

export const {
  useCancelBookingMutation,
  useSecureBookingLinkMutation,
  useSendBookingCodeMutation,
  useVerifyBookingCodeMutation,
  useClaimBookingInviteMutation,
  useGetBookingInviteQuery,
  useGetOwnerManageTokenQuery,
  useRenewBookingInviteMutation,
  useGetManagedBookingQuery,
  useGetPaymentLinkQuery,
  useStartLinkPaymentMutation,
  useGetBookingConfirmationQuery,
  useStartBookingConfirmationMutation,
  useGetCardUpdateQuery,
  useGetReviewPageQuery,
  useSubmitReviewMutation,
  useGetStylistReviewsInfiniteQuery,
  useReportReviewMutation,
  useGetStudioReviewsQuery,
  useReplyToReviewMutation,
  useAppealReviewMutation,
  useGetAppealPageQuery,
  useSubmitAppealMutation,
  useStartCardUpdateMutation,
  useSaveCardUpdateMutation,
  useGetRescheduleSlotsQuery,
  useRescheduleBookingMutation,
  useGetAvailableSlotsQuery,
  useGetBookingStatusQuery,
  useStartCheckoutMutation,
  useHoldBookingMutation,
  useIsInTravelAreaQuery,
  useGetProfileQuery,
  useGetStylistProfileQuery,
  usePeekStylistsQuery,
  useSearchStylistsInfiniteQuery,
  useGetStylistStudioQuery,
  useGetStudioBookingsQuery,
  useGetStudioEarningsQuery,
  useGetCloseChecksQuery,
  useGetHomeStatsQuery,
  useGetStudioActivityQuery,
  useGetTwoFactorDevicesQuery,
  useUpdateProfileMutation,
  useSetBusinessClosedMutation,
} = api;
