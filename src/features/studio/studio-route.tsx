import { skipToken } from "@reduxjs/toolkit/query";
import { Navigate } from "react-router";
import { useIdentity } from "../../hooks/use-identity";
import { useGetStylistStudioQuery } from "../../stores/api-slice";
import { useAppSelector } from "../../stores/hooks";
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

  const { data: studio } = useGetStylistStudioQuery(
    user?.isStylist ? user.id : skipToken,
  );

  if (isDemoStudio()) return <StudioPage />;

  if (!ready) return null;

  if (!user) return <Navigate to="/login?flow=pro" replace />;

  if (!user.isStylist) return <Navigate to="/join" replace />;

  if (!studio || !identity?.isLoaded) return null;

  return (
    <StudioPage
      seed={{
        owner: {
          first: identity.first,
          last: identity.last,
          name: identity.name,
          area: studio.areaLabel ?? "",
          email: identity.email,
          phone: identity.mobile,
        },
        studio,
      }}
    />
  );
};
