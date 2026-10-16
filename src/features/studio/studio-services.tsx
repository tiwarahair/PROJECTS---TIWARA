import type { CSSProperties } from "react";
import {
  EllipsisVertical,
  ListFilter,
  Plus,
  Search,
  TextAlignStart,
  X,
} from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { getServicesView } from "./services-view";
import type { ListGroup, ServicesView } from "./services-view";
import type { StudioController } from "./use-studio";
import styles from "../../styles/features/studio/studio-services.module.css";

const asStyle = (values: Record<string, string | null | undefined>) =>
  values as CSSProperties;

const StatusMenu = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: ServicesView;
}) => {
  const toggle = () =>
    studio.setState({ serviceStatusOpen: !studio.state.serviceStatusOpen });

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={styles.menuScrim} onClick={toggle}></div>
      <div className={styles.statusMenu}>
        {view.statusFilters.map(({ key, label, isOn, pick }) => (
          <button
            key={key}
            className={joinClassNames(
              styles.statusItem,
              isOn && styles.statusItemOn,
            )}
            onClick={pick}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
};

const Empty = ({ title, body }: { title: string; body: string }) => (
  <div className={styles.empty}>
    <div className={styles.emptyTitle}>{title}</div>
    <div className={styles.emptyBody}>{body}</div>
  </div>
);

const Groups = ({
  groups,
  isAddons,
}: {
  groups: ListGroup[];
  isAddons: boolean;
}) =>
  groups.map(({ key, category, count, tone, hasMenu, menu, items }) => (
    <div key={key} className={styles.group}>
      <div className={styles.groupHead}>
        <span className={styles.groupTitle}>
          <span
            className={styles.groupDot}
            style={asStyle({ "--dot": tone })}
            aria-hidden="true"
          ></span>
          <span className={styles.groupName}>{category}</span>
        </span>
        <span className={styles.groupEnd}>
          <span className={styles.groupCount}>{count}</span>
          {hasMenu && (
            <button
              className={styles.groupMenu}
              onClick={menu}
              aria-label="Category options"
            >
              <EllipsisVertical size={17} strokeWidth={2} />
            </button>
          )}
        </span>
      </div>
      <div>
        {items.map((item) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div key={item.key} className={styles.row} onClick={item.open}>
            {/* runtime: the category's colour */}
            <span
              className={styles.rail}
              style={asStyle({ "--rail": item.rail })}
              aria-hidden="true"
            ></span>
            {isAddons ? (
              <span className={styles.addonMain}>
                <span
                  className={joinClassNames(
                    styles.name,
                    item.isArchived && styles.nameArchived,
                  )}
                >
                  {item.name}
                </span>
                {item.isArchived && (
                  <span className={styles.archived}>Archived</span>
                )}
              </span>
            ) : (
              <span className={styles.rowMain}>
                <span className={styles.nameRow}>
                  <span
                    className={joinClassNames(
                      styles.name,
                      item.isArchived && styles.nameArchived,
                    )}
                  >
                    {item.name}
                  </span>
                  {item.isArchived && (
                    <span className={styles.archived}>Archived</span>
                  )}
                  {item.isDraft && <span className={styles.draft}>Draft</span>}
                </span>
                <span className={styles.metaRow}>
                  <span>{item.duration}</span>
                  {item.extraLabel && (
                    <span className={styles.extra}>{item.extraLabel}</span>
                  )}
                </span>
                {item.isDraft && (
                  <span className={styles.finishHolder}>
                    <button className={styles.finish} onClick={item.finish}>
                      Finish setting up
                    </button>
                  </span>
                )}
              </span>
            )}
            <span className={styles.rowEnd}>
              {isAddons ? (
                <span className={styles.addonMeta}>{item.meta}</span>
              ) : (
                <span
                  className={joinClassNames(
                    styles.price,
                    item.isArchived && styles.priceArchived,
                  )}
                >
                  {item.priceLabel}
                </span>
              )}
              {item.isArchived && (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                <span className={styles.restore} onClick={item.restore}>
                  Restore
                </span>
              )}
              {!item.isArchived && (
                <button
                  className={styles.rowMenu}
                  onClick={item.menu}
                  aria-label={isAddons ? "Add-on options" : "Service options"}
                >
                  <EllipsisVertical size={17} strokeWidth={2} />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  ));

/** Studio → Services and Add-ons. */
export const StudioServices = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, isDesktop, serviceActions } = studio;
  const view = getServicesView(studio);

  const toggleStatus = () =>
    setState({ serviceStatusOpen: !state.serviceStatusOpen });

  return (
    <div
      className={joinClassNames(
        styles.services,
        isWide && styles.wide,
        isDesktop && styles.desk,
      )}
      data-screen-label="Services"
    >
      <div className={styles.header}>
        <div className={styles.headRow}>
          <div className={styles.tabs}>
            {[
              { id: "services", label: "Services" },
              { id: "addons", label: "Add-ons" },
            ].map(({ id, label }) => (
              <button
                key={id}
                className={joinClassNames(
                  styles.tab,
                  view.isAddons === (id === "addons") && styles.tabOn,
                )}
                onClick={() => setState({ servicesTab: id })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.search}>
            <Search
              className={styles.searchIcon}
              size={15}
              strokeWidth={2}
              color="var(--text-secondary)"
            />
            <input
              className={joinClassNames(
                styles.searchInput,
                view.hasQuery && styles.searchInputFilled,
              )}
              value={state.serviceQuery || ""}
              onChange={(event) =>
                setState({ serviceQuery: event.target.value })
              }
              placeholder={view.isAddons ? "Search add-ons" : "Search services"}
            />
            {view.hasQuery && (
              <button
                className={styles.clearSearch}
                onClick={() => setState({ serviceQuery: "" })}
                aria-label="Clear search"
              >
                <X size={13} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <div className={styles.statusHolder}>
            <button
              className={joinClassNames(
                styles.statusButton,
                state.serviceStatusOpen && styles.statusOpen,
              )}
              onClick={toggleStatus}
              aria-label="Filter by status"
            >
              <ListFilter size={15} strokeWidth={1.8} />
              {view.statusLabel}
            </button>
            {state.serviceStatusOpen && (
              <StatusMenu studio={studio} view={view} />
            )}
          </div>
          <button className={styles.addButton} onClick={view.add}>
            <Plus size={14} strokeWidth={2.2} />
            {view.addLabel}
          </button>
        </div>
        <div className={styles.chipRow}>
          <div className={styles.chipScroll}>
            {view.categories.map(
              ({ key, chipLabel, count, dot, isOn, pick }) => (
                <button
                  key={key}
                  className={joinClassNames(styles.chip, isOn && styles.chipOn)}
                  onClick={pick}
                  aria-pressed={isOn ? "true" : "false"}
                >
                  {dot && (
                    <span
                      className={styles.chipDot}
                      style={asStyle({ "--dot": dot })}
                      aria-hidden="true"
                    ></span>
                  )}
                  {chipLabel}
                  <span className={styles.chipCount}>{count}</span>
                </button>
              ),
            )}
            <button
              className={styles.manageChip}
              onClick={serviceActions.openCategories}
            >
              Manage categories
            </button>
          </div>
          {!isWide && (
            <div className={styles.chipStatus}>
              <button
                className={joinClassNames(
                  styles.chipStatusButton,
                  state.serviceStatusOpen && styles.statusOpen,
                )}
                onClick={toggleStatus}
                aria-label="Filter by status"
              >
                <ListFilter size={14} strokeWidth={1.8} />
                {view.statusShort}
              </button>
              {state.serviceStatusOpen && (
                <StatusMenu studio={studio} view={view} />
              )}
            </div>
          )}
        </div>
      </div>
      <div className={styles.body}>
        {isDesktop && (
          <aside className={styles.categories} data-screen-label="Categories">
            <div className={styles.categoriesLabel}>Categories</div>
            <div className={styles.categoryList}>
              {view.categories.map(({ key, label, count, dot, isOn, pick }) => (
                <button
                  key={key}
                  className={joinClassNames(
                    styles.categoryRow,
                    isOn && styles.categoryRowOn,
                  )}
                  onClick={pick}
                >
                  {dot && (
                    <span
                      className={styles.categoryDot}
                      style={asStyle({ "--dot": dot })}
                      aria-hidden="true"
                    ></span>
                  )}
                  <span className={styles.categoryName}>{label}</span>
                  <span className={styles.categoryCount}>{count}</span>
                </button>
              ))}
            </div>
            <button
              className={styles.manageRow}
              onClick={serviceActions.openCategories}
            >
              <TextAlignStart size={16} strokeWidth={1.7} />
              Manage categories
            </button>
          </aside>
        )}
        <div className={styles.grow}>
          {!view.isAddons && (
            <>
              {view.isServiceResultsEmpty && (
                <Empty
                  title="Nothing matches"
                  body="Try a different search or clear the filter."
                />
              )}
              <Groups groups={view.serviceGroups} isAddons={false} />
            </>
          )}
          {view.isAddons && (
            <>
              {view.isAddonResultsEmpty && (
                <Empty
                  title="Nothing matches"
                  body="Try a different search or clear the filter."
                />
              )}
              {view.isAddonsEmpty && (
                <Empty
                  title="No add-ons yet"
                  body="Add-ons are extras clients can pick at booking, like beads or a wash."
                />
              )}
              <Groups groups={view.addonGroups} isAddons={true} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
