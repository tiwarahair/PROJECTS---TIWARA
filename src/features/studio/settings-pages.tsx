import { useRef } from "react";
import type { CSSProperties } from "react";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import type { SettingsView } from "./settings-view";
import { TIMES } from "./studio-data";
import { getAvatarSrc } from "./studio-shell";
import type { StudioController } from "./use-studio";
import styles from "./settings-pages.module.css";

const PlusIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14"></path>
  </svg>
);

/** Settings → Your profile. */
export const ProfilePage = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: SettingsView;
}) => {
  const { state } = studio;
  const { profile } = state;
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const portInput = useRef<HTMLInputElement>(null);

  const field = (
    label: string,
    value: string | undefined,
    onChange: (value: string) => void,
    extra = {},
  ) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        className={styles.input}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        {...extra}
      />
    </label>
  );

  return (
    <div className={styles.profile} data-screen-label="Edit profile">
      <div className={styles.cover}>
        <img
          className={styles.coverImage}
          src={state.coverUrl || getAssetUrl("img/reveal.jpg")}
          alt="Cover"
        />
        <input
          className={styles.hiddenInput}
          type="file"
          accept="image/*"
          ref={coverInput}
          onChange={view.onCoverFile}
        />
        <button
          className={styles.changeCover}
          onClick={() => coverInput.current?.click()}
        >
          Change cover
        </button>
        <input
          className={styles.hiddenInput}
          type="file"
          accept="image/*"
          ref={avatarInput}
          onChange={view.onAvatarFile}
        />
        <button
          className={styles.avatarButton}
          onClick={() => avatarInput.current?.click()}
          aria-label="Change profile photo"
        >
          <img
            className={styles.avatar}
            src={getAvatarSrc(state)}
            alt="Profile"
          />
          <span className={styles.camera}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </span>
        </button>
      </div>
      <div className={styles.fields}>
        {field("Salon name", profile.salon, (salon) =>
          view.setProfile({ salon }),
        )}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>About</span>
          <textarea
            className={styles.textarea}
            value={profile.about}
            onChange={(event) => view.setProfile({ about: event.target.value })}
            rows={3}
          ></textarea>
        </label>
        <div className={styles.twoCols}>
          {field("Instagram", profile.instagram, (instagram) =>
            view.setProfile({ instagram }),
          )}
          {field("TikTok", profile.tiktok, (tiktok) =>
            view.setProfile({ tiktok }),
          )}
        </div>
        {field("Email", profile.email, (email) => view.setProfile({ email }))}
        {field("Website", profile.site, (site) => view.setProfile({ site }), {
          type: "url",
          inputMode: "url",
          placeholder: "tiwarashouse.co.uk",
          autoComplete: "url",
        })}
        {field(
          "YouTube",
          profile.youtube,
          (youtube) => view.setProfile({ youtube }),
          {
            type: "url",
            inputMode: "url",
            placeholder: "Channel link",
          },
        )}
        <div className={styles.portfolio}>
          <div className={styles.portfolioHead}>
            <span className={styles.title15}>Portfolio</span>
            <span className={styles.muted}>{view.portCount}</span>
          </div>
          <div className={styles.mutedTop}>
            Up to twenty photos of your work, shown on your public profile.
          </div>
          <input
            className={styles.hiddenInput}
            type="file"
            accept="image/*"
            multiple={true}
            ref={portInput}
            onChange={view.onPortFiles}
          />
          <div className={styles.photos}>
            {view.portfolio.map(({ key, src, remove }) => (
              <div key={key} className={styles.photo}>
                <img
                  className={styles.photoImage}
                  src={src}
                  alt="Portfolio photo"
                />
                <button
                  className={styles.removePhoto}
                  onClick={remove}
                  aria-label="Remove photo"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            ))}
            {view.canAddPhotos && (
              <button
                className={styles.addPhotos}
                onClick={() => portInput.current?.click()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14"></path>
                </svg>
                Add photos
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Settings → Availability: pause, working hours, blocked time and closed periods. */
export const AvailabilityPage = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: SettingsView;
}) => {
  const { pause } = view;

  return (
    <div className={styles.availability} data-screen-label="Availability">
      <div
        className={styles.pauseCard}
        data-screen-label="Pause online bookings"
      >
        <div className={styles.row12}>
          <div className={styles.grow}>
            <div className={styles.title15}>Pause online bookings</div>
            <div className={styles.hint}>
              You can still add bookings yourself. Existing bookings and sent
              payment links aren’t affected.
            </div>
          </div>
          <button
            className={styles.switchHit}
            onClick={view.togglePause}
            role="switch"
            aria-checked={pause.on ? "true" : "false"}
            aria-label="Pause online bookings"
          >
            <span
              className={joinClassNames(
                styles.switchTrack,
                pause.on && styles.switchTrackOn,
              )}
            >
              <span className={styles.switchKnob}></span>
            </span>
          </button>
        </div>
        {pause.on && (
          <div className={styles.pausePanel}>
            <div className={styles.untilRow}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Until <span className={styles.optional}>(optional)</span>
                </span>
                <input
                  className={styles.dateInput}
                  type="date"
                  value={pause.until}
                  onChange={view.onPauseUntil}
                />
              </label>
              {!!pause.until && (
                <button
                  className={styles.clearDate}
                  onClick={view.clearPauseUntil}
                >
                  Clear date
                </button>
              )}
            </div>
            <div className={styles.pauseBanner} role="status">
              <svg
                className={styles.bannerIcon}
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 15V9M14 15V9M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"></path>
              </svg>
              {view.pauseBanner}
            </div>
            <div className={styles.seeLabel}>What clients see</div>
            <div className={styles.preview} aria-hidden="true">
              <div className={styles.previewMain}>
                <div className={styles.previewSalon}>
                  {studio.state.profile.salon}
                </div>
                <div className={styles.notTaking}>
                  Not taking online bookings right now
                </div>
              </div>
              <span className={styles.previewBook}>Book</span>
            </div>
          </div>
        )}
      </div>
      <div className={styles.sectionHead}>
        <div className={styles.grow}>
          <div className={styles.title15}>Working hours</div>
          <div className={styles.mutedTop}>
            Clients can only book inside these hours.
          </div>
        </div>
      </div>
      <div className={styles.list}>
        {view.hourRows.map(
          ({ key, day, on, start, end, toggle, setStart, setEnd }) => (
            <div key={key} className={styles.hourRow}>
              <button
                className={joinClassNames(
                  styles.daySwitch,
                  on && styles.daySwitchOn,
                )}
                onClick={toggle}
                aria-label="Toggle day"
              >
                <span className={styles.dayKnob}></span>
              </button>
              <div
                className={joinClassNames(
                  styles.dayName,
                  on && styles.dayNameOn,
                )}
              >
                {day}
              </div>
              {on && (
                <>
                  <select
                    className={styles.timeSelect}
                    defaultValue={start}
                    onChange={setStart}
                  >
                    {TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <span className={styles.to}>to</span>
                  <select
                    className={styles.timeSelect}
                    defaultValue={end}
                    onChange={setEnd}
                  >
                    {TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {!on && <span className={styles.closed}>Closed</span>}
            </div>
          ),
        )}
      </div>
      <div className={styles.sectionHeadSpaced}>
        <div className={styles.grow}>
          <div className={styles.title15}>Blocked time</div>
          <div className={styles.mutedTop}>
            Breaks and personal time. Your working hours stay the same.
          </div>
        </div>
        <button className={styles.add} onClick={view.openBlock}>
          <PlusIcon />
          Add
        </button>
      </div>
      {view.blockedList.length === 0 && (
        <div className={styles.closed}>Nothing blocked yet.</div>
      )}
      <div className={styles.list}>
        {view.blockedList.map(
          ({ key, day, span, reason, hex, edit, remove }) => (
            <div key={key} className={styles.itemRow}>
              {/* runtime: the blocked time's colour */}
              <span
                className={styles.dot}
                style={{ "--dot": hex } as CSSProperties}
              ></span>
              <div className={styles.flex1}>
                <div className={styles.itemTitle}>{`${day} · ${span}`}</div>
                <div className={styles.muted}>{reason}</div>
              </div>
              <button className={styles.edit} onClick={edit}>
                Edit
              </button>
              <button className={styles.remove} onClick={remove}>
                Remove
              </button>
            </div>
          ),
        )}
      </div>
      <div className={styles.sectionHeadSpaced}>
        <div className={styles.grow}>
          <div className={styles.title15}>Closed periods</div>
          <div className={styles.mutedTop}>
            Holidays and time off. Online booking closes for the whole range.
          </div>
        </div>
        <button className={styles.add} onClick={view.openClosed}>
          <PlusIcon />
          Add
        </button>
      </div>
      {view.closedList.length === 0 && (
        <div className={styles.closed}>No closed periods yet.</div>
      )}
      <div className={styles.list}>
        {view.closedList.map(({ key, span, reason, edit, remove }) => (
          <div key={key} className={styles.itemRow}>
            <div className={styles.flex1}>
              <div className={styles.itemTitle}>{span}</div>
              <div className={styles.muted}>{reason}</div>
            </div>
            <button className={styles.edit} onClick={edit}>
              Edit
            </button>
            <button className={styles.remove} onClick={remove}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const StepIcon = ({ isPlus }: { isPlus: boolean }) => (
  <svg
    className={styles.blockSvg}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d={isPlus ? "M12 5v14M5 12h14" : "M5 12h14"}></path>
  </svg>
);

/** Settings → Booking rules: booking window, default extra time, travel buffer. */
export const RulesPage = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: SettingsView;
}) => {
  const { rules, profile } = studio.state;

  return (
    <div className={styles.rules} data-screen-label="Booking rules">
      <div className={styles.panel}>
        <div className={styles.title15}>Booking window</div>
        <div className={styles.mutedTop}>When clients are allowed to book.</div>
        <div className={styles.windowNote}>
          Clients can book from{" "}
          <strong className={styles.strong}>{view.rulesMaxLabel}</strong> ahead
          until <strong className={styles.strong}>{view.rulesMinLabel}</strong>{" "}
          an appointment starts.
        </div>
        <div className={styles.ruleRow}>
          <div className={styles.grow}>
            <div className={styles.title15}>Book up to</div>
            <div className={styles.ruleHint}>How far into the future</div>
          </div>
          <select
            className={styles.ruleSelect}
            value={String(rules.maxNotice)}
            onChange={view.onRulesMax}
            aria-label="Maximum notice"
          >
            {view.rulesMaxOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.ruleRowLast}>
          <div className={styles.grow}>
            <div className={styles.title15}>Minimum notice</div>
            <div className={styles.ruleHint}>
              Protects you from surprise bookings
            </div>
          </div>
          <select
            className={styles.ruleSelect}
            value={String(rules.minNotice * 60)}
            onChange={view.onRulesMin}
            aria-label="Minimum notice"
          >
            {view.rulesMinOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={joinClassNames(styles.panel, styles.panelNext)}>
        <div className={styles.title15}>Default extra time after services</div>
        <div className={styles.hint}>
          Extra time that adds on to every service (example uses: clean-down and
          resetting your station). You can still change it per service.
        </div>
        <div className={styles.stepper}>
          <button
            className={joinClassNames(
              styles.stepButton,
              rules.extra <= 0 && styles.stepButtonOff,
            )}
            onClick={view.rulesExtraDown}
            aria-label="Less extra time"
          >
            <StepIcon isPlus={false} />
          </button>
          <div className={styles.stepValue}>{view.rulesExtra}</div>
          <button
            className={joinClassNames(
              styles.stepButton,
              rules.extra >= 30 && styles.stepButtonOff,
            )}
            onClick={view.rulesExtraUp}
            aria-label="More extra time"
          >
            <StepIcon isPlus={true} />
          </button>
        </div>
      </div>
      {profile.mobile && (
        <div
          className={joinClassNames(
            styles.panel,
            styles.panelNext,
            styles.panelIn,
          )}
        >
          <div className={styles.title15}>Travel buffer</div>
          <div className={styles.hint}>
            Time to get to your next client. Added after every booking, on top
            of any extra time.
          </div>
          <div className={styles.stepper}>
            <button
              className={joinClassNames(
                styles.stepButton,
                rules.travel <= 0 && styles.stepButtonOff,
              )}
              onClick={view.rulesTravelDown}
              aria-label="Less travel time"
            >
              <StepIcon isPlus={false} />
            </button>
            <div className={styles.stepValue}>{view.rulesTravel}</div>
            <button
              className={joinClassNames(
                styles.stepButton,
                rules.travel >= 120 && styles.stepButtonOff,
              )}
              onClick={view.rulesTravelUp}
              aria-label="More travel time"
            >
              <StepIcon isPlus={true} />
            </button>
          </div>
        </div>
      )}
      {!profile.mobile && (
        <div className={styles.travelOff}>
          <div className={styles.grow}>
            <div className={styles.travelTitle}>Travel buffer</div>
            <div className={styles.hint}>
              Only for stylists who travel to clients. Set your business type to
              Mobile in Business details to set one.
            </div>
          </div>
          <button
            className={styles.travelButton}
            onClick={() => studio.actions.openSubpage("business")}
          >
            Business details
          </button>
        </div>
      )}
    </div>
  );
};
