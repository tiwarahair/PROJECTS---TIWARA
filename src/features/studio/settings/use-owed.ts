import { useEffect, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { getPayOwedUrl } from "../../../lib/studio-api/disputes";
import { SaveError } from "../../../lib/studio-writes";
import { useGetCloseChecksQuery } from "../../../stores/api-slice";
import type { StudioController } from "../core/use-studio";

export const useOwed = ({
  state: { account, isOwedSettling },
  setState,
  actions: { showToast },
}: StudioController) => {
  const stylistId = account?.stylistId;
  const [isPaying, setIsPaying] = useState(false);

  const { data } = useGetCloseChecksQuery(stylistId ?? skipToken, {
    pollingInterval: isOwedSettling ? 3000 : 0,
    refetchOnMountOrArgChange: true,
  });

  const owedPence = data?.owedPence ?? 0;

  useEffect(() => {
    if (!isOwedSettling || !data || owedPence) return;

    setState({ isOwedSettling: false });
    showToast("All paid. You can close your business now.");
  }, [isOwedSettling, data, owedPence, setState, showToast]);

  const pay = async () => {
    setIsPaying(true);

    try {
      window.location.assign(await getPayOwedUrl());
    } catch (error) {
      setIsPaying(false);

      showToast(
        error instanceof SaveError
          ? error.message
          : "Stripe didn’t open. Try again.",
      );
    }
  };

  return {
    owed: owedPence / 100,
    hasOpenDispute: !!data?.hasOpenDispute,
    onPayOwed: stylistId ? () => void pay() : undefined,
    isPayingOwed: isPaying || !!isOwedSettling,
  };
};
