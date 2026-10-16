import { Copy, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { AllergyField } from "../../components/allergy-field/allergy-field";
import { AllergyPrivacySheet } from "../../components/allergy-privacy-sheet/allergy-privacy-sheet";
import { joinClassNames } from "../../utils/class-names";
import type { AccountController } from "./use-account";
import styles from "../../styles/features/account/settings-sections.module.css";
import ui from "../../styles/features/account/ui.module.css";

interface SwitchProps {
  id: string;
  labelId: string;
  on: boolean;
  onToggle: () => void;
}

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

/** Before a first booking there's no stylist to share anything with. */
const SharedEmpty = ({ isWide }: { isWide: boolean }) => {
  const [isPrivacyOpen, setPrivacyOpen] = useState(false);

  return (
    <div
      className={joinClassNames(ui.emptyState, !isWide && ui.emptyStateCentred)}
      data-screen-label="Shared with stylists empty"
    >
      <div className={ui.emptyIcon}>
        <Shield size={24} strokeWidth={2} />
      </div>
      <div>
        <h2 className={styles.sharedEmptyTitle}>Nothing shared yet</h2>
        <p className={ui.emptyText}>
          When you book, you can choose to share allergies or sensitivities with
          your stylist so they can keep you safe. Only that stylist will see it.
        </p>
      </div>
      <Link className={ui.emptyButton} to="/search">
        Find a stylist
      </Link>
      <button
        className={styles.sharedEmptyLink}
        onClick={() => setPrivacyOpen(true)}
      >
        How we use this information
      </button>
      {isPrivacyOpen && (
        <AllergyPrivacySheet onClose={() => setPrivacyOpen(false)} />
      )}
    </div>
  );
};

export const SharedSection = ({
  account: { state, actions },
  getStylistName,
}: SharedSectionProps) => {
  const { entries, allergyEdit, allergyDraft } = state;
  const { setState, showToast } = actions;

  if (!entries.length)
    return (
      <section data-screen-label="Account: Shared with stylists">
        <SharedEmpty isWide={state.wide} />
      </section>
    );

  return (
    <section data-screen-label="Account: Shared with stylists">
      <h2 className={ui.heading}>Allergies or sensitivities</h2>
      <div className={ui.list}>
        {entries.map(({ id, text }, index) => {
          const name = getStylistName(id);
          const hasText = !!text;
          const isEditing = allergyEdit === index;

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
                        setState({ allergyEdit: index, allergyDraft: text })
                      }
                    >
                      {hasText ? "Edit" : "Add"}
                    </button>
                    {hasText && (
                      <button
                        className={styles.algButton}
                        onClick={() =>
                          actions.openDialog({ kind: "allergy", index })
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
                    value={allergyDraft}
                    onChange={(draft) => setState({ allergyDraft: draft })}
                    autoFocus={true}
                  />
                  <div className={styles.algEditActions}>
                    <button
                      className={ui.save}
                      onClick={() => {
                        const saved = allergyDraft.trim();

                        setState(({ entries: current }) => ({
                          entries: current.map((entry, position) =>
                            position === index
                              ? { ...entry, text: saved }
                              : entry,
                          ),
                          allergyEdit: -1,
                        }));

                        showToast(saved ? "Saved" : "Removed");
                      }}
                    >
                      Save
                    </button>
                    <button
                      className={ui.cancel}
                      onClick={() => setState({ allergyEdit: -1 })}
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
  const syncUrl = `webcal://tiwarashouse.com/cal/${state.sync}.ics`;

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
            on={state.marketing}
            onToggle={() => {
              const isOn = !state.marketing;

              actions.setState({ marketing: isOn });

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
              <Copy className={ui.icon} size={16} strokeWidth={1.7} />
              Copy calendar link
            </button>
            <button
              className={ui.quietButton}
              onClick={() => actions.openDialog({ kind: "sync" })}
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
          onClick={() => actions.openDialog({ kind: "delete" })}
        >
          Delete account
        </button>
      </div>
    </div>
  </section>
);
