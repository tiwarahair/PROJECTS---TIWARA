import { skipToken } from "@reduxjs/toolkit/query";
import { Navigate } from "react-router";
import { StudioSkeleton } from "../../components/skeleton/studio-skeleton";
import { useIdentity } from "../../hooks/use-identity";
import { useIsSlow } from "../../hooks/use-is-slow";
import {
  useGetStylistStudioQuery,
  useGetTwoFactorDevicesQuery,
} from "../../stores/api-slice";
import { useAppSelector } from "../../stores/hooks";
import { ClosedBusiness } from "./closed-business";
import { getQueryParam } from "./core/model";
import { StudioPage } from ".";

/** Dev boards (?board=true, ?fixture=, ?account=new) open the demo Studio without signing in. */
const isDemoStudio = () =>
  import.meta.env.DEV &&
  ["board", "fixture", "account"].some((key) => !!getQueryParam(key));

/** "/studio" is for stylists: it loads their business, then opens Studio with it. */
export const StudioRoute = () => {
  const { ready, user, hasSignedOut } = useAppSelector(
    ({ session }) => session,
  );

  const identity = useIdentity();

  // every Studio save invalidates this cache (onStudioWrite), so a cached copy is never older than the last save
  const { data: studio } = useGetStylistStudioQuery(
    user?.isStylist ? user.id : skipToken,
    { refetchOnMountOrArgChange: 30 },
  );

  const { data: devices, isError: isDevicesError } =
    useGetTwoFactorDevicesQuery(user?.isStylist ? user.id : skipToken, {
      refetchOnMountOrArgChange: 30,
    });

  const isLoading =
    !ready ||
    (!!user?.isStylist &&
      (!studio || !identity?.isLoaded || (!devices && !isDevicesError)));

  const isSlow = useIsSlow(isLoading);

  if (isDemoStudio()) return <StudioPage />;

  if (!ready) return isSlow ? <StudioSkeleton /> : null;

  if (!user)
    return <Navigate to={hasSignedOut ? "/" : "/login?flow=pro"} replace />;

  if (!user.isStylist) return <Navigate to="/join" replace />;

  if (isLoading || !studio || !identity?.isLoaded)
    return isSlow ? <StudioSkeleton /> : null;

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
