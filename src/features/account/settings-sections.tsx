import { AllergyField } from "../../components/allergy-field/allergy-field";
import { joinClassNames } from "../../utils/class-names";
import type { AccountController } from "./use-account";
import styles from "./settings-sections.module.css";
import ui from "./account-ui.module.css";

interface SwitchProps {
  id: string;
  labelId: string;
  on: boolean;
  onToggle: () => void;
}

/** On / off switch (prototype sw()). */
export const AccountSwitch = ({ id, labelId, on, onToggle }: SwitchProps) => (
  <button
    className={joinClassNames(ui.switch, on ? ui.switchOn : ui.switchOff)}
    id={id}
    role="switch"
    aria-checked={on ? "true" : "false"}
    aria-labelledby={labelId}
    onClick={onToggle}
  >
    <span
      className={joinClassNames(ui.switchKnob, on ? ui.knobOn : ui.knobOff)}
      aria-hidden="true"
    ></span>
  </button>
);

interface SharedSectionProps {
  account: AccountController;
  getStylistName: (id: string) => string;
}

export const SharedSection = ({
  account: { state, actions },
  getStylistName,
}: SharedSectionProps) => {
  const { entries, algEdit, algDraft } = state;
  const { setState, showToast } = actions;
  return (
    <section data-screen-label="Account: Shared with stylists">
      <h2 className={ui.heading}>Allergies or sensitivities</h2>
      <div className={ui.list}>
        {entries.map(({ id, text }, index) => {
          const name = getStylistName(id);
          const hasText = !!text;
          const isEditing = algEdit === index;
          return (
            <div key={id} className={ui.row}>
              <div className={ui.rowHead}>
                <div className={styles.algMain}>
                  <div className={ui.rowLabel}>{name}</div>
                  {!isEditing && (
                    <div
                      className={joinClassNames(
                        styles.algValue,
                        hasText ? ui.valueOn : ui.valueOff,
                      )}
                    >
                      {hasText ? text : "None shared"}
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <div className={styles.algActions}>
                    <button
                      className={styles.algButton}
                      onClick={() =>
                        setState({ algEdit: index, algDraft: text })
                      }
                    >
                      {hasText ? "Edit" : "Add"}
                    </button>
                    {hasText && (
                      <button
                        className={styles.algButton}
                        onClick={() =>
                          actions.openDialog({ k: "alg", i: index })
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
              {isEditing && (
                <div className={styles.algEdit}>
                  <AllergyField
                    stylistName={name}
                    value={algDraft}
                    onChange={(draft) => setState({ algDraft: draft })}
                    autoFocus={true}
                  />
                  <div className={styles.algEditActions}>
                    <button
                      className={ui.save}
                      onClick={() => {
                        const saved = algDraft.trim();
                        setState(({ entries: current }) => ({
                          entries: current.map((entry, position) =>
                            position === index
                              ? { ...entry, text: saved }
                              : entry,
                          ),
                          algEdit: -1,
                        }));
                        showToast(saved ? "Saved" : "Removed");
                      }}
                    >
                      Save
                    </button>
                    <button
                      className={ui.cancel}
                      onClick={() => setState({ algEdit: -1 })}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const CommunicationSection = ({
  account: { state, actions },
}: {
  account: AccountController;
}) => {
  const syncUrl = "webcal://tiwarashouse.co.uk/cal/" + state.sync + ".ics";
  return (
    <section data-screen-label="Account: Communication">
      <h2 className={ui.heading}>Marketing emails</h2>
      <div className={ui.list}>
        <div className={styles.switchRow}>
          <span className={ui.strongText} id="ac-mkt-l">
            {"Offers and news from Tiwára's House"}
          </span>
          <AccountSwitch
            id="ac-mkt"
            labelId="ac-mkt-l"
            on={state.mkt}
            onToggle={() => {
              const isOn = !state.mkt;
              actions.setState({ mkt: isOn });
              actions.showToast(
                isOn
                  ? "You’ll get offers and news by email"
                  : "You won’t get offers and news by email",
              );
            }}
          />
        </div>
      </div>
      <h2 className={ui.headingSpaced}>Sync my bookings</h2>
      <div className={ui.list} data-screen-label="Sync my bookings">
        <div className={styles.syncBox}>
          <p className={styles.syncText}>
            {
              "Add all your Tiwára's House bookings to your calendar automatically."
            }
          </p>
          <label className={styles.syncLabel}>
            Your calendar link{" "}
            <input
              className={styles.syncInput}
              readOnly={true}
              value={syncUrl}
            />
          </label>
          <div className={ui.buttonRow}>
            <button
              className={styles.copy}
              onClick={() => actions.copy(syncUrl, "Calendar link copied")}
            >
              <svg
                className={ui.icon}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 9h10v10H9zM5 15V5h10"></path>
              </svg>
              Copy calendar link
            </button>
            <button
              className={ui.quietButton}
              onClick={() => actions.openDialog({ k: "sync" })}
            >
              Reset link
            </button>
          </div>
          <p className={styles.syncHint}>
            Paste the link into Google Calendar, Apple Calendar or Outlook as a
            calendar subscription.
          </p>
        </div>
      </div>
    </section>
  );
};

export const PrivacySection = ({
  account: { actions },
  onCookies,
}: {
  account: AccountController;
  onCookies: () => void;
}) => (
  <section data-screen-label="Account: Privacy and data">
    <div className={ui.list}>
      <div className={styles.privacyRow}>
        <div className={ui.itemText}>
          <div className={ui.itemTitle}>Download your data</div>
          <div className={ui.itemSub}>
            A copy of your details, bookings and payments.
          </div>
        </div>
        <button
          className={ui.quietButton}
          onClick={() =>
            actions.showToast(
              "We’ll email you a copy of your data within one month.",
            )
          }
        >
          Request a copy
        </button>
      </div>
      <div className={styles.privacyRow}>
        <div className={ui.itemText}>
          <div className={ui.itemTitle}>Cookie settings</div>
          <div className={ui.itemSub}>Choose which cookies we use.</div>
        </div>
        <button className={styles.cookieLink} onClick={onCookies}>
          Cookie settings
        </button>
      </div>
    </div>
    <div className={styles.danger} data-screen-label="Danger zone">
      <h2 className={styles.dangerTitle}>Delete Account</h2>
      <div className={styles.dangerRow}>
        <div className={styles.dangerText}>
          Delete your account and the details stored with it. This can’t be
          undone.
        </div>
        <button
          className={styles.dangerButton}
          onClick={() => actions.openDialog({ k: "delete" })}
        >
          Delete account
        </button>
      </div>
    </div>
  </section>
);
