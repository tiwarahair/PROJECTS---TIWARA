import { X } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { formatWeekdayDate } from "../../../utils/dates";
import { formatMoney } from "../../../utils/money";
import { STRIPE_BALANCE } from "../data";
import { getClient, getPausedCauses, openUpdateBank } from "../logic";
import type { EarningsController, EarningsProps } from "../use-earnings";
import shared from "../../../styles/components/earnings/overlays/index.module.css";
import dialog from "../../../styles/components/earnings/overlays/export-dialog.module.css";
import styles from "../../../styles/components/earnings/overlays/paused-dialog.module.css";

interface PausedDialogProps {
  earnings: EarningsController;
  props: EarningsProps;
  layer: string | undefined;
}

export const PausedDialog = ({
  earnings: { state, ledger, isDesktop, closePaused, openDrawer },
  props: { clients, onUpdateBank },
  layer,
}: PausedDialogProps) => {
  const owed = formatMoney(ledger.pausedAmount, { pence: "always" });
  const balance = formatMoney(-ledger.pausedAmount, { pence: "always" });
  const causes = getPausedCauses(ledger);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          shared.scrim,
          layer,
          shared.layerScrim,
          state.pausedOut ? dialog.exportScrimOut : dialog.exportScrimIn,
        )}
        onClick={closePaused}
      ></div>
      <div
        className={joinClassNames(
          dialog.modal,
          layer,
          shared.layerPanel,
          isDesktop ? dialog.modalDesk : dialog.modalMobile,
          state.pausedOut && dialog.out,
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Why payouts are paused"
      >
        <div className={dialog.modalBody}>
          <div className={dialog.modalHead}>
            <div className={dialog.modalTitle}>Why payouts are paused</div>
            <button
              className={dialog.modalClose}
              onClick={closePaused}
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.7} />
            </button>
          </div>
          <p className={styles.text}>
            {`A refund or dispute took more than your Stripe balance held, so it’s at ${balance}.`}
          </p>
          <div className={dialog.sectionLabel}>What happens next</div>
          <p className={styles.text}>
            {`Stripe takes the ${owed} from your next card payments. Payouts restart once your balance is back above £0.`}
          </p>
          {causes.length > 0 && (
            <>
              <div className={dialog.sectionLabel}>What caused it</div>
              <div className={styles.causes}>
                {causes.map(({ id, client, description, at, amount, note }) => (
                  <button
                    key={id}
                    className={styles.cause}
                    onClick={() => {
                      closePaused();
                      openDrawer({ kind: "tx", id }, false);
                    }}
                  >
                    <span className={styles.causeText}>
                      <span className={styles.causeTitle}>
                        {`${description} · ${getClient(client, clients).name}`}
                      </span>
                      <span className={styles.causeSub}>
                        {note
                          ? `${formatWeekdayDate(at)} · ${note}`
                          : formatWeekdayDate(at)}
                      </span>
                    </span>
                    <span className={styles.causeAmount}>
                      {formatMoney(amount, { pence: "always" })}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className={dialog.modalActions}>
          <button className={dialog.cancel} onClick={closePaused}>
            Close
          </button>
          <a
            className={joinClassNames(dialog.download, styles.stripeLink)}
            href={STRIPE_BALANCE}
            target="_blank"
            rel="noopener"
            onClick={(event) => openUpdateBank(event, onUpdateBank)}
          >
            View in Stripe
          </a>
        </div>
      </div>
    </>
  );
};
