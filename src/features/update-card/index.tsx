import { Calendar } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { CardSetup } from "../../components/link-payment";
import { PageMessage } from "../../components/page-message";
import { ManageBookingSkeleton } from "../../components/skeleton/manage-booking";
import { useIsSlow } from "../../hooks/use-is-slow";
import { useLinkPage } from "../../hooks/use-link-page";
import {
  useGetCardUpdateQuery,
  useSaveCardUpdateMutation,
  useStartCardUpdateMutation,
} from "../../stores/api-slice";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import "../../styles/features/manage-booking/global.module.css";
import { CARD_UPDATE_ERRORS, getClosedMessage, UNSAVED_MESSAGE } from "./logic";
import card from "../../styles/features/manage-booking/booking-card.module.css";
import frame from "../../styles/features/manage-booking/index.module.css";
import styles from "../../styles/features/pay-fee/index.module.css";
import { formatLondonDateTime } from "../../utils/dates";

/** the page for a new card when the saved one expires before the appointment, route "/card?token=" from an email. */
export const UpdateCardPage = () => {
  const token = useLinkPage("tw_card_token");
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | null>(null);
  const [startUpdate] = useStartCardUpdateMutation();
  const [saveUpdate] = useSaveCardUpdateMutation();

  const { currentData: update, isFetching } = useGetCardUpdateQuery(token, {
    skip: !token,
  });

  const isSlow = useIsSlow(isFetching && !update);

  // Stripe has the card by now: recording it is tried a few times, and opening the link again finishes it too
  const record = async (triesLeft: number): Promise<boolean> => {
    const saved = await saveUpdate(token)
      .unwrap()
      .catch(() => null);

    if (saved || triesLeft <= 1) return !!saved;

    return record(triesLeft - 1);
  };

  const finish = async () =>
    setSaveState((await record(3)) ? "saved" : "unsaved");

  const getContent = () => {
    if (isSlow) return <ManageBookingSkeleton />;

    if (isFetching && !update) return null;

    if (saveState === "unsaved")
      return <PageMessage {...UNSAVED_MESSAGE} isReload />;

    if (!update || update.state !== "open" || saveState)
      return (
        <PageMessage
          {...getClosedMessage(
            update && saveState ? { ...update, state: "updated" } : update,
          )}
        />
      );

    return (
      <>
        <div className={frame.eyebrow}>Card on file</div>
        <h1 className={frame.title}>
          {`Add a new card for ${update.stylist_name}`}
        </h1>
        <div className={card.card}>
          <div className={card.cardHead}>
            <div className={card.service}>{update.service_name}</div>
          </div>
          <div className={card.facts}>
            <span className={card.fact}>
              <Calendar size={15} strokeWidth={1.5} />
              {formatLondonDateTime(update.starts_at)}
            </span>
          </div>
          <dl className={styles.lines}>
            <div className={styles.line}>
              <dt>{update.card_label ?? "Card on file"}</dt>
              <dd>Expires before then</dd>
            </div>
          </dl>
        </div>
        <CardSetup
          payLabel="Save new card"
          getClientSecret={async (turnstileToken) =>
            (await startUpdate({ token, turnstileToken }).unwrap()).clientSecret
          }
          refusals={CARD_UPDATE_ERRORS}
          onPaid={() => void finish()}
        />
        <p className={styles.note}>
          {`Nothing is charged now. ${update.stylist_name} only uses this card for a fee under their policy, such as a late cancellation or a no-show.`}
        </p>
      </>
    );
  };

  return (
    <div data-screen-label="Update card" className={frame.page}>
      <nav className={frame.nav}>
        <div className={frame.bar}>
          <Link to="/" className={frame.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt="Tiwára's House"
              className={frame.logo}
            />
          </Link>
          {!!update && (
            <span className={frame.who}>{`Booking ref ${update.ref}`}</span>
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
