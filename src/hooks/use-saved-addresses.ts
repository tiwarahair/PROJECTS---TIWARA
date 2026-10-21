import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useRef } from "react";
import {
  useGetClientAddressesQuery,
  useSaveClientAddressMutation,
} from "../stores/account-api";
import { getErrorMessage } from "../stores/api-slice";
import { useAppSelector } from "../stores/hooks";
import type { SavedAddress } from "../types/address";
import {
  readDeviceAddresses,
  writeDeviceAddresses,
} from "../utils/saved-addresses";

const NO_ADDRESSES: SavedAddress[] = [];

export const useSavedAddresses = () => {
  const userId = useAppSelector(({ session }) => session.user?.id);
  const { data, isSuccess } = useGetClientAddressesQuery(userId ?? skipToken);
  const [saveAddress] = useSaveClientAddressMutation();
  const isMoving = useRef(false);

  useEffect(() => {
    const deviceAddresses = readDeviceAddresses();

    if (!isSuccess || !deviceAddresses.length || isMoving.current) return;

    isMoving.current = true;

    // one at a time, in order, each leaving the device once it's saved
    const moveAll = async () => {
      for (const [index, address] of deviceAddresses.entries()) {
        try {
          await saveAddress({ id: null, address }).unwrap();
        } catch (error) {
          const reason = getErrorMessage(error);

          if (reason === "too_many_addresses") break;

          // an address the account can't hold is dropped; anything else (offline) waits for next time
          if (reason !== "invalid_address")
            return writeDeviceAddresses(deviceAddresses.slice(index));
        }
      }

      writeDeviceAddresses([]);
    };

    void moveAll().finally(() => {
      isMoving.current = false;
    });
  }, [isSuccess, saveAddress]);

  return data ?? NO_ADDRESSES;
};
