import { useNavigate } from "react-router";
import { queueSiteToast } from "../components/welcome-toast/welcome-toast";
import { useAppDispatch } from "../stores/hooks";
import { logOut } from "../stores/session-slice";

/** Signs out, then goes home with "Signed out. See you soon." */
export const useSignOut = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return () => {
    queueSiteToast("Signed out. See you soon.");
    dispatch(logOut());
    navigate("/");
  };
};
