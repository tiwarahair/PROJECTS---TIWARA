import { isRouteErrorResponse, useLocation, useRouteError } from "react-router";
import { PageMessage } from "../../components/page-message";
import { SiteHeader } from "../../components/site-header";
import styles from "../../styles/features/page-states/index.module.css";
import { NotFoundPage } from "./not-found";

const OFFLINE_MESSAGE = {
  title: "You’re offline",
  text: "Check your connection and try again.",
};

const ERROR_MESSAGE = {
  title: "Something went wrong",
  text: "Please try again. If it keeps happening, contact us from the Help page.",
};

/** shown when a page throws or its code can't load; "Try again" reloads the same address. */
export const RouteError = () => {
  const error = useRouteError();
  const { pathname, search } = useLocation();

  if (isRouteErrorResponse(error) && error.status === 404)
    return <NotFoundPage />;

  const message = navigator.onLine ? ERROR_MESSAGE : OFFLINE_MESSAGE;

  return (
    <div className={styles.page}>
      <SiteHeader />
      <PageMessage
        {...message}
        linkLabel="Try again"
        linkHref={`${pathname}${search}`}
        isReload
      />
    </div>
  );
};
