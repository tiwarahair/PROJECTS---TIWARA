import {
  getAccountPhotoUrl,
  removeAccountPhoto,
  uploadAccountPhoto,
} from "../lib/account-photo";
import { fetchDeletionBlockers } from "../lib/client-account";
import { fetchCalendarSecret } from "../lib/client-calendar";
import {
  fetchMySensitivities,
  fetchMySensitivity,
  saveMySensitivity,
} from "../lib/client-sensitivities";
import type { DeletionBlockers } from "../lib/client-account";
import { fetchClientBookings } from "../lib/client-bookings";
import {
  fetchClientCards,
  removeClientCard,
  setDefaultCard,
  startCardsSession,
} from "../lib/client-cards";
import {
  deleteClientAddress,
  fetchClientAddresses,
  saveClientAddress,
} from "../lib/client-addresses";
import type { AddressDraft } from "../lib/client-addresses";
import type { SavedAddress } from "../types/address";
import type { AccountBooking } from "../types/client-booking";
import type { SavedCard } from "../types/saved-card";
import type { SharedSensitivity } from "../types/sensitivity";
import { api, toQueryResult } from "./api-slice";

export const accountApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClientBookings: build.query<AccountBooking[], string>({
      queryFn: () => toQueryResult(fetchClientBookings()),
      providesTags: ["ClientBookings"],
    }),
    // keyed by the signed-in user, so another account never sees this cache
    getClientAddresses: build.query<SavedAddress[], string>({
      queryFn: () => toQueryResult(fetchClientAddresses()),
      providesTags: ["Addresses"],
    }),
    saveClientAddress: build.mutation<
      string,
      { id: string | null; address: AddressDraft }
    >({
      queryFn: (request) => toQueryResult(saveClientAddress(request)),
      invalidatesTags: ["Addresses"],
    }),
    getAccountPhotoUrl: build.query<string, string>({
      queryFn: (path) => toQueryResult(getAccountPhotoUrl(path)),
      providesTags: ["AccountPhoto"],
      keepUnusedDataFor: 1800,
    }),
    setAccountPhoto: build.mutation<
      string | null,
      { userId: string; file: File | null }
    >({
      queryFn: ({ userId, file }) =>
        toQueryResult(
          file
            ? uploadAccountPhoto({ userId, file })
            : removeAccountPhoto(userId),
        ),
      invalidatesTags: ["AccountPhoto"],
      onQueryStarted: async ({ userId }, { dispatch, queryFulfilled }) => {
        try {
          const { data: photoPath } = await queryFulfilled;

          dispatch(
            api.util.updateQueryData("getProfile", userId, (profile) => ({
              ...profile,
              photoPath,
            })),
          );
        } catch {
          // the caller shows the failure
        }
      },
    }),
    getMySensitivities: build.query<SharedSensitivity[], string>({
      queryFn: () => toQueryResult(fetchMySensitivities()),
      providesTags: ["Sensitivities"],
    }),
    getMySensitivity: build.query<string, string>({
      queryFn: (stylistSlug) => toQueryResult(fetchMySensitivity(stylistSlug)),
      providesTags: ["Sensitivities"],
    }),
    saveMySensitivity: build.mutation<
      null,
      { stylistId: string; text: string }
    >({
      queryFn: (request) => toQueryResult(saveMySensitivity(request)),
      invalidatesTags: ["Sensitivities"],
    }),
    getCalendarSecret: build.query<string, string>({
      queryFn: () => toQueryResult(fetchCalendarSecret()),
    }),
    resetCalendarSecret: build.mutation<string, string>({
      queryFn: () => toQueryResult(fetchCalendarSecret(true)),
      onQueryStarted: async (userId, { dispatch, queryFulfilled }) => {
        try {
          const { data: secret } = await queryFulfilled;

          dispatch(
            accountApi.util.upsertQueryData(
              "getCalendarSecret",
              userId,
              secret,
            ),
          );
        } catch {
          // the caller shows the failure
        }
      },
    }),
    getDeletionBlockers: build.query<DeletionBlockers, string>({
      queryFn: () => toQueryResult(fetchDeletionBlockers()),
    }),
    getCardsSession: build.query<string, { userId: string; canSave: boolean }>({
      queryFn: ({ canSave }) => toQueryResult(startCardsSession(canSave)),
      // a session lasts half an hour, so each visit to the pay step starts a new one
      keepUnusedDataFor: 0,
    }),
    getClientCards: build.query<SavedCard[], string>({
      queryFn: () => toQueryResult(fetchClientCards()),
      providesTags: ["ClientCards"],
    }),
    setDefaultCard: build.mutation<SavedCard[], string>({
      queryFn: (card) => toQueryResult(setDefaultCard(card)),
      invalidatesTags: ["ClientCards"],
    }),
    removeClientCard: build.mutation<SavedCard[], string>({
      queryFn: (card) => toQueryResult(removeClientCard(card)),
      invalidatesTags: ["ClientCards"],
    }),
    deleteClientAddress: build.mutation<null, string>({
      queryFn: (id) => toQueryResult(deleteClientAddress(id)),
      invalidatesTags: ["Addresses"],
    }),
  }),
});

export const {
  useGetClientBookingsQuery,
  useGetClientAddressesQuery,
  useGetClientCardsQuery,
  useGetDeletionBlockersQuery,
  useGetAccountPhotoUrlQuery,
  useGetCalendarSecretQuery,
  useGetCardsSessionQuery,
  useGetMySensitivitiesQuery,
  useGetMySensitivityQuery,
  useSaveMySensitivityMutation,
  useResetCalendarSecretMutation,
  useSetAccountPhotoMutation,
  useSetDefaultCardMutation,
  useRemoveClientCardMutation,
  useSaveClientAddressMutation,
  useDeleteClientAddressMutation,
} = accountApi;
