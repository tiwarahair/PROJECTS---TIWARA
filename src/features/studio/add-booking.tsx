import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import type { AddBookingView } from "./add-booking-view";
import { DuplicateNotice } from "./booking-dialogs";
import { AddonPickerList } from "./booking-steps";
import { CalendarToggle, getMonthNav, MonthCalendar } from "./sheets-simple";
import type { StudioController } from "./use-studio";
import styles from "../../styles/features/studio/add-booking.module.css";
import stepStyles from "../../styles/features/studio/booking-steps.module.css";

const asStyle = (values: Record<string, string>) => values as CSSProperties;

const SearchIcon = ({
  className,
  size = "15",
  strokeWidth = "2",
}: {
  className?: string;
  size?: string;
  strokeWidth?: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--text-secondary)"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7"></circle>
    <path d="m20 20-3.5-3.5"></path>
  </svg>
);

const PlusIcon = ({
  size,
  strokeWidth,
}: {
  size: string;
  strokeWidth: string;
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

/** Step 1: pick a client, add a new one, or make it a walk-in. */
const WhoStep = ({ view }: { view: AddBookingView }) => {
  const { newClient } = view;

  return (
    <>
      <div className={styles.question}>Who is it for?</div>
      {!newClient && (
        <>
          <div className={styles.searchWrap}>
            <SearchIcon className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={view.clientQuery}
              onChange={view.onClientQuery}
              placeholder="Search by name or phone"
            />
          </div>
          <div className={styles.clientList}>
            <button className={styles.newRow} onClick={view.toggleNew}>
              <span className={styles.newIcon}>
                <PlusIcon size="15" strokeWidth="2.2" />
              </span>
              <span className={styles.newLabel}>{view.newLabel}</span>
            </button>
            {view.clients.map(
              ({ key, delay, name, imgSrc, subtitle, isOn, pick }) => (
                <button
                  key={key}
                  className={joinClassNames(
                    styles.clientRow,
                    isOn && styles.clientRowOn,
                  )}
                  // runtime: each row's entrance is staggered
                  style={asStyle({ "--delay": delay })}
                  onClick={pick}
                >
                  <img className={styles.avatar36} src={imgSrc} alt="" />
                  <span className={styles.grow}>
                    <span className={styles.clientName}>{name}</span>
                    <span className={styles.clientSub}>{subtitle}</span>
                  </span>
                  {isOn && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent-700)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  )}
                </button>
              ),
            )}
            {view.isNoMatch && (
              <div className={styles.noMatch}>
                {`No client matches “${view.clientQuery}”. Add them as a new client above.`}
              </div>
            )}
          </div>
          <button
            className={joinClassNames(
              styles.walkIn,
              view.isWalkIn && styles.walkInOn,
            )}
            onClick={view.pickWalkIn}
          >
            <span className={styles.grow}>
              <span className={styles.walkInLabel}>
                No client, this is a walk-in
              </span>
            </span>
          </button>
        </>
      )}
      {newClient && (
        <div className={styles.newClient}>
          <div className={styles.newHead}>
            <span className={styles.newTitle}>New client</span>
            <button className={styles.backToList} onClick={view.toggleNew}>
              Back to list
            </button>
          </div>
          <div className={styles.fields}>
            <label className={styles.block}>
              <span className={styles.fieldLabel}>Full name</span>
              <input
                className={styles.input}
                value={newClient.name}
                onChange={(event) =>
                  view.patchNew({ name: event.target.value })
                }
                placeholder="e.g. Adaeze Nwosu"
              />
            </label>
            <label className={styles.block}>
              <span className={styles.fieldLabel}>Phone</span>
              <input
                className={styles.input}
                type="tel"
                inputMode="tel"
                value={newClient.contact}
                onChange={(event) =>
                  view.patchNew({ contact: event.target.value })
                }
                placeholder="07700 900000"
              />
            </label>
            <label className={styles.block}>
              <span className={styles.fieldLabel}>
                Email <span className={styles.optional}></span>
              </span>
              <input
                className={styles.input}
                type="email"
                inputMode="email"
                value={newClient.email || ""}
                onChange={(event) =>
                  view.patchNew({ email: event.target.value })
                }
                placeholder="name@email.com"
              />
            </label>
            {view.isAddressShown && (
              <label className={styles.block}>
                <span className={styles.fieldLabel}>
                  Address <span className={styles.optional}>(optional)</span>
                </span>
                <input
                  className={styles.input}
                  value={newClient.address}
                  onChange={(event) =>
                    view.patchNew({ address: event.target.value })
                  }
                  placeholder="Street, postcode"
                />
              </label>
            )}
          </div>
          <DuplicateNotice duplicate={view.duplicate} />
          <div className={styles.hint}>
            Add a phone number or an email so they get their booking
            confirmation.
          </div>
        </div>
      )}
    </>
  );
};

/** Step 2: the service list and the selected service. */
const ServiceList = ({ view }: { view: AddBookingView }) => (
  <>
    <label className={styles.searchField}>
      <SearchIcon className={styles.noShrink} size="16" strokeWidth="1.7" />
      <input
        className={styles.searchFieldInput}
        value={view.serviceQuery}
        onChange={view.onServiceQuery}
        placeholder="Search services"
      />
    </label>
    <div className={styles.serviceList}>
      {view.serviceGroups.map(({ key, category, count, items }) => (
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
                <span className={styles.optionPrice}>{item.priceLabel}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
    {view.isServiceEmpty && (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>No services match</div>
        <div className={styles.emptyBody}>Try a different search.</div>
      </div>
    )}
    {view.isServicePicked && (
      <div className={styles.picked}>
        <div className={styles.grow}>
          <div className={styles.pickedLabel}>Selected service</div>
          <div className={styles.pickedName}>{view.selectedName}</div>
          <div className={styles.pickedMeta}>{view.selectedMeta}</div>
        </div>
        <button className={styles.editForThis} onClick={view.openEdit}>
          Edit for this booking
        </button>
      </div>
    )}
  </>
);

/** Step 2: this booking's duration, price, extra time and add-ons. */
const ServiceEdit = ({ view }: { view: AddBookingView }) => (
  <div className={styles.editPane}>
    <button className={styles.editHead} onClick={view.closeEdit}>
      <span className={styles.grow}>
        <span className={styles.editName}>{view.selectedName}</span>
        <span className={styles.editMeta}>{view.selectedMeta}</span>
      </span>
      <span className={styles.change}>
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
            {view.hourOptions.map(({ key, value, label }) => (
              <option key={key} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={view.durationMinutes}
            onChange={view.onDurationMinutes}
            aria-label="Minutes"
          >
            {view.minuteOptions.map(({ key, value, label }) => (
              <option key={key} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className={styles.block}>
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
        {view.extraOptions.map(({ key, value, label }) => (
          <option key={key} value={value}>
            {label}
          </option>
        ))}
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
            <span className={styles.grow}>
              <span className={styles.addonName}>{name}</span>
              <span className={styles.clientSub}>{meta}</span>
            </span>
            <button
              className={styles.addonMenu}
              onClick={menu}
              aria-label="Add-on options"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="5" r="1.7"></circle>
                <circle cx="12" cy="12" r="1.7"></circle>
                <circle cx="12" cy="19" r="1.7"></circle>
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button className={styles.addButton} onClick={view.openAddons}>
        <PlusIcon size="15" strokeWidth="1.9" />
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

/** Step 3: day, time and overlap check. */
const WhenStep = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: AddBookingView;
}) => {
  const monthNav = getMonthNav(studio, "calendarMonth", "calendarYear");

  return (
    <>
      <div className={styles.whenHead}>
        <div className={styles.label145}>When?</div>
        <CalendarToggle
          isOpen={view.isCalendarOpen}
          onClick={view.toggleCalendar}
        />
      </div>
      {!view.isCalendarOpen && (
        <div className={stepStyles.dayStrip}>
          {view.days.map(({ key, weekday, dayNumber, isOn, pick }) => (
            <button
              key={key}
              className={joinClassNames(
                stepStyles.dayChip,
                isOn && stepStyles.dayChipOn,
              )}
              onClick={pick}
            >
              <div className={stepStyles.chipDow}>{weekday}</div>
              <div className={stepStyles.chipNum}>{dayNumber}</div>
            </button>
          ))}
        </div>
      )}
      {view.isCalendarOpen && (
        <MonthCalendar monthNav={monthNav} days={view.calendarDays} isLoose />
      )}
      <div className={stepStyles.timesLabel}>Available times</div>
      <div className={stepStyles.times}>
        {view.isNoSlots && (
          <span className={stepStyles.noSlots}>{view.noSlotsText}</span>
        )}
        {view.times.map(({ key, label, isOn, pick }) => (
          <button
            key={key}
            className={joinClassNames(
              stepStyles.time,
              isOn && stepStyles.timeOn,
            )}
            onClick={pick}
          >
            {label}
          </button>
        ))}
        <button
          className={joinClassNames(
            stepStyles.custom,
            view.isCustom && stepStyles.customOn,
          )}
          onClick={view.toggleCustom}
        >
          <PlusIcon size="13" strokeWidth="2" />
          Custom time
        </button>
      </div>
      {view.isCustom && (
        <div className={stepStyles.customRow}>
          <div className={stepStyles.grow}>
            <div className={stepStyles.label145}>Start time</div>
            <div
              className={joinClassNames(
                stepStyles.customHint,
                view.isCustomWarn && stepStyles.customHintWarn,
              )}
            >
              {view.customHint}
            </div>
          </div>
          <input
            className={stepStyles.timeInput}
            type="time"
            step="300"
            min={view.customMinutes}
            max={view.customMax}
            value={view.customTime}
            onChange={view.onCustomTime}
            aria-label="Custom start time"
          />
        </div>
      )}
      {view.hasConflict && (
        <div className={styles.conflict}>
          <div className={styles.conflictTitle}>Overlaps another booking</div>
          <div className={styles.conflictBody}>{view.conflictBody}</div>
          <button className={styles.overlap} onClick={view.toggleOverlap}>
            <span
              className={joinClassNames(
                styles.checkbox,
                view.isOverlapAllowed && styles.checkboxOn,
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
            <span className={styles.overlapLabel}>Book it anyway</span>
          </button>
        </div>
      )}
      <div className={styles.summary}>{view.summary}</div>
    </>
  );
};

/** Step 4: send a payment link or book without protection. */
const ProtectionStep = ({ view }: { view: AddBookingView }) => (
  <>
    <div className={styles.label145}>Booking protection</div>
    <div className={styles.policyRow}>
      <svg
        className={styles.policyIcon}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path>
      </svg>
      <div className={styles.policyText}>
        Your policy requires{" "}
        <span className={styles.strong}>{view.protectionNoun}</span> to confirm.
      </div>
    </div>
    <div className={styles.protOptions}>
      {view.protectionOptions.map(({ key, label, subtitle, isOn, pick }) => (
        <button
          key={key}
          className={joinClassNames(
            styles.protOption,
            isOn && styles.protOptionOn,
          )}
          onClick={pick}
        >
          <span className={styles.radio}>
            <span className={styles.dot}></span>
          </span>
          <span className={styles.grow}>
            <span className={styles.protLabel}>{label}</span>
            <span className={styles.protSub}>{subtitle}</span>
          </span>
        </button>
      ))}
    </div>
    <div className={styles.protFoot}>{view.protectionFootnote}</div>
    {view.isProtectionSend && (
      <>
        <div className={styles.receives}>
          {`What ${view.firstName} receives`}
        </div>
        <div className={styles.preview}>{view.protectionPreview}</div>
      </>
    )}
  </>
);

/** Step 5: address and a private note. */
const NotesStep = ({ view }: { view: AddBookingView }) => (
  <>
    <div className={styles.question}>Anything else?</div>
    <div className={styles.stack12}>
      {view.isAddressAsked && (
        <label className={styles.block}>
          <span className={styles.fieldLabel}>
            Client address <span className={styles.optional}>(optional)</span>
          </span>
          <input
            className={styles.input}
            value={view.addressValue}
            onChange={view.onAddress}
            placeholder="Street, postcode"
          />
        </label>
      )}
      <label className={styles.block}>
        <span className={styles.fieldLabel}>
          Note{" "}
          <span className={styles.optional}>(optional, only you see this)</span>
        </span>
        <textarea
          className={styles.textarea}
          value={view.note}
          onChange={view.onNote}
          rows={2}
          placeholder="e.g. Wants colour 30, bring extra packs"
        ></textarea>
      </label>
    </div>
    <div className={styles.summary}>{view.summary}</div>
  </>
);

/** The New booking sheet's body and its in-body footer. */
export const AddBookingSheet = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: AddBookingView;
}) => (
  <>
    <div className={styles.steps}>
      {view.steps.map(({ key, isOn }) => (
        <span
          key={key}
          className={joinClassNames(styles.stepBar, isOn && styles.stepBarOn)}
        ></span>
      ))}
    </div>
    {view.isStep1 && <WhoStep view={view} />}
    {view.isServiceList && <ServiceList view={view} />}
    {view.isServiceEdit && <ServiceEdit view={view} />}
    {view.isAddonPick && view.picker && (
      <AddonPickerList className={styles.addonPick} picker={view.picker} />
    )}
    {view.isStep3 && <WhenStep studio={studio} view={view} />}
    {view.isStep4 && <ProtectionStep view={view} />}
    {view.isStep5 && <NotesStep view={view} />}
    <div className={styles.footer}>
      {view.canBack && (
        <button className={styles.back} onClick={view.back}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7"></path>
          </svg>
          Back
        </button>
      )}
      <button
        className={joinClassNames(
          styles.next,
          view.isDisabled && styles.nextOff,
        )}
        onClick={view.next}
        disabled={view.isDisabled}
      >
        {view.cta}
      </button>
    </div>
  </>
);
