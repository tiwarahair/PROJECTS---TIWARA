import { skipToken } from "@reduxjs/toolkit/query";
import { Navigate } from "react-router";
import { useIdentity } from "../../hooks/use-identity";
import {
  useGetStylistStudioQuery,
  useGetTwoFactorDevicesQuery,
} from "../../stores/api-slice";
import { useAppSelector } from "../../stores/hooks";
import { ClosedBusiness } from "./closed-business";
import { getQueryParam } from "./studio-model";
import { StudioPage } from "./studio-page";

/** Dev boards (?board=true, ?fixture=, ?account=new) open the demo Studio without signing in. */
const isDemoStudio = () =>
  import.meta.env.DEV &&
  ["board", "fixture", "account"].some((key) => !!getQueryParam(key));

/** "/studio" is for stylists: it loads their business, then opens Studio with it. */
export const StudioRoute = () => {
  const { ready, user } = useAppSelector(({ session }) => session);
  const identity = useIdentity();

  // always fresh: Studio saves don't update this cache, so a cached copy could write old values back
  const { data: studio } = useGetStylistStudioQuery(
    user?.isStylist ? user.id : skipToken,
    { refetchOnMountOrArgChange: true },
  );

  // the setup checklist's 2FA step reads these, so Studio waits for them
  const { data: devices, isError: isDevicesError } =
    useGetTwoFactorDevicesQuery(user?.isStylist ? user.id : skipToken, {
      refetchOnMountOrArgChange: true,
    });

  if (isDemoStudio()) return <StudioPage />;

  if (!ready) return null;

  if (!user) return <Navigate to="/login?flow=pro" replace />;

  if (!user.isStylist) return <Navigate to="/join" replace />;

  if (!studio || !identity?.isLoaded || (!devices && !isDevicesError))
    return null;

  if (studio.status === "closed" && studio.closed_at)
    return <ClosedBusiness closedAt={studio.closed_at} />;

  return (
    <StudioPage
      seed={{
        owner: {
          first: identity.first,
          last: identity.last,
          name: identity.name,
          area: studio.area_label ?? "",
          email: identity.email,
          phone: identity.mobile,
        },
        studio,
        devices: devices ?? [],
      }}
    />
  );
};
