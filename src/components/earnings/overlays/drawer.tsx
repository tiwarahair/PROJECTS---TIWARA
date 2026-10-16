import { ChevronLeft, X } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { Payout, Transaction } from "../data";
import type { EarningsController, EarningsProps } from "../use-earnings";
import { PayoutDetail } from "./payout-detail";
import { TransactionDetail } from "./transaction-detail";
import shared from "../../../styles/components/earnings/overlays/index.module.css";
import styles from "../../../styles/components/earnings/overlays/drawer.module.css";

interface OverlayDrawerProps {
  earnings: EarningsController;
  props: EarningsProps;
  layer: string | undefined;
  transaction?: Transaction;
  payout?: Payout;
}

export const OverlayDrawer = ({
  earnings,
  props,
  layer,
  transaction,
  payout,
}: OverlayDrawerProps) => {
  const { state, setState, isDesktop, closeDrawer } = earnings;
  const title = transaction ? "Transaction" : "Payout";

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          shared.scrim,
          layer,
          shared.layerScrim,
          state.drawerOut ? styles.scrimOut : styles.scrimIn,
        )}
        onClick={closeDrawer}
      ></div>
      <div
        className={joinClassNames(
          styles.drawer,
          layer,
          shared.layerPanel,
          isDesktop ? styles.drawerDesk : styles.drawerMobile,
          state.drawerOut && styles.out,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.drawerHead}>
          {state.drawerStack.length > 0 && (
            <button
              className={styles.iconButton}
              onClick={() =>
                setState(({ drawerStack }) => ({
                  drawer: drawerStack[drawerStack.length - 1] ?? null,
                  drawerStack: drawerStack.slice(0, -1),
                }))
              }
              aria-label="Back"
            >
              <ChevronLeft size={18} strokeWidth={1.7} />
            </button>
          )}
          <div className={styles.drawerTitle}>{title}</div>
          <button
            className={styles.iconButton}
            onClick={closeDrawer}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.drawerBody}>
          {transaction && (
            <TransactionDetail
              earnings={earnings}
              props={props}
              transaction={transaction}
            />
          )}
          {payout && (
            <PayoutDetail earnings={earnings} props={props} payout={payout} />
          )}
        </div>
      </div>
    </>
  );
};
