import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
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

/** RTK Query's result shape for a promise that may throw. */
const toQueryResult = <T>(task: Promise<T>) =>
  task.then(
    (data) => ({ data }),
    (error: unknown) => ({
      error: error instanceof Error ? error : new Error(String(error)),
    }),
  );

export const api = createApi({
  reducerPath: "api",
  baseQuery: fakeBaseQuery<Error>(),
  tagTypes: ["Studio"],
  endpoints: (build) => ({
    getProfile: build.query<Profile, string>({
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
      invalidatesTags: ["Studio"],
    }),
    getStylistStudio: build.query<StylistStudio, string>({
      providesTags: ["Studio"],
      queryFn: (ownerId) => toQueryResult(fetchStylistStudio(ownerId)),
    }),
    getStylistProfile: build.query<PublicProfile | null, string>({
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
      queryFn: ({ args, size }) => toQueryResult(searchStylists(args, 0, size)),
    }),
    getTwoFactorDevices: build.query<TwoFactorDevice[], string>({
      queryFn: () => toQueryResult(listTwoFactorDevices()),
    }),
  }),
});

export const {
  useGetProfileQuery,
  useGetStylistProfileQuery,
  usePeekStylistsQuery,
  useSearchStylistsInfiniteQuery,
  useGetStylistStudioQuery,
  useGetTwoFactorDevicesQuery,
  useUpdateProfileMutation,
  useSetBusinessClosedMutation,
} = api;
