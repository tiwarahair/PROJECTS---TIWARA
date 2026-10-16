import { AccountSwitch } from "../settings-sections";
import type { AccountController } from "../use-account";
import { closeThen } from "./close-then";
import shared from "../../../styles/features/account/dialogs/index.module.css";
import styles from "../../../styles/features/account/dialogs/cookies.module.css";
import ui from "../../../styles/features/account/ui.module.css";

interface CookieSettingsProps {
  account: AccountController;
}

export const CookieSettings = ({ account }: CookieSettingsProps) => {
  const { state, actions } = account;
  const { cookiesDraft } = state;

  return (
    <div data-screen-label="Cookie settings">
      <h2 className={shared.title} id="ac-dlg-t">
        Cookie settings
      </h2>
      <div className={styles.cookieList}>
        <div className={styles.cookieRow}>
          <div className={ui.minZero}>
            <div className={ui.strongText}>Essential</div>
            <div className={ui.itemSub}>
              Keep you logged in and your bookings secure.
            </div>
          </div>
          <span className={styles.alwaysOn}>Always on</span>
        </div>
        <div className={styles.cookieRow}>
          <div className={ui.minZero}>
            <div className={ui.strongText} id="ac-ck-an-l">
              Analytics
            </div>
            <div className={ui.itemSub}>
              Help us see which pages people use.
            </div>
          </div>
          <AccountSwitch
            id="ac-ck-an"
            labelId="ac-ck-an-l"
            on={cookiesDraft.analytics}
            onToggle={() =>
              actions.setState(({ cookiesDraft: current }) => ({
                cookiesDraft: { ...current, analytics: !current.analytics },
              }))
            }
          />
        </div>
        <div className={styles.cookieRow}>
          <div className={ui.minZero}>
            <div className={ui.strongText} id="ac-ck-mk-l">
              Marketing
            </div>
            <div className={ui.itemSub}>
              {"Show you relevant Tiwára's House offers on other sites."}
            </div>
          </div>
          <AccountSwitch
            id="ac-ck-mk"
            labelId="ac-ck-mk-l"
            on={cookiesDraft.marketing}
            onToggle={() =>
              actions.setState(({ cookiesDraft: current }) => ({
                cookiesDraft: { ...current, marketing: !current.marketing },
              }))
            }
          />
        </div>
      </div>
      <div className={styles.cookieActions}>
        <button
          className={shared.saveCard}
          onClick={() => {
            closeThen(account, ({ cookiesDraft: current }) => ({
              cookies: { ...current },
              dialog: null,
            }));

            actions.showToast("Cookie settings saved");
          }}
        >
          Save settings
        </button>
        <button className={shared.secondary} onClick={actions.closeDialog}>
          Cancel
        </button>
      </div>
    </div>
  );
};
