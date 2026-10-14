import type { CSSProperties } from "react";
import {
  ArrowDownWideNarrow,
  Camera,
  ChevronDown,
  ChevronLeft,
  Ellipsis,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { getClientsView } from "./clients-view";
import type { ClientsView } from "./clients-view";
import type { StudioController } from "./use-studio";
import styles from "../../styles/features/studio/studio-clients.module.css";

const asStyle = (values: Record<string, string | null | undefined>) =>
  values as CSSProperties;

const NameBadges = ({
  hasSensitivities,
  isBlocked,
}: {
  hasSensitivities: boolean;
  isBlocked: boolean;
}) => (
  <>
    {hasSensitivities && (
      <span className={styles.sens} title="Has an allergy or sensitivity">
        <TriangleAlert size={14} strokeWidth={1.5} />
      </span>
    )}
    {isBlocked && <span className={styles.blocked}>Blocked</span>}
  </>
);

/** The client's profile: the narrow Clients page, or the wide "Client" sheet. */
export const ClientProfile = ({
  view,
  variant,
}: {
  view: ClientsView;
  variant: "page" | "sheet";
}) => {
  const { profile } = view;

  if (!profile) return null;

  const isSheet = variant === "sheet";
  const card = isSheet ? styles.sheetCard : styles.card;

  const nextCard = joinClassNames(
    card,
    isSheet ? styles.sheetCardNext : styles.cardNext,
  );

  return (
    <>
      <section className={card}>
        <div className={styles.head}>
          <label className={styles.photo} title="Change photo">
            {profile.img ? (
              <img className={styles.avatar64} src={profile.img} alt="" />
            ) : (
              <span className={styles.initials64}>{profile.initials}</span>
            )}
            <span className={styles.photoHover} aria-hidden="true">
              <Camera size={20} strokeWidth={2} />
            </span>
            <span className={styles.photoBadge} aria-hidden="true">
              <Camera size={13} strokeWidth={1.5} />
            </span>
            <input
              className={styles.fileInput}
              type="file"
              accept="image/*"
              onChange={view.onPhoto}
              aria-label="Upload a photo"
            />
          </label>
          <div className={styles.grow}>
            <div className={styles.titleRow}>
              <h2 className={styles.h2}>{profile.name}</h2>
              {profile.isBlocked && (
                <span className={styles.blocked}>Blocked</span>
              )}
            </div>
            <div className={styles.sub}>{profile.subtitle}</div>
            <div className={styles.subPlain}>{profile.lastVisit}</div>
          </div>
        </div>
        {profile.contacts.length > 0 && (
          <div className={styles.contacts}>
            {profile.contacts.map(({ key, label, value, contactActions }) => (
              <div key={key} className={styles.contactRow}>
                <div className={styles.grow}>
                  <div className={styles.label}>{label}</div>
                  <div className={styles.value}>{value}</div>
                </div>
                {contactActions.map(
                  ({
                    key: actionKey,
                    label: actionLabel,
                    href,
                    icon: ActionIcon,
                  }) => (
                    <a
                      key={actionKey}
                      className={styles.contactAction}
                      href={href}
                      aria-label={actionLabel}
                      title={actionLabel}
                    >
                      <ActionIcon size={16} strokeWidth={1.7} />
                    </a>
                  ),
                )}
              </div>
            ))}
          </div>
        )}
        {profile.isBlocked && (
          <div className={styles.blockedNote}>
            <div className={styles.blockedText}>
              {`${profile.first} can't book online. You can still book them yourself.`}
            </div>
            {/* unblocking isn't wired up yet, so the button does nothing */}
            <button className={styles.textButton}>Unblock</button>
          </div>
        )}
        <div className={styles.actions}>
          <button className={styles.book} onClick={view.bookSelected}>
            {`Book ${profile.first}`}
          </button>
          <button className={styles.edit} onClick={view.editSelected}>
            Edit
          </button>
          <button
            className={styles.more}
            onClick={view.moreSelected}
            aria-label="More actions"
          >
            <Ellipsis size={18} />
          </button>
        </div>
      </section>
      {!!profile.sensitivities && (
        <div className={styles.sensBox}>
          <TriangleAlert
            className={styles.sensIcon}
            size={18}
            strokeWidth={1.7}
            color="#b5541f"
          />
          <div className={styles.grow}>
            <div className={styles.sensLabel}>Allergy or sensitivity</div>
            <div className={styles.sensText}>{profile.sensitivities}</div>
          </div>
          <button className={styles.sensEdit} onClick={view.editSelected}>
            Edit
          </button>
        </div>
      )}
      <section className={nextCard}>
        <div className={styles.sectionHead}>
          <div className={styles.h3}>Hair notes</div>
          <button className={styles.inlineLink} onClick={view.editSelected}>
            {profile.hairActionLabel}
          </button>
        </div>
        <div className={styles.private}>
          Private to you. Applies to every appointment.
        </div>
        {profile.products ? (
          <div className={styles.products}>{profile.products}</div>
        ) : (
          <div className={styles.noNotes}>
            {`Add anything to remember about ${profile.first}'s hair.`}
          </div>
        )}
        {!profile.sensitivities && (
          <button className={styles.addSens} onClick={view.editSelected}>
            Add allergy or sensitivity
          </button>
        )}
      </section>
      <section className={nextCard}>
        <div className={styles.h3}>Reliability</div>
        <div className={styles.tiles}>
          <div className={styles.tile}>
            <div
              className={joinClassNames(
                styles.tileValue,
                profile.hasNoShows && styles.tileValueWarn,
              )}
            >
              {profile.noShows}
            </div>
            <div className={styles.tileLabel}>No-shows</div>
          </div>
          <div className={styles.tile}>
            <div
              className={joinClassNames(
                styles.tileValue,
                profile.hasLateCancel && styles.tileValueWarn,
              )}
            >
              {profile.lateCancel}
            </div>
            <div className={styles.tileLabel}>Late cancellations</div>
          </div>
        </div>
      </section>
      <section className={nextCard}>
        <div className={styles.apptHead}>
          <div className={styles.h3}>Appointments</div>
          <div className={styles.segs}>
            {profile.appointmentTabs.map(({ key, label, isOn, onSelect }) => (
              <button
                key={key}
                className={joinClassNames(styles.seg, isOn && styles.segOn)}
                onClick={onSelect}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.appts}>
          {profile.appointments.map(
            ({
              key,
              service,
              when,
              price,
              isStruck,
              status,
              statusBackground,
              statusForeground,
              open,
            }) => (
              <button key={key} className={styles.appt} onClick={open}>
                <span className={styles.grow}>
                  <span className={styles.apptSvc}>{service}</span>
                  <span className={styles.apptWhen}>{when}</span>
                </span>
                <span className={styles.apptEnd}>
                  <span
                    className={joinClassNames(
                      styles.apptPrice,
                      isStruck && styles.apptPriceStruck,
                    )}
                  >
                    {price}
                  </span>
                  <span
                    className={styles.apptStatus}
                    style={asStyle({
                      "--st-bg": statusBackground,
                      "--st-fg": statusForeground,
                    })}
                  >
                    {status}
                  </span>
                </span>
              </button>
            ),
          )}
          {profile.appointments.length === 0 && (
            <div className={styles.apptEmpty}>
              {profile.appointmentsEmptyMessage}
            </div>
          )}
        </div>
      </section>
      <section className={nextCard}>
        <div className={styles.h3}>Money</div>
        <div className={styles.tiles}>
          {profile.money.map(({ key, label, value }) => (
            <div key={key} className={styles.tile}>
              <div className={styles.moneyValue}>{value}</div>
              <div className={styles.tileLabel}>{label}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export const StudioClients = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, isDesktop } = studio;
  const view = getClientsView(studio);

  return (
    <div
      className={joinClassNames(
        styles.clients,
        isWide && styles.wide,
        isDesktop && styles.desk,
      )}
      data-screen-label="Clients"
    >
      {view.isList && (
        <div className={styles.list}>
          {!isWide && (
            <button
              className={styles.back}
              onClick={() => setState({ tab: "settings" })}
            >
              <ChevronLeft size={18} strokeWidth={1.7} />
              More
            </button>
          )}
          <div className={styles.controls}>
            <label className={styles.search}>
              <Search className={styles.noShrink} size={15} strokeWidth={1.5} />
              <input
                className={styles.searchInput}
                value={state.clientListQuery}
                onChange={(event) =>
                  setState({ clientListQuery: event.target.value })
                }
                placeholder="Search"
                aria-label="Search clients by name, phone or email"
              />
              {!!state.clientListQuery && (
                <button
                  className={styles.clearSearch}
                  onClick={() => setState({ clientListQuery: "" })}
                  aria-label="Clear search"
                >
                  <X size={15} strokeWidth={1.7} />
                </button>
              )}
            </label>
            <label className={styles.sort}>
              <ArrowDownWideNarrow size={15} strokeWidth={1.5} />
              <select
                className={styles.sortSelect}
                value={state.clientSort}
                onChange={(event) =>
                  setState({ clientSort: event.target.value })
                }
                aria-label="Sort clients"
              >
                <option value="next">Next booking</option>
                <option value="last">Last visit</option>
                <option value="visits">Most visits</option>
                <option value="az">A–Z</option>
              </select>
              <ChevronDown
                className={styles.sortChevron}
                size={14}
                strokeWidth={1.7}
              />
            </label>
            <button className={styles.addClient} onClick={view.addClient}>
              <Plus size={14} strokeWidth={2.2} />
              Add client
            </button>
          </div>
          <div className={styles.filters}>
            {view.filters.map(({ key, label, count, isOn, onSelect }) => (
              <button
                key={key}
                className={joinClassNames(
                  styles.filter,
                  isOn && styles.filterOn,
                )}
                onClick={onSelect}
              >
                {label}
                <span className={styles.filterCount}>{count}</span>
              </button>
            ))}
          </div>
          {view.clientRows.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>{view.emptyTitle}</div>
              <div className={styles.emptyBody}>{view.emptyBody}</div>
              <button className={styles.emptyAction} onClick={view.emptyGo}>
                {view.emptyAction}
              </button>
            </div>
          )}
          {view.clientRows.length > 0 && (
            <div className={styles.rows}>
              {view.isTable && (
                <>
                  <div className={styles.tableHead}>
                    <span>Client</span>
                    <span>Last visit</span>
                    <span>Next booking</span>
                    <span className={styles.nowrapRight}>
                      Upcoming appointments
                    </span>
                    <span className={styles.right}>Spend</span>
                  </div>
                  {view.clientRows.map((row) => (
                    <button
                      key={row.key}
                      className={styles.tableRow}
                      style={asStyle({ "--delay": row.delay })}
                      onClick={row.open}
                    >
                      <span className={styles.clientCell}>
                        {row.img ? (
                          <img
                            className={styles.avatar40}
                            src={row.img}
                            alt=""
                          />
                        ) : (
                          <span className={styles.initials40}>
                            {row.initials}
                          </span>
                        )}
                        <span className={styles.nameStack}>
                          <span className={styles.nameLine}>
                            <span className={styles.name}>{row.name}</span>
                            <NameBadges
                              hasSensitivities={row.hasSensitivities}
                              isBlocked={row.isBlocked}
                            />
                          </span>
                          <span className={styles.contact}>{row.contact}</span>
                        </span>
                      </span>
                      <span className={styles.cell}>{row.last}</span>
                      <span
                        className={joinClassNames(
                          styles.nextCell,
                          row.hasNext && styles.hasNext,
                        )}
                      >
                        {row.next}
                      </span>
                      <span
                        className={joinClassNames(
                          styles.upCell,
                          row.hasNext && styles.hasNext,
                        )}
                      >
                        {row.upcomingCount}
                      </span>
                      <span className={styles.spendCell}>{row.spend}</span>
                    </button>
                  ))}
                </>
              )}
              {!view.isTable &&
                view.clientRows.map((row) => (
                  <button
                    key={row.key}
                    className={styles.cardRow}
                    style={asStyle({ "--delay": row.delay })}
                    onClick={row.open}
                  >
                    {row.img ? (
                      <img className={styles.avatar44} src={row.img} alt="" />
                    ) : (
                      <span className={styles.initials44}>{row.initials}</span>
                    )}
                    <span className={styles.cardMain}>
                      <span className={styles.nameLine}>
                        <span className={styles.name}>{row.name}</span>
                        <NameBadges
                          hasSensitivities={row.hasSensitivities}
                          isBlocked={row.isBlocked}
                        />
                      </span>
                      <span className={styles.contact}>{row.contact}</span>
                      <span className={styles.contact}>{row.meta}</span>
                    </span>
                    <span className={styles.cardEnd}>
                      <span className={styles.cardSpend}>{row.spend}</span>
                      <span
                        className={joinClassNames(
                          styles.noShows,
                          row.noShows > 0 && styles.noShowsSome,
                        )}
                      >
                        {row.noShowLabel}
                      </span>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
      {view.isProfile && (
        <div className={styles.profilePage}>
          <button
            className={joinClassNames(styles.back, styles.backProfile)}
            onClick={() => setState({ selectedClientId: null })}
          >
            <ChevronLeft size={18} strokeWidth={1.7} />
            Clients
          </button>
          <ClientProfile view={view} variant="page" />
        </div>
      )}
    </div>
  );
};

export { getClientsView };
