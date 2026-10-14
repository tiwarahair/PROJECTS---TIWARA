import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
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
    // keyed by user, so a different sign-in never sees the last one's apps
    getTwoFactorDevices: build.query<TwoFactorDevice[], string>({
      queryFn: () => toQueryResult(listTwoFactorDevices()),
    }),
  }),
});

export const {
  useGetProfileQuery,
  useGetStylistStudioQuery,
  useGetTwoFactorDevicesQuery,
  useUpdateProfileMutation,
  useSetBusinessClosedMutation,
} = api;
