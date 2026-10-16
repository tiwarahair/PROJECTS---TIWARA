import type { CSSProperties } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { SearchSelect } from "../../../../components/search-select/search-select";
import { joinClassNames } from "../../../../utils/class-names";
import { Swatches } from "../catalog-sheets";
import type { WizardView } from "./view";
import styles from "../../../../styles/features/studio/services/wizard/index.module.css";

const asStyle = (values: Record<string, string>) => values as CSSProperties;

/** Step 2: name, description, category, service type and images. */
const DetailsStep = ({ view }: { view: WizardView }) => {
  const { draft, newCategory } = view;

  return (
    <div className={styles.stack12}>
      {view.isAdd && (
        <div className={styles.suggest}>
          <button
            className={styles.suggestButton}
            type="button"
            onClick={view.openSuggestions}
          >
            <Sparkles size={17} strokeWidth={1.7} />
            Suggested services
          </button>
          <div className={styles.suggestHint}>
            Pick one to fill this form in, then edit anything you like.
          </div>
        </div>
      )}
      <label className={styles.block}>
        <span className={styles.fieldLabel}>Service name</span>
        <input
          className={joinClassNames(
            styles.input,
            view.flash.name && styles.flash,
          )}
          data-flash="1"
          value={draft.name}
          onChange={view.onName}
          placeholder="e.g. Knotless braids"
        />
      </label>
      <label className={styles.block}>
        <span className={styles.fieldLabel}>
          Description <span className={styles.optionalGrey}>(optional)</span>
        </span>
        <textarea
          className={joinClassNames(
            styles.textarea,
            view.flash.description && styles.flash,
          )}
          data-flash="1"
          value={draft.description}
          onChange={view.onDescription}
          rows={3}
          placeholder="What's included, how to come prepared, etc."
        ></textarea>
      </label>
      <div className={styles.detailGrid}>
        <div>
          <span className={styles.fieldLabel}>
            Category <span className={styles.optional}>(optional)</span>
          </span>
          <SearchSelect
            options={view.categoryOptions}
            value={view.categoryValue}
            placeholder="No category"
            onChange={view.pickCategory}
          />
          {newCategory && (
            <div className={styles.newCat}>
              <label className={styles.field6}>
                <span className={styles.label135Strong}>New category</span>
                <input
                  className={joinClassNames(
                    styles.catInput,
                    !!newCategory.error && styles.catInputError,
                  )}
                  value={newCategory.name}
                  onChange={view.onNewCategoryName}
                  maxLength={40}
                  placeholder="e.g. Kids"
                  aria-invalid={newCategory.error ? "true" : "false"}
                />
                {!!newCategory.error && (
                  <span className={styles.error} role="alert">
                    {newCategory.error}
                  </span>
                )}
              </label>
              <Swatches swatches={view.newCategorySwatches} />
              <div className={styles.row8}>
                <button
                  className={styles.darkSmall}
                  type="button"
                  onClick={view.addNewCategory}
                >
                  Add category
                </button>
                <button
                  className={styles.cancelSmall}
                  type="button"
                  onClick={view.cancelNewCategory}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        <div className={styles.relative}>
          <span className={styles.typeHead}>
            <span className={styles.label135}>Service type</span>
            <button
              className={styles.help}
              type="button"
              onClick={view.toggleSubcategoryTip}
              onMouseEnter={view.showSubcategoryTip}
              onMouseLeave={view.hideSubcategoryTip}
              onFocus={view.showSubcategoryTip}
              onBlur={view.hideSubcategoryTip}
              aria-label="What is service type used for?"
            >
              ?
            </button>
          </span>
          <div
            className={joinClassNames(
              styles.typeBox,
              view.flash.type && styles.flash,
            )}
            data-flash="1"
          >
            <SearchSelect
              options={view.typeOptions}
              value={view.typeValue}
              placeholder="Search service types"
              onChange={view.pickType}
            />
          </div>
          {view.isSubcategoryTipOpen && (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            <div className={styles.subTip} onClick={view.toggleSubcategoryTip}>
              Select the service type that best describes this service. This
              helps clients discover your service
            </div>
          )}
        </div>
      </div>
      <div>
        <span className={styles.fieldLabel}>
          Images <span className={styles.optional}>(optional)</span>
        </span>
        <div className={styles.images}>
          <ImageIcon
            className={styles.block}
            size={22}
            strokeWidth={1.8}
            color="var(--text-primary)"
          />
          <span className={styles.imagesTitle}>Add your images here</span>
          <button className={styles.chooseFile} onClick={view.pickImages}>
            Choose a file
          </button>
        </div>
        <div className={styles.fileTypes}>
          File type .jpg, .png, .avif, .webp · max size 45mb
        </div>
      </div>
    </div>
  );
};

type VariationRow = WizardView["sizeRows"][number];

/** A size or length option card. */
const VariationCard = ({
  view,
  title,
  subtitle,
  aria,
  head,
  isOn,
  toggle,
  rows,
  isNext,
}: {
  view: WizardView;
  title: string;
  subtitle: string;
  aria: string;
  head: string;
  isOn: boolean;
  toggle: () => void;
  rows: VariationRow[];
  isNext?: boolean;
}) => (
  <div
    className={joinClassNames(
      styles.optionCard,
      isNext && styles.optionCardNext,
      view.flash.options && styles.flash,
    )}
    data-flash="1"
  >
    <div className={styles.toggleRow}>
      <div className={styles.grow}>
        <div className={styles.title15}>{title}</div>
        <div className={styles.sub135}>{subtitle}</div>
      </div>
      <button
        className={joinClassNames(styles.switch, isOn && styles.switchOn)}
        onClick={toggle}
        aria-label={aria}
      >
        <span className={styles.knob}></span>
      </button>
    </div>
    <div className={joinClassNames(styles.reveal, isOn && styles.revealOpen)}>
      <div className={styles.revealInner}>
        <div className={styles.varHead}>
          <div className={styles.varHeadLabel}>{head}</div>
          <div className={styles.varHeadPrice}>Price</div>
          <div
            className={joinClassNames(
              styles.varHeadDuration,
              view.isWide && styles.durGap,
            )}
          >
            Duration
          </div>
          <div className={styles.varHeadEnd}></div>
        </div>
        {rows.map((row) => {
          const fade = !row.isOn && styles.faded;

          return (
            <div key={row.key} className={styles.varRowWrap}>
              <div
                className={joinClassNames(
                  styles.varRow,
                  row.isOn && styles.varRowOn,
                )}
              >
                <div className={joinClassNames(styles.varLabel, fade)}>
                  {row.label}
                </div>
                <button
                  className={joinClassNames(
                    styles.sign,
                    row.isOn && styles.signActive,
                    row.isNegativeValue && styles.signNeg,
                    fade,
                  )}
                  type="button"
                  onClick={row.flip}
                  disabled={!row.isOn}
                  aria-label={row.signAria}
                  onMouseEnter={row.tipSign}
                  onFocus={row.tipSign}
                  onMouseLeave={view.hideSubcategoryTip}
                  onBlur={view.hideSubcategoryTip}
                >
                  {row.signText}
                </button>
                <span className={joinClassNames(styles.muted135, fade)}>£</span>
                <input
                  className={joinClassNames(styles.varPrice, fade)}
                  value={row.price}
                  onChange={row.setPrice}
                  onFocus={view.selectAll}
                  onBlur={row.blur}
                  disabled={!row.isOn}
                  inputMode="decimal"
                  aria-label={`${row.label} price in pounds`}
                />
                <input
                  className={joinClassNames(
                    styles.varTime,
                    view.isWide && styles.durGap,
                    fade,
                  )}
                  value={row.hours}
                  onChange={row.setHours}
                  onFocus={view.selectAll}
                  onBlur={row.blur}
                  disabled={!row.isOn}
                  inputMode="decimal"
                  aria-label={`${row.label} hours`}
                />
                <span className={joinClassNames(styles.unit, fade)}>hr</span>
                <input
                  className={joinClassNames(styles.varTime, fade)}
                  value={row.minutes}
                  onChange={row.setMinutes}
                  onFocus={view.selectAll}
                  onBlur={row.blur}
                  disabled={!row.isOn}
                  inputMode="decimal"
                  aria-label={`${row.label} minutes`}
                />
                <span className={joinClassNames(styles.unit, fade)}>min</span>
                <button
                  className={joinClassNames(
                    styles.check,
                    row.isOn && styles.checkOn,
                  )}
                  type="button"
                  onClick={row.toggle}
                  aria-label={`Offer ${row.label}`}
                  aria-pressed={row.isOn ? "true" : "false"}
                  onMouseEnter={row.tipCheck}
                  onFocus={row.tipCheck}
                  onMouseLeave={view.hideSubcategoryTip}
                  onBlur={view.hideSubcategoryTip}
                >
                  {row.isOn && <Check size={11} strokeWidth={3} color="#fff" />}
                </button>
              </div>
              <div aria-live="polite">
                {!!row.priceError && (
                  <div className={styles.varError} role="alert">
                    {row.priceError}
                  </div>
                )}
                {!!row.timeError && (
                  <div className={styles.varError} role="alert">
                    {row.timeError}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

/** Step 3: base price and time, size / length options and own customisations. */
const PricingStep = ({ view }: { view: WizardView }) => {
  const { draft, own } = view;

  return (
    <>
      {!view.isPricingCollapsed && (
        <>
          <div className={styles.sectionTitle}>Base price &amp; duration</div>
          <div className={styles.baseBox}>
            <div className={styles.stack16}>
              <label className={styles.block}>
                <span className={styles.fieldLabel}>Price</span>
                <span
                  className={joinClassNames(
                    styles.priceBox,
                    view.flash.price && styles.flash,
                  )}
                  data-flash="1"
                >
                  <span className={styles.pound}>£</span>
                  <input
                    className={styles.priceInput}
                    value={draft.price}
                    onChange={view.onPrice}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label="Base price"
                  />
                </span>
              </label>
              <div>
                <span className={styles.fieldLabel}>Duration</span>
                <div
                  className={joinClassNames(
                    styles.durationGrid,
                    view.flash.price && styles.flash,
                  )}
                  data-flash="1"
                >
                  <span className={styles.selectWrap}>
                    <select
                      className={styles.select}
                      value={view.durationHourValue}
                      onChange={view.onDurationHours}
                      aria-label="Hours"
                    >
                      {view.hourOptions.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className={styles.selectChevron}
                      size={16}
                      strokeWidth={1.7}
                    />
                  </span>
                  <span className={styles.selectWrap}>
                    <select
                      className={styles.select}
                      value={view.durationMinuteValue}
                      onChange={view.onDurationMinutes}
                      aria-label="Minutes"
                    >
                      {view.minuteOptions.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className={styles.selectChevron}
                      size={16}
                      strokeWidth={1.7}
                    />
                  </span>
                </div>
              </div>
              <label className={styles.block}>
                <span className={styles.fieldLabel}>Extra time after</span>
                <span className={styles.selectWrap}>
                  <select
                    className={joinClassNames(
                      styles.extraSelect,
                      view.isExtraTyped && styles.extraTyped,
                    )}
                    value={view.extraValue}
                    onChange={view.onExtra}
                    aria-label="Extra time after"
                  >
                    {view.extraOptions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={styles.selectChevron}
                    size={16}
                    strokeWidth={1.7}
                  />
                </span>
                <span className={styles.extraNote}>
                  Blocked out for clean-down.
                </span>
                {view.isExtraOverride && (
                  <span className={styles.extraHelp}>{view.extraHelp}</span>
                )}
              </label>
            </div>
          </div>
        </>
      )}
      {view.isPricingCollapsed && (
        <div className={styles.collapsed}>
          <div className={styles.collapsedTitle}>Base price &amp; duration</div>
          <div
            className={joinClassNames(
              styles.segments,
              view.isWide && styles.segmentsWrap,
            )}
          >
            <div className={styles.pricePill}>
              <span className={styles.pillPound}>£</span>
              <input
                className={styles.pillInput}
                value={draft.price}
                onChange={view.onPrice}
                inputMode="decimal"
                aria-label="Base price"
                // runtime: the input grows with the typed price
                style={asStyle({ "--width": view.priceWidth })}
              />
            </div>
            <div className={styles.pill}>
              <select
                className={styles.pillHours}
                value={view.durationHourValue}
                onChange={view.onDurationHours}
                aria-label="Hours"
              >
                {view.hourOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className={styles.pillDivider}></span>
              <select
                className={styles.pillMinutes}
                value={view.durationMinuteValue}
                onChange={view.onDurationMinutes}
                aria-label="Minutes"
              >
                {view.minuteOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.pill} title="Extra time after">
              <select
                className={joinClassNames(
                  styles.pillExtra,
                  view.isExtraTyped && styles.extraTyped,
                )}
                value={view.extraValue}
                onChange={view.onExtra}
                aria-label="Extra time after"
              >
                {view.extraOptionsShort.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      {view.hasPlatform && (
        <div className={styles.customTitle}>Customisations</div>
      )}
      {view.hasSizes && (
        <VariationCard
          view={view}
          title="Add size options"
          subtitle="Adjust price and time by size."
          aria="Toggle size options"
          head={view.sizeHead}
          isOn={draft.sizesOn}
          toggle={view.toggleSizes}
          rows={view.sizeRows}
        />
      )}
      {view.hasLengths && (
        <VariationCard
          view={view}
          title="Add length options"
          subtitle="Adjust price and time by hair length."
          aria="Toggle length options"
          head="Length"
          isOn={draft.lengthsOn}
          toggle={view.toggleLengths}
          rows={view.lengthRows}
          isNext
        />
      )}
      <div className={styles.own} data-screen-label="Your own customisations">
        <div className={styles.ownTitle}>Your own customisations</div>
        <div className={styles.ownIntro}>
          Choices clients pick from when they book, like parting. Each option
          can add to the price or time.
        </div>
        {own.rows.map(({ key, name, meta, edit, remove }) => (
          <div key={key} className={styles.ownRow}>
            <span className={styles.grow}>
              <span className={styles.ownName}>{name}</span>
              <span className={styles.ownMeta}>{meta}</span>
            </span>
            <button className={styles.ownEdit} type="button" onClick={edit}>
              Edit
            </button>
            <button className={styles.ownDelete} type="button" onClick={remove}>
              Delete
            </button>
          </div>
        ))}
        {!own.editor && (
          <button
            className={styles.ownAdd}
            type="button"
            onClick={own.startNew}
          >
            <Plus size={14} strokeWidth={2.2} />
            Add a customisation
          </button>
        )}
      </div>
      {view.isReviewShown && (
        <button
          className={joinClassNames(
            styles.reviewButton,
            !view.isReviewReady && styles.reviewOff,
          )}
          onClick={view.openReview}
        >
          Review your prices
        </button>
      )}
    </>
  );
};

/** Step 3 review: every bookable combination. */
const ReviewStep = ({ view }: { view: WizardView }) => {
  const { review } = view;

  return (
    <>
      <div className={styles.intro}>
        Every bookable combination and what it will cost.
      </div>
      <div className={styles.reviewBox}>
        <div className={styles.reviewBase}>{review.baseLabel}</div>
        {review.isGrid && (
          <>
            <div className={styles.gridHead}>
              <div className={styles.corner}>{review.corner}</div>
              {review.head.map((label) => (
                <div key={label} className={styles.headCell}>
                  {label}
                </div>
              ))}
            </div>
            {review.rows.map(({ label, cells }) => (
              <div key={label} className={styles.gridRow}>
                <div className={styles.rowLabel}>{label}</div>
                {cells.map(({ price, duration }, index) => (
                  <div key={index} className={styles.cell}>
                    <div className={styles.amount}>{price}</div>
                    <div className={styles.unit}>{duration}</div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
        {!review.isGrid &&
          review.items.map(({ label, price, duration }) => (
            <div key={label} className={styles.listRow}>
              <div className={styles.listLabel}>{label}</div>
              <div className={styles.muted135}>{duration}</div>
              <div className={styles.amount}>{price}</div>
            </div>
          ))}
      </div>
    </>
  );
};

/** Step 4: pick add-ons and override their price / time for this service. */
const AddonsStep = ({ view }: { view: WizardView }) => {
  const { addons } = view;
  const { picker } = addons;

  return (
    <>
      <div className={styles.intro}>
        Extras clients can add when they book. Price and time are added on top.
      </div>
      <div>
        <div className={styles.addonHead}>
          <div className={styles.addonTitle}>Add-ons</div>
          <button className={styles.newButton} onClick={addons.toggleNew}>
            <Plus className={styles.block} size={14} strokeWidth={2.2} />
            New
          </button>
        </div>
        <label className={styles.searchField}>
          <Search
            className={styles.noShrink}
            size={16}
            strokeWidth={1.7}
            color="var(--text-secondary)"
          />
          <input
            className={styles.searchInput}
            value={picker.query}
            onChange={picker.onQuery}
            placeholder="Search add-ons"
            aria-label="Search add-ons"
          />
        </label>
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
              <span className={styles.groupName}>{category}</span>
              <span className={styles.groupCount}>{count}</span>
            </div>
            <div className={styles.stack6}>
              {items.map((item) => (
                <button
                  key={item.key}
                  className={styles.addonPick}
                  onClick={item.pick}
                  aria-pressed={item.isOn ? "true" : "false"}
                >
                  <span className={styles.grow}>
                    <span className={styles.addonPickName}>{item.name}</span>
                    <span className={styles.addonPickMeta}>{item.meta}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {picker.isEmpty && (
          <div className={styles.nothingLeft}>
            Nothing left to add here. Try another category, or use New to create
            one.
          </div>
        )}
      </div>
      <div className={styles.addedTitle}>Added to this service</div>
      {!addons.selected.length && (
        <div className={styles.noneAdded}>
          No add-ons on this service yet. Select one above and it will appear
          here.
        </div>
      )}
      {addons.selected.map((item) => (
        <div key={item.key} className={styles.attached}>
          <div className={styles.attachedRow}>
            <button className={styles.attachedOpen} onClick={item.toggle}>
              <ChevronRight
                className={joinClassNames(
                  styles.chevron,
                  item.isOpen && styles.chevronOpen,
                )}
                size={14}
                strokeWidth={2}
                color="var(--text-secondary)"
              />
              <span className={styles.grow}>
                <span className={styles.attachedName}>{item.name}</span>
                <span className={styles.addonPickMeta}>{item.meta}</span>
              </span>
            </button>
            <button
              className={styles.remove}
              onClick={item.remove}
              aria-label="Remove add-on"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
          {item.isOpen && (
            <div className={styles.overrides}>
              <div className={styles.overridesLabel}>Overrides</div>
              <div className={styles.inline5}>
                <span className={styles.muted135}>+£</span>
                <input
                  className={styles.ovPrice}
                  value={item.price}
                  onChange={item.setPrice}
                  inputMode="decimal"
                  placeholder={item.pricePlaceholder}
                />
                <span className={styles.ovPlus}>+</span>
                <input
                  className={styles.ovTime}
                  value={item.hours}
                  onChange={item.setHours}
                  inputMode="numeric"
                  placeholder={item.hoursPlaceholder}
                />
                <span className={styles.unit}>hr</span>
                <input
                  className={styles.ovTime}
                  value={item.minutes}
                  onChange={item.setMinutes}
                  inputMode="numeric"
                  placeholder={item.minutesPlaceholder}
                />
                <span className={styles.unit}>min</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

/** The service wizard's body. */
export const WizardSheet = ({ view }: { view: WizardView }) => (
  <>
    {view.isAdd && (
      <>
        <div className={styles.dots}>
          {view.dots.map(({ key, isOn }) => (
            <span
              key={key}
              className={joinClassNames(styles.dot, isOn && styles.dotOn)}
            ></span>
          ))}
        </div>
        <div className={styles.stepLabel}>
          {view.stepLabel}
          <span className={styles.stepName}>{view.stepName}</span>
        </div>
      </>
    )}
    {view.isEdit && (
      <div className={styles.tabs}>
        {view.tabs.map(({ key, label, isOn, pick }) => (
          <button
            key={key}
            className={joinClassNames(styles.tab, isOn && styles.tabOn)}
            onClick={pick}
          >
            {label}
          </button>
        ))}
      </div>
    )}
    {view.isStep2 && <DetailsStep view={view} />}
    {view.isPricing && <PricingStep view={view} />}
    {view.isReview && <ReviewStep view={view} />}
    {view.isStep4 && <AddonsStep view={view} />}
  </>
);

/** Back / Continue / Add service / Save service. */
export const WizardFooter = ({ view }: { view: WizardView }) => (
  <div className={styles.footer}>
    <div className={styles.footerRow}>
      {view.canBack && (
        <button className={styles.back} onClick={view.back}>
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
  </div>
);
