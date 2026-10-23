import { useMemo } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetHomeStatsQuery } from "../../../stores/api-slice";
import type { StudioController } from "../core/use-studio";
import { RANGE_LENGTHS, toHomeRange } from "./records";

export const useHomeRange = ({
  state: { account, range },
}: StudioController) => {
  const { stylistId } = account;

  const { currentData: data, isError } = useGetHomeStatsQuery(
    stylistId ? { stylistId, days: RANGE_LENGTHS[range] } : skipToken,
    { pollingInterval: 60000, refetchOnMountOrArgChange: true },
  );

  const real = useMemo(
    () => (data ? toHomeRange(data, range) : null),
    [data, range],
  );

  return { real, isError };
};
