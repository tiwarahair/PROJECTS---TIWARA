import { Calendar } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { Link } from "react-router";
import { PageMessage } from "../../components/page-message";
import { ManageBookingSkeleton } from "../../components/skeleton/manage-booking-skeleton";
import { useIsSlow } from "../../hooks/use-is-slow";
import { usePrivateLink } from "../../hooks/use-private-link";
import { useGetPaymentLinkQuery } from "../../stores/api-slice";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import "../../styles/features/manage-booking/global.module.css";
import {
  formatPence,
  formatWhen,
  getClosedMessage,
  getCovered,
  getFeeName,
  isBalance,
} from "./logic";
import { PayForm } from "./pay-form";
import card from "../../styles/features/manage-booking/booking-card.module.css";
import frame from "../../styles/features/manage-booking/index.module.css";
import styles from "../../styles/features/pay-fee/index.module.css";

/** The pay page for a fee the card declined, route "/pay?token=" from the client's email. */
export const PayFeePage = () => {
  const token = usePrivateLink({ storageKey: "tw_pay_token" });
  const [isPaid, setPaid] = useState(false);

  const { currentData: link, isFetching } = useGetPaymentLinkQuery(token, {
    skip: !token,
  });

  const isSlow = useIsSlow(isFetching && !link);

  useLayoutEffect(() => {
    document.documentElement.classList.add("manage-page");

    return () => document.documentElement.classList.remove("manage-page");
  }, []);

  const getContent = () => {
    if (isSlow) return <ManageBookingSkeleton />;

    if (isFetching && !link) return null;

    if (!link || link.status !== "pending" || isPaid)
      return (
        <PageMessage
          {...getClosedMessage(
            link && isPaid ? { ...link, status: "paid" } : link,
          )}
        />
      );

    const covered = getCovered(link);

    return (
      <>
        <div className={frame.eyebrow}>{getFeeName(link)}</div>
        <h1 className={frame.title}>
          {`Pay ${formatPence(link.amount_pence)} to ${link.stylist_name}`}
        </h1>
        <div className={card.card}>
          <div className={card.cardHead}>
            <div className={card.service}>{link.service_name}</div>
          </div>
          <div className={card.facts}>
            <span className={card.fact}>
              <Calendar size={15} strokeWidth={1.5} />
              {formatWhen(link.starts_at)}
            </span>
          </div>
          <dl className={styles.lines}>
            <div className={styles.line}>
              <dt>{getFeeName(link)}</dt>
              <dd>{formatPence(link.fee_pence)}</dd>
            </div>
            {!!covered && (
              <div className={styles.line}>
                <dt>Covered by what you paid</dt>
                <dd>{`−${formatPence(covered)}`}</dd>
              </div>
            )}
            <div className={styles.lineTotal}>
              <dt>To pay</dt>
              <dd>{formatPence(link.amount_pence)}</dd>
            </div>
          </dl>
        </div>
        <PayForm link={link} token={token} onPaid={() => setPaid(true)} />
        <p className={styles.note}>
          {isBalance(link)
            ? "Questions? Reply to the email we sent you."
            : `You can’t book with ${link.stylist_name} again until it’s paid. Questions? Reply to the email we sent you.`}
        </p>
      </>
    );
  };

  return (
    <div data-screen-label="Pay fee" className={frame.page}>
      <nav className={frame.nav}>
        <div className={frame.bar}>
          <Link to="/" className={frame.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt="Tiwára's House"
              className={frame.logo}
            />
          </Link>
          {!!link && (
            <span className={frame.who}>{`Booking ref ${link.ref}`}</span>
          )}
        </div>
      </nav>
      <main
        className={joinClassNames(frame.main, styles.main)}
        aria-busy={isFetching}
      >
        {getContent()}
      </main>
    </div>
  );
};
