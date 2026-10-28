import { Navigate, useSearchParams } from "react-router";
import { StudioSkeleton } from "../../components/skeleton/studio";
import { useIsSlow } from "../../hooks/use-is-slow";
import { useAppSelector } from "../../stores/hooks";
import { NotFoundPage } from "../page-states/not-found";
import { TwoStepGate } from "./gate";
import { isFromStudio } from "./shell/nav-items";
import { AdminPage } from ".";

/** "/admin" is for admins (flagged by SQL) who've entered a two-step code; anyone else gets the usual not found. */
export const AdminRoute = () => {
  const { ready, user, hasSignedOut } = useAppSelector(
    ({ session }) => session,
  );

  const isSlow = useIsSlow(!ready);
  const [params] = useSearchParams();

  if (!ready) return isSlow ? <StudioSkeleton /> : null;

  if (!user)
    return (
      <Navigate to={hasSignedOut ? "/" : "/login?return=/admin"} replace />
    );

  if (!user.isAdmin) return <NotFoundPage />;

  const isBackToStudio = user.isStylist && isFromStudio(params);

  return (
    <TwoStepGate isBackToStudio={isBackToStudio}>
      <AdminPage isBackToStudio={isBackToStudio} />
    </TwoStepGate>
  );
};
