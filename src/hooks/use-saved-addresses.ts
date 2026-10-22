import { skipToken } from "@reduxjs/toolkit/query";
import { useGetClientAddressesQuery } from "../stores/account-api";
import { useAppSelector } from "../stores/hooks";
import type { SavedAddress } from "../types/address";

const NO_ADDRESSES: SavedAddress[] = [];

export const useSavedAddresses = () => {
  const userId = useAppSelector(({ session }) => session.user?.id);
  const { data } = useGetClientAddressesQuery(userId ?? skipToken);

  return data ?? NO_ADDRESSES;
};
