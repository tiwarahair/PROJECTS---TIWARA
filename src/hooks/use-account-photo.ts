import { skipToken } from "@reduxjs/toolkit/query";
import { useGetAccountPhotoUrlQuery } from "../stores/account-api";
import { useIdentity } from "./use-identity";

export const useAccountPhoto = () => {
  const photoPath = useIdentity()?.photoPath;

  // the link is signed for an hour, so a fresh one comes before it runs out
  const { currentData, isError } = useGetAccountPhotoUrlQuery(
    photoPath ?? skipToken,
    { pollingInterval: 50 * 60e3 },
  );

  return {
    photo: currentData ?? null,
    hasPhoto: !!photoPath,
    isLoading: !!photoPath && !currentData && !isError,
  };
};
