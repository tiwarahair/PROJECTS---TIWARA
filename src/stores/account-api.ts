import { fetchDeletionBlockers } from "../lib/client-account";
import type { DeletionBlockers } from "../lib/client-account";
import { fetchClientBookings } from "../lib/client-bookings";
import {
  fetchClientCards,
  removeClientCard,
  setDefaultCard,
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
    getDeletionBlockers: build.query<DeletionBlockers, string>({
      queryFn: () => toQueryResult(fetchDeletionBlockers()),
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
  useSetDefaultCardMutation,
  useRemoveClientCardMutation,
  useSaveClientAddressMutation,
  useDeleteClientAddressMutation,
} = accountApi;
