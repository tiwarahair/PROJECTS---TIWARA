import type { EditServiceView } from "../edit-view";
import styles from "../../../../styles/features/studio/bookings/steps/service-price.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface ServicePriceProps {
  edit: EditServiceView;
}

export const ServicePrice = ({ edit }: ServicePriceProps) => {
  if (!edit.isPriceOpen)
    return (
      <div className={styles.priceRow}>
        <span className={shared.minWidth}>
          <span className={styles.priceLabel}>Price</span>
          <span className={styles.priceValue}>{`£${edit.price}`}</span>
        </span>
        <button className={styles.adjust} onClick={edit.openPrice}>
          Adjust price
        </button>
      </div>
    );

  return (
    <div className={styles.priceEditor}>
      <label className={styles.priceField}>
        <span className={shared.fieldLabel}>New price</span>
        <span className={styles.moneyBox}>
          <span className={styles.pound}>£</span>
          <input
            className={styles.moneyInput}
            type="number"
            inputMode="decimal"
            min="0"
            value={edit.price}
            onChange={edit.onPrice}
          />
        </span>
      </label>
      <label className={shared.field}>
        <span className={shared.fieldLabel}>
          Reason <span className={styles.optional}>(optional)</span>
        </span>
        <input
          className={styles.textInput}
          value={edit.priceReason}
          onChange={edit.onPriceReason}
          maxLength={80}
          placeholder="e.g. Extra length added"
        />
      </label>
      {!!edit.priceDifference && (
        <div className={styles.difference}>{edit.priceDifference}</div>
      )}
    </div>
  );
};
