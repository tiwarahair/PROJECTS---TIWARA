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
  getRescheduleSlots,
  rescheduleBooking,
  updateBookingAllergies,
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
  ManagedBooking,
  RescheduleSlotsRequest,
} from "../lib/manage-booking-api";
import { fetchPublicProfile } from "../lib/public-profiles";
import { SEARCH_PAGE_SIZE, searchStylists } from "../lib/search-api";
import type { SearchArgs, SearchRow } from "../lib/search-api";
import type { PublicProfile } from "../lib/public-profiles";
import { supabase } from "../lib/supabase";
import {
  closeBusiness,
  fetchStylistStudio,
  reopenBusiness,
} from "../lib/studio-api";
import type { StylistStudio } from "../lib/studio-api";
import { listTwoFactorDevices } from "../lib/two-factor";
import type { TwoFactorDevice } from "../lib/two-factor";
import type { Profile } from "../types/profile";

export interface ApiError {
  message: string;
}

/** RTK Query's result shape for a promise that may throw. */
const toQueryResult = <T>(task: Promise<T>) =>
  task.then(
    (data) => ({ data }),
    (error: unknown) => ({
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    }),
  );

export const getErrorMessage = (error: unknown) =>
  typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : "";

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
  ],
  refetchOnReconnect: true,
  endpoints: (build) => ({
    getProfile: build.query<Profile, string>({
      keepUnusedDataFor: 600,
      queryFn: async (userId) => {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, phone, marketing_opt_in")
          .eq("id", userId)
          .single();

        if (error) return { error };

        return {
          data: {
            first: data.first_name ?? "",
            last: data.last_name ?? "",
            mobile: data.phone ?? "",
            marketing: data.marketing_opt_in,
          },
        };
      },
    }),
    updateProfile: build.mutation<
      null,
      {
        userId: string;
        patch: Partial<Pick<Profile, "first" | "last" | "mobile">>;
      }
    >({
      queryFn: async ({ userId, patch: { first, last, mobile } }) => {
        const { error } = await supabase
          .from("profiles")
          .update({ first_name: first, last_name: last, phone: mobile })
          .eq("id", userId);

        return error ? { error } : { data: null };
      },
      // the header, Studio and Account read the profile from this cache
      onQueryStarted: async (
        { userId, patch },
        { dispatch, queryFulfilled },
      ) => {
        await queryFulfilled;

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
    getRescheduleSlots: build.query<string[], RescheduleSlotsRequest>({
      providesTags: ["ManagedBooking"],
      queryFn: (request) => toQueryResult(getRescheduleSlots(request)),
    }),
    rescheduleBooking: build.mutation<
      void,
      { token: string; startsAt: string }
    >({
      invalidatesTags: () => ["ManagedBooking"],
      queryFn: (request) => toQueryResult(rescheduleBooking(request)),
    }),
    updateBookingAllergies: build.mutation<
      void,
      { token: string; allergies: string; consent: boolean }
    >({
      invalidatesTags: () => ["ManagedBooking"],
      queryFn: (request) => toQueryResult(updateBookingAllergies(request)),
    }),
    cancelBooking: build.mutation<CancellationTerms, string>({
      invalidatesTags: () => ["ManagedBooking"],
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
  useClaimBookingInviteMutation,
  useGetBookingInviteQuery,
  useGetOwnerManageTokenQuery,
  useRenewBookingInviteMutation,
  useGetManagedBookingQuery,
  useGetRescheduleSlotsQuery,
  useRescheduleBookingMutation,
  useUpdateBookingAllergiesMutation,
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
  useGetTwoFactorDevicesQuery,
  useUpdateProfileMutation,
  useSetBusinessClosedMutation,
} = api;
