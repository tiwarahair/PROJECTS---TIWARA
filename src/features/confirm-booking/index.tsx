import { Calendar, MapPin } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router";
import { LinkPayment } from "../../components/link-payment";
import { PageMessage } from "../../components/page-message";
import { ManageBookingSkeleton } from "../../components/skeleton/manage-booking";
import { useIsSlow } from "../../hooks/use-is-slow";
import { usePrivateLink } from "../../hooks/use-private-link";
import {
  useGetBookingConfirmationQuery,
  useStartBookingConfirmationMutation,
} from "../../stores/api-slice";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import "../../styles/features/manage-booking/global.module.css";
import { formatPence, formatWhen } from "../pay-fee/logic";
import {
  CONFIRM_ERRORS,
  getClosedMessage,
  getPayLabel,
  getPolicyLines,
  isSavingCard,
} from "./logic";
import card from "../../styles/features/manage-booking/booking-card.module.css";
import frame from "../../styles/features/manage-booking/index.module.css";
import pay from "../../styles/features/pay-fee/index.module.css";
import styles from "../../styles/features/confirm-booking/index.module.css";

/** The client's confirm page for a booking their >stylist< made, opened from their email. */
export const ConfirmBookingPage = () => {
  const token = usePrivateLink({ storageKey: "tw_confirm_token" });
  const [isPaid, setPaid] = useState(false);
  const [isWaiting, setWaiting] = useState(false);
  const [startConfirmation] = useStartBookingConfirmationMutation();

  const { currentData: confirmation, isFetching } =
    useGetBookingConfirmationQuery(token, {
      skip: !token,
      pollingInterval: isWaiting ? 2000 : 0,
    });

  useEffect(() => {
    if (isWaiting && confirmation && confirmation.state !== "open")
      setWaiting(false);
  }, [isWaiting, confirmation]);

  const isSlow = useIsSlow(isFetching && !confirmation);

  useLayoutEffect(() => {
    document.documentElement.classList.add("manage-page");

    return () => document.documentElement.classList.remove("manage-page");
  }, []);

  const getContent = () => {
    if (isSlow) return <ManageBookingSkeleton />;

    if (isFetching && !confirmation) return null;

    if (!confirmation || confirmation.state !== "open" || isPaid)
      return <PageMessage {...getClosedMessage(confirmation, isPaid)} />;

    const deposit =
      confirmation.terms.mode === "deposit"
        ? confirmation.terms.deposit_pence
        : 0;

    return (
      <>
        <div className={frame.eyebrow}>Confirm your appointment</div>
        <h1
          className={frame.title}
        >{`${confirmation.stylist_name} booked you in`}</h1>
        <div className={card.card}>
          <div className={card.cardHead}>
            <div className={card.service}>{confirmation.service_name}</div>
          </div>
          <div className={card.facts}>
            <span className={card.fact}>
              <Calendar size={15} strokeWidth={1.5} />
              {formatWhen(confirmation.starts_at)}
            </span>
            <span className={card.fact}>
              <MapPin size={15} strokeWidth={1.5} />
              {confirmation.where}
            </span>
          </div>
          <dl className={pay.lines}>
            <div className={pay.line}>
              <dt>Price</dt>
              <dd>{formatPence(confirmation.price_pence)}</dd>
            </div>
            {!!deposit && (
              <div className={pay.line}>
                <dt>Deposit</dt>
                <dd>{formatPence(deposit)}</dd>
              </div>
            )}
            <div className={pay.line}>
              <dt>Booking fee</dt>
              <dd>{formatPence(confirmation.fee_pence)}</dd>
            </div>
            <div className={pay.lineTotal}>
              <dt>To pay now</dt>
              <dd>{formatPence(confirmation.due_pence)}</dd>
            </div>
          </dl>
          <ul className={styles.policy}>
            {getPolicyLines(confirmation).map(({ icon: Icon, text }) => (
              <li key={text} className={styles.policyLine}>
                <Icon
                  className={styles.policyIcon}
                  size={15}
                  strokeWidth={1.6}
                />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <LinkPayment
          amountPence={confirmation.due_pence}
          isSavingCard={isSavingCard(confirmation)}
          payLabel={getPayLabel(confirmation)}
          getClientSecret={async (turnstileToken) =>
            (await startConfirmation({ token, turnstileToken }).unwrap())
              .clientSecret
          }
          refusals={CONFIRM_ERRORS}
          onPaid={() => {
            setPaid(true);
            setWaiting(true);
          }}
        />
        <p className={pay.note}>
          {`By confirming, you agree to ${confirmation.stylist_name}’s cancellation policy and our Terms. Please confirm by ${formatWhen(confirmation.confirm_by)}, or the appointment is cancelled and the time released.`}
        </p>
      </>
    );
  };

  return (
    <div data-screen-label="Confirm booking" className={frame.page}>
      <nav className={frame.nav}>
        <div className={frame.bar}>
          <Link to="/" className={frame.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt="Tiwára's House"
              className={frame.logo}
            />
          </Link>
          {!!confirmation && (
            <span
              className={frame.who}
            >{`Booking ref ${confirmation.ref}`}</span>
          )}
        </div>
      </nav>
      <main
        className={joinClassNames(frame.main, pay.main)}
        aria-busy={isFetching}
      >
        {getContent()}
      </main>
    </div>
  );
};
