import { joinClassNames } from "../../utils/class-names";
import type { AddonPicker } from "./addon-picker";
import type { EditServiceView } from "./booking-edit-view";
import type { BookingSheetView } from "./booking-sheet-view";
import { CalendarToggle, MonthCalendar, getMonthNav } from "./sheets-simple";
import { getMiniCalendarDays } from "./studio-format";
import type { StudioController } from "./use-studio";
import styles from "./booking-steps.module.css";

const PlusIcon = ({
  size = "15",
  strokeWidth = "1.9",
}: {
  size?: string;
  strokeWidth?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14"></path>
  </svg>
);

const SearchField = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) => (
  <label className={styles.search}>
    <svg
      className={styles.searchIcon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-secondary)"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7"></circle>
      <path d="m20 20-3.5-3.5"></path>
    </svg>
    <input
      className={styles.searchInput}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </label>
);

const paneClass = (studio: StudioController) =>
  joinClassNames(styles.pane, studio.state.bookingStepOut && styles.paneOut);

export const EditServiceStep = ({
  studio,
  edit,
}: {
  studio: StudioController;
  edit: EditServiceView;
}) => (
  <div className={paneClass(studio)}>
    <button className={styles.change} onClick={edit.openChange}>
      <span className={styles.grow}>
        <span className={styles.eyebrow}>{edit.categoryLabel}</span>
        <span className={styles.changeName}>{edit.serviceName}</span>
        <span className={styles.changeMeta}>{edit.serviceMeta}</span>
      </span>
      <span className={styles.changeLink}>
        Change
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </span>
    </button>
    <div className={styles.twoCols}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Start time</span>
        <select
          className={joinClassNames(
            styles.timeSelect,
            edit.hasClash && styles.timeSelectClash,
          )}
          value={edit.time}
          onChange={edit.onTime}
        >
          {edit.timeOptions.map(({ key, value, label }) => (
            <option key={key} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.minWidth}>
        <div className={styles.label135}>Duration</div>
        <div className={styles.row8}>
          <select
            className={styles.durSelect}
            value={edit.durationHours}
            onChange={edit.onDurationHours}
            aria-label="Hours"
          >
            {edit.hourOptions.map(({ key, value, label }) => (
              <option key={key} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={styles.durSelect}
            value={edit.durationMinutes}
            onChange={edit.onDurationMinutes}
            aria-label="Minutes"
          >
            {edit.minuteOptions.map(({ key, value, label }) => (
              <option key={key} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
    {!!edit.clashText && (
      <>
        <div className={styles.clash}>
          <svg
            className={styles.iconTop}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 8v4M12 16h.01"></path>
          </svg>
          <span>{edit.clashText}</span>
        </div>
        <div className={styles.nextFree}>
          <span className={styles.nextLabel}>Next available</span>
          {edit.nextFree.map(({ key, label, pick }) => (
            <button key={key} className={styles.nextTime} onClick={pick}>
              {label}
            </button>
          ))}
          {edit.nextFree.length === 0 && (
            <span className={styles.muted135}>Nothing else free today</span>
          )}
        </div>
      </>
    )}
    <div className={styles.extraGrid}>
      {edit.hasExtra && (
        <label className={styles.field}>
          <span className={styles.extraLabel}>
            Extra time
            <button className={styles.removeLink} onClick={edit.clearExtra}>
              Remove
            </button>
          </span>
          <select
            className={styles.select}
            value={edit.extra}
            onChange={edit.onExtra}
          >
            {edit.extraOptions.map(({ key, value, label }) => (
              <option key={key} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
    {!edit.hasExtra && (
      <button className={styles.outlineButton} onClick={edit.addExtra}>
        <PlusIcon />
        Add extra time
      </button>
    )}
    {!edit.isPriceOpen && (
      <div className={styles.priceRow}>
        <span className={styles.minWidth}>
          <span className={styles.priceLabel}>Price</span>
          <span className={styles.priceValue}>{`£${edit.price}`}</span>
        </span>
        <button className={styles.adjust} onClick={edit.openPrice}>
          Adjust price
        </button>
      </div>
    )}
    {edit.isPriceOpen && (
      <div className={styles.priceEditor}>
        <label className={styles.priceField}>
          <span className={styles.fieldLabel}>New price</span>
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
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
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
    )}
    <div className={styles.h3Spaced}>Service add-ons</div>
    <div className={styles.stack8}>
      {edit.addonRows.map(({ key, name, meta, edit: open, menu }) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          key={key}
          className={styles.addonRow}
          data-aorow="1"
          onClick={open}
        >
          <span className={styles.grow}>
            <span className={styles.addonName}>{name}</span>
            <span className={styles.addonMeta}>{meta}</span>
          </span>
          <button
            className={styles.addonMenu}
            onClick={menu}
            aria-label="Add-on options"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.7"></circle>
              <circle cx="12" cy="12" r="1.7"></circle>
              <circle cx="12" cy="19" r="1.7"></circle>
            </svg>
          </button>
        </div>
      ))}
    </div>
    <button
      className={joinClassNames(styles.outlineButton, styles.addButton)}
      onClick={edit.openAddAddon}
    >
      <PlusIcon />
      Add
    </button>
  </div>
);

export const ChangeServiceStep = ({
  studio,
  edit,
}: {
  studio: StudioController;
  edit: EditServiceView;
}) => (
  <div className={paneClass(studio)}>
    <SearchField
      value={edit.serviceQuery}
      onChange={edit.onServiceQuery}
      placeholder="Search services"
    />
    {edit.serviceGroups.map(({ key, category, count, items }) => (
      <div key={key} className={styles.group}>
        <div className={styles.groupHead}>
          <span className={styles.h3}>{category}</span>
          <span className={styles.count}>{count}</span>
        </div>
        <div className={styles.stack6}>
          {items.map((item) => (
            <button
              key={item.key}
              className={joinClassNames(
                styles.option,
                item.isOn && styles.optionOn,
              )}
              onClick={item.pick}
            >
              <span className={styles.grow}>
                <span className={styles.optionName}>{item.name}</span>
                <span className={styles.optionSub}>{item.duration}</span>
              </span>
              <span className={styles.optionPrice}>{item.price}</span>
            </button>
          ))}
        </div>
      </div>
    ))}
    {edit.serviceGroups.length === 0 && (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>No services match</div>
        <div className={styles.emptyBody}>Try a different search.</div>
      </div>
    )}
  </div>
);

/** The add-on picker's search, category chips and grouped rows. */
export const AddonPickerList = ({
  picker,
  className,
}: {
  picker: AddonPicker;
  className?: string;
}) => (
  <div className={className}>
    <SearchField
      value={picker.query}
      onChange={picker.onQuery}
      placeholder="Search add-ons"
    />
    <div className={styles.chips}>
      {picker.chips.map(({ key, label, isOn, onSelect }) => (
        <button
          key={key}
          className={joinClassNames(styles.chip, isOn && styles.chipOn)}
          onClick={onSelect}
        >
          {label}
        </button>
      ))}
    </div>
    {picker.groups.map(({ key, category, count, items }) => (
      <div key={key} className={styles.group}>
        <div className={styles.groupHead}>
          <span className={styles.h3}>{category}</span>
          <span className={styles.count}>{count}</span>
        </div>
        <div className={styles.stack6}>
          {items.map((item) => (
            <button
              key={item.key}
              className={joinClassNames(
                styles.pick,
                item.isOn && styles.pickOn,
              )}
              onClick={item.pick}
              aria-pressed={item.isOn ? "true" : "false"}
            >
              <span className={styles.grow}>
                <span className={styles.optionName}>{item.name}</span>
                <span className={styles.optionSub}>{item.meta}</span>
              </span>
              <span className={styles.tick}>
                <svg
                  className={styles.tickMark}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    ))}
    {picker.isEmpty && (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>No add-ons match</div>
        <div className={styles.emptyBody}>Try a different search.</div>
      </div>
    )}
    {picker.hasDone && (
      <div className={styles.doneBar}>
        <button className={styles.doneButton} onClick={picker.done}>
          {picker.doneLabel}
        </button>
      </div>
    )}
  </div>
);

export const ChangeClientStep = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingSheetView;
}) => {
  const { state, setState } = studio;

  return (
    <div className={paneClass(studio)}>
      <SearchField
        value={state.changeClientQuery || ""}
        onChange={(event) =>
          setState({ changeClientQuery: event.target.value })
        }
        placeholder="Search clients, or type a new name"
      />
      <button className={styles.newClient} onClick={view.openNewClient}>
        <span className={styles.plusDisc}>
          <PlusIcon size="17" />
        </span>
        <span className={styles.grow}>
          <span className={styles.optionName}>Add a new client</span>
        </span>
      </button>
      {view.canAddTyped && (
        <button className={styles.addTyped} onClick={view.addTypedClient}>
          <span className={styles.plusDiscLight}>
            <PlusIcon size="17" />
          </span>
          <span className={styles.grow}>
            <span className={styles.addTypedLabel}>
              {`Add “${(state.changeClientQuery || "").trim()}” as a new client`}
            </span>
            <span className={styles.optionSub}>
              You can add their details later
            </span>
          </span>
        </button>
      )}
      <div className={styles.clientList}>
        {view.changeRows.map(({ key, name, imgSrc, meta, isCurrent, pick }) => (
          <button
            key={key}
            className={joinClassNames(
              styles.clientOption,
              isCurrent && styles.optionOn,
            )}
            onClick={pick}
          >
            <img className={styles.avatar38} src={imgSrc} alt="" />
            <span className={styles.grow}>
              <span className={styles.optionName}>{name}</span>
              <span className={styles.optionSub}>{meta}</span>
            </span>
            <span className={styles.optionTag}>
              {isCurrent ? "Current" : ""}
            </span>
          </button>
        ))}
      </div>
      <button className={styles.walkIn} onClick={view.makeWalkIn}>
        <span className={styles.grow}>
          <span className={styles.optionName}>Leave empty for a walk-in</span>
          <span className={styles.optionSub}>The slot stays booked</span>
        </span>
      </button>
    </div>
  );
};

const BookingSummary = ({ view }: { view: BookingSheetView }) => {
  const { booking } = view;

  return (
    <div className={styles.summary}>
      <img className={styles.avatar42} src={booking.imgSrc} alt="" />
      <div className={styles.grow}>
        <div className={styles.summaryName}>{booking.clientName}</div>
        <div className={styles.summaryMeta}>
          {`${booking.service} · ${booking.durationLabel}`}
        </div>
      </div>
      <div className={styles.summaryEnd}>
        <div className={styles.summaryTime}>{booking.timeRange}</div>
        <div className={styles.muted135}>{booking.dayLabel}</div>
      </div>
    </div>
  );
};

export const RescheduleStep = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingSheetView;
}) => {
  const { state, setState } = studio;

  const monthNav = getMonthNav(
    studio,
    "rescheduleCalendarMonth",
    "rescheduleCalendarYear",
  );

  return (
    <>
      <BookingSummary view={view} />
      <div className={styles.stepBody}>
        <div className={styles.pickHead}>
          <div className={styles.label145}>Pick a new time</div>
          <CalendarToggle
            isOpen={state.rescheduleCalendarOpen}
            onClick={() => {
              const today = new Date();

              setState({
                rescheduleCalendarOpen: !state.rescheduleCalendarOpen,
                rescheduleCalendarMonth:
                  state.rescheduleCalendarMonth == null
                    ? today.getMonth()
                    : state.rescheduleCalendarMonth,
                rescheduleCalendarYear:
                  state.rescheduleCalendarYear == null
                    ? today.getFullYear()
                    : state.rescheduleCalendarYear,
              });
            }}
          />
        </div>
        {!state.rescheduleCalendarOpen && (
          <div className={styles.dayStrip}>
            {view.rescheduleDays.map(
              ({ key, weekday, dayNumber, isOn, pick }) => (
                <button
                  key={key}
                  className={joinClassNames(
                    styles.dayChip,
                    isOn && styles.dayChipOn,
                  )}
                  onClick={pick}
                >
                  <div className={styles.chipDow}>{weekday}</div>
                  <div className={styles.chipNum}>{dayNumber}</div>
                </button>
              ),
            )}
          </div>
        )}
        {state.rescheduleCalendarOpen && (
          <MonthCalendar
            monthNav={monthNav}
            days={getMiniCalendarDays(
              monthNav.month,
              monthNav.year,
              state.rescheduleDay,
              (offset) => setState({ rescheduleDay: offset }),
              0,
            )}
          />
        )}
        <div className={styles.timesLabel}>Available times</div>
        <div className={styles.times}>
          {view.hasNoSlots && (
            <span className={styles.noSlots}>{view.noSlotsText}</span>
          )}
          {view.rescheduleTimes.map(({ key, label, isOn, pick }) => (
            <button
              key={key}
              className={joinClassNames(styles.time, isOn && styles.timeOn)}
              onClick={pick}
            >
              {label}
            </button>
          ))}
          <button
            className={joinClassNames(
              styles.custom,
              view.isCustom && styles.customOn,
            )}
            onClick={view.toggleCustom}
          >
            <PlusIcon size="13" strokeWidth="2" />
            Custom time
          </button>
        </div>
        {view.isCustom && (
          <div className={styles.customRow}>
            <div className={styles.grow}>
              <div className={styles.label145}>Start time</div>
              <div
                className={joinClassNames(
                  styles.customHint,
                  view.isCustomWarn && styles.customHintWarn,
                )}
              >
                {view.customHint}
              </div>
            </div>
            <input
              className={styles.timeInput}
              type="time"
              step="300"
              value={view.customTime}
              onChange={view.onCustomTime}
              aria-label="Custom start time"
            />
          </div>
        )}
        {!!view.rescheduleWarning && (
          <div className={styles.warning}>{view.rescheduleWarning}</div>
        )}
        <div className={styles.told}>
          {`${view.booking.firstName} is told about the new time straight away. No deposit is lost.`}
        </div>
      </div>
    </>
  );
};

export const CancelStep = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingSheetView;
}) => {
  const { state, setState } = studio;

  return (
    <>
      <BookingSummary view={view} />
      <div className={styles.stepBody}>
        <div className={styles.whoLabel}>Who is cancelling?</div>
        <div className={styles.who}>
          {view.cancelWhoOptions.map(({ id, label }) => (
            <button
              key={id}
              className={joinClassNames(
                styles.whoOption,
                state.cancelWho === id && styles.whoOptionOn,
              )}
              onClick={() => setState({ cancelWho: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.cancelBody}>{view.cancelBody}</div>
        {view.isFeeShown && (
          <button
            className={styles.feeToggle}
            onClick={() => setState({ cancelFee: !state.cancelFee })}
          >
            <span
              className={joinClassNames(
                styles.checkbox,
                state.cancelFee && styles.checkboxOn,
              )}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--neutral-100)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
            </span>
            <span className={styles.feeLabel}>{view.feeLabel}</span>
          </button>
        )}
        <input
          className={styles.reason}
          value={state.cancelReason}
          onChange={(event) => setState({ cancelReason: event.target.value })}
          placeholder="Reason (optional)"
        />
      </div>
    </>
  );
};

/** "Didn't turn up?" under the body. */
export const NoShowPanel = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingSheetView;
}) => (
  <div
    className={joinClassNames(
      styles.noShow,
      studio.isWide && styles.noShowWide,
    )}
  >
    <div className={styles.label145Block}>
      {view.booking.firstName} didn’t turn up?
    </div>
    <div className={styles.noShowHint}>
      Choose what to charge. The slot is released and you can undo this for 24
      hours from Past.
    </div>
    <div className={styles.radios}>
      {view.noShowOptions.map(({ id, label, subtitle, isOn, pick }) => (
        <button
          key={id}
          className={joinClassNames(styles.radio, isOn && styles.radioOn)}
          onClick={pick}
        >
          <span className={styles.ring}>
            <span className={styles.dot}></span>
          </span>
          <span className={styles.grow}>
            <span className={styles.radioLabel}>{label}</span>
            <span className={styles.radioSub}>{subtitle}</span>
          </span>
        </button>
      ))}
    </div>
    <div className={styles.noShowActions}>
      <button className={styles.back} onClick={view.backToView}>
        Back
      </button>
      <button className={styles.markNoShow} onClick={view.confirmNoShow}>
        Mark as no-show
      </button>
    </div>
  </div>
);
