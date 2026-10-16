import { joinClassNames } from "../../../utils/class-names";
import type { EarningsController, EarningsProps } from "../use-earnings";
import { OverlayDrawer } from "./drawer";
import { ExportDialog } from "./export-dialog";
import styles from "../../../styles/components/earnings/overlays/index.module.css";

interface EarningsOverlaysProps {
  earnings: EarningsController;
  props: EarningsProps;
}

export const EarningsOverlays = ({
  earnings,
  props,
}: EarningsOverlaysProps) => {
  const { state, ledger, isDesktop } = earnings;
  const contained = !!props.contained;
  const layer = contained ? styles.contained : styles.fixed;
  const { drawer } = state;

  const transaction =
    drawer?.kind === "tx"
      ? ledger.transactions.find(({ id }) => id === drawer.id)
      : undefined;

  const payout =
    drawer?.kind === "po"
      ? ledger.payouts.find(({ id }) => id === drawer.id)
      : undefined;

  const isDrawerOn = !!drawer && (!!transaction || !!payout);

  return (
    <>
      {isDrawerOn && (
        <OverlayDrawer
          earnings={earnings}
          props={props}
          layer={layer}
          transaction={transaction}
          payout={payout}
        />
      )}

      {state.exportOn && <ExportDialog earnings={earnings} layer={layer} />}

      {!!state.toast && (
        <div
          className={joinClassNames(
            styles.toast,
            layer,
            styles.layerToast,
            contained || isDesktop ? styles.toastDesk : styles.toastMobile,
            state.toastOut ? styles.toastOut : styles.toastIn,
          )}
          role="status"
        >
          {state.toast}
        </div>
      )}
    </>
  );
};
