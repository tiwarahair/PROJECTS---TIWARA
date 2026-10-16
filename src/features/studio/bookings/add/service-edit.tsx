import { ChevronRight, EllipsisVertical, Plus } from "lucide-react";
import { SelectOptions } from "../steps";
import type { AddBookingView } from "./view";
import styles from "../../../../styles/features/studio/bookings/add/service-edit.module.css";
import shared from "../../../../styles/features/studio/bookings/add/index.module.css";

interface ServiceEditProps {
  view: AddBookingView;
}

/** Step 2: this booking's duration, price, extra time and add-ons. */
export const ServiceEdit = ({ view }: ServiceEditProps) => (
  <div className={styles.editPane}>
    <button className={styles.editHead} onClick={view.closeEdit}>
      <span className={shared.grow}>
        <span className={styles.editName}>{view.selectedName}</span>
        <span className={styles.editMeta}>{view.selectedMeta}</span>
      </span>
      <span className={styles.change}>
        Change
        <ChevronRight size={16} strokeWidth={1.7} />
      </span>
    </button>
    <div className={styles.editGrid}>
      <div>
        <div className={styles.label135}>Duration</div>
        <div className={styles.row6}>
          <select
            className={styles.select}
            value={view.durationHours}
            onChange={view.onDurationHours}
            aria-label="Hours"
          >
            <SelectOptions options={view.hourOptions} />
          </select>
          <select
            className={styles.select}
            value={view.durationMinutes}
            onChange={view.onDurationMinutes}
            aria-label="Minutes"
          >
            <SelectOptions options={view.minuteOptions} />
          </select>
        </div>
      </div>
      <label className={shared.block}>
        <span className={styles.fieldLabel6}>Price</span>
        <span className={styles.moneyBox}>
          <span className={styles.pound}>£</span>
          <input
            className={styles.moneyInput}
            type="number"
            inputMode="decimal"
            min="0"
            value={view.priceValue}
            onChange={view.onPrice}
          />
        </span>
      </label>
    </div>
    <label className={styles.extraField}>
      <span className={styles.label135Plain}>Extra time after</span>
      <select
        className={styles.selectWide}
        value={view.extraValue}
        onChange={view.onExtra}
      >
        <SelectOptions options={view.extraOptions} />
      </select>
      <span className={styles.note135}>
        {"Blocked after the appointment. Clients don't see it."}
      </span>
    </label>
    <div>
      <div className={styles.addonsTitle}>Service add-ons</div>
      <div className={styles.stack8}>
        {view.addonRows.map(({ key, name, meta, edit, menu }) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div
            key={key}
            className={styles.addonRow}
            data-aorow="1"
            onClick={edit}
          >
            <span className={shared.grow}>
              <span className={styles.addonName}>{name}</span>
              <span className={shared.clientSub}>{meta}</span>
            </span>
            <button
              className={styles.addonMenu}
              onClick={menu}
              aria-label="Add-on options"
            >
              <EllipsisVertical size={17} />
            </button>
          </div>
        ))}
      </div>
      <button className={styles.addButton} onClick={view.openAddons}>
        <Plus size={15} strokeWidth={1.9} />
        Add
      </button>
    </div>
    {view.isAdjusted && (
      <button className={styles.reset} onClick={view.resetAdjustments}>
        Reset to service defaults
      </button>
    )}
  </div>
);
