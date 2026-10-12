import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { joinClassNames } from "../../utils/class-names";
import { SettingsPersonal } from "./settings-personal";
import {
  SettingsCalendar,
  SettingsNotifications,
  SettingsPayouts,
} from "./settings-pages";
import { SettingsSecurity } from "./settings-security";
import { useAccountSettings } from "./use-account-settings";
import type {
  AccountSettingsController,
  AccountSettingsProps,
} from "./use-account-settings";
import shared from "./account-settings.module.css";
import dialogStyles from "./settings-dialog.module.css";

export type {
  AccountSettingsApi,
  AccountSettingsProps,
} from "./use-account-settings";

/**
 * The confirm dialog, portalled to <body>: Studio's animated ancestors keep a transform, which would
 * trap a fixed overlay inside the content column.
 */
const ConfirmDialog = ({
  settings: { dialog, dialogPhase, closeDialog, confirmDialog },
  uid,
}: {
  settings: AccountSettingsController;
  uid: string;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isOpen = dialogPhase === "open";

  useEffect(() => {
    if (!isOpen) return;

    cancelRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };

    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, closeDialog]);

  return createPortal(
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={joinClassNames(
        dialogStyles.overlay,
        isOpen && dialogStyles.overlayOpen,
        dialogPhase === "closing" && dialogStyles.overlayClosing,
      )}
      data-ac-portal={uid}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div
        className={joinClassNames(
          dialogStyles.panel,
          isOpen && dialogStyles.panelOpen,
          dialogPhase === "closing" && dialogStyles.panelClosing,
        )}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${uid}-dt`}
      >
        <h3 className={dialogStyles.title} id={`${uid}-dt`}>
          {dialog.title}
        </h3>
        <p className={dialogStyles.body}>{dialog.body}</p>
        <div className={dialogStyles.actions}>
          <button
            className={dialogStyles.cancel}
            ref={cancelRef}
            onClick={closeDialog}
          >
            Cancel
          </button>
          <button className={dialogStyles.confirm} onClick={confirmDialog}>
            {dialog.cta}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/**
 * Studio → Settings pages for the stylist's own account: personal details,
 * login & security, notifications, payouts and calendar sync, with a save bar for the typed fields.
 */
export const AccountSettings = (props: AccountSettingsProps) => {
  const uid = `ac${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const settings = useAccountSettings(props);
  const { page, state, isDirty, hasSave, hasBarError, save } = settings;
  const pageProps = { settings, uid, props };

  return (
    <div
      className={shared.root}
      data-ac-emb={props.embedded ? "1" : "0"}
      data-ac-hidesave={props.hideSave ? "1" : "0"}
      data-screen-label="Account settings"
    >
      <div className={shared.pages}>
        {page === "personal" && <SettingsPersonal {...pageProps} />}
        {page === "security" && <SettingsSecurity {...pageProps} />}
        {page === "notifications" && <SettingsNotifications {...pageProps} />}
        {page === "payouts" && <SettingsPayouts {...pageProps} />}
        {page === "calendar" && <SettingsCalendar {...pageProps} />}
      </div>

      {hasSave && (
        <div className={shared.saveBar} data-screen-label="Save bar">
          {hasBarError && (
            <div className={shared.saveError}>
              Fix the highlighted fields to save
            </div>
          )}
          <button
            className={joinClassNames(
              shared.saveButton,
              shared.focusRing,
              isDirty ? shared.saveOn : shared.saveOff,
            )}
            data-ac-in="1"
            data-ac-savebtn="1"
            disabled={!isDirty}
            onClick={save}
          >
            Save changes
          </button>
        </div>
      )}

      <div
        className={joinClassNames(
          shared.toast,
          state.toast ? shared.toastShown : shared.toastHidden,
        )}
        data-ac-toast="1"
        role="status"
        aria-live="polite"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5"></path>
        </svg>
        {state.toastText}
      </div>
      <ConfirmDialog settings={settings} uid={uid} />
    </div>
  );
};
