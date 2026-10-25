import { PageMessage } from "../../components/page-message";
import { SiteHeader } from "../../components/site-header";
import styles from "../../styles/features/page-states/index.module.css";

interface NotFoundPageProps {
  isStylistLink?: boolean;
  loginHref?: string;
}

const PAGE_HINT = {
  text: "The link may be wrong, or the page has moved.",
  linkLabel: "Go to Tiwára’s House",
  linkHref: "/",
};

const STYLIST_HINT = {
  text: "If you’re looking for a stylist, the link may be wrong or they’re no longer taking bookings here.",
  linkLabel: "Find a stylist",
  linkHref: "/search",
};

export const NotFoundPage = ({
  isStylistLink = false,
  loginHref,
}: NotFoundPageProps) => (
  <div className={styles.page}>
    <SiteHeader loginHref={loginHref} />
    <PageMessage
      title="We couldn’t find this page"
      {...(isStylistLink ? STYLIST_HINT : PAGE_HINT)}
    />
  </div>
);
