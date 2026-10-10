import { joinClassNames } from "../../utils/class-names";
import type { getAddonDialog } from "./booking-edit-view";
import { getDuplicateView } from "./clients-view";
import type { DuplicateView } from "./clients-view";
import { findDuplicate } from "./studio-model";
import { getDialogPlacement, getOverlayAnimation } from "./studio-overlay";
import type { StudioController } from "./use-studio";
import styles from "./booking-dialogs.module.css";

export type AddonDialogView = ReturnType<typeof getAddonDialog> & {
  remove: () => void;
  save: () => void;
};

/** "Already uses this phone / email" (prototype dup notice). */
export const DuplicateNotice = ({ duplicate }: { duplicate: DuplicateView }) =>
  duplicate.isOn ? (
    <div className={styles.duplicate} role="alert">
      <img className={styles.duplicateAvatar} src={duplicate.img} alt="" />
      <div className={styles.grow}>
        <div className={styles.duplicateTitle}>{duplicate.title}</div>
        <div className={styles.duplicateSub}>{duplicate.sub}</div>
        <button className={styles.duplicateGo} onClick={duplicate.go}>
          {duplicate.cta}
        </button>
      </div>
    </div>
  ) : null;

/** Edits one add-on for this booking only (prototype esAddon dialog). */
export const AddonEditDialog = ({
  studio,
  dialog,
}: {
  studio: StudioController;
  dialog: AddonDialogView;
}) => {
  const { isWide, state } = studio;
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={styles.scrim} onClick={dialog.close}></div>
      <div
        className={joinClassNames(
          styles.dialog,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.confirmOut, "dlg", isWide),
        )}
      >
        <div className={styles.title}>{dialog.name}</div>
        <div className={styles.intro}>
          Only this booking changes. Your saved add-on stays as it is.
        </div>
        <div className={styles.twoCols}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Price</span>
            <span className={styles.moneyBox}>
              <span className={styles.pound}>£</span>
              <input
                className={styles.moneyInput}
                type="number"
                inputMode="decimal"
                min="0"
                value={dialog.price}
                onChange={dialog.onPrice}
              />
            </span>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Quantity</span>
            <span className={styles.qtyRow}>
              <span className={styles.qtyBox}>
                <input
                  className={styles.qtyInput}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="20"
                  value={dialog.qty}
                  onChange={dialog.onQty}
                />
              </span>
              <span className={styles.stepper}>
                <button
                  className={joinClassNames(
                    styles.fewer,
                    dialog.isMinQty && styles.fewerOff,
                  )}
                  onClick={dialog.qtyDown}
                  disabled={dialog.isMinQty}
                  aria-label="Fewer"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M5 12h14"></path>
                  </svg>
                </button>
                <button
                  className={styles.more}
                  onClick={dialog.qtyUp}
                  aria-label="More"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14"></path>
                  </svg>
                </button>
              </span>
            </span>
          </label>
        </div>
        <div className={styles.extra}>
          <div className={styles.label135}>Extra time</div>
          <div className={styles.grid2}>
            <select
              className={styles.select}
              value={dialog.hrs}
              onChange={dialog.onHrs}
              aria-label="Hours"
            >
              {dialog.hourOptions.map(({ key, v, label }) => (
                <option key={key} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={dialog.mins}
              onChange={dialog.onMins}
              aria-label="Minutes"
            >
              {dialog.minuteOptions.map(({ key, v, label }) => (
                <option key={key} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.remove}
            onClick={dialog.remove}
            aria-label="Remove add-on"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"></path>
            </svg>
          </button>
          <button className={styles.cancel} onClick={dialog.close}>
            Cancel
          </button>
          <button className={styles.save} onClick={dialog.save}>
            Save
          </button>
        </div>
      </div>
    </>
  );
};

/** "Add a new client" from the booking's change-client step (prototype nc). */
export const NewClientDialog = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, actions, context } = studio;
  const draft = state.newClient;
  if (!draft) return null;
  const update = (patch: Partial<typeof draft>) =>
    setState({ newClient: { ...draft, ...patch } });
  const duplicate = findDuplicate(state, draft.phone, draft.email, null);
  const isReady = (draft.first || "").trim().length > 1 && !duplicate;
  const save = () => {
    if (!isReady) return;
    const id = "c" + Date.now();
    const first = (draft.first || "").trim();
    const last = (draft.last || "").trim();
    const name = [first, last].filter(Boolean).join(" ");
    setState(({ extraClients }) => ({
      newClient: null,
      ccQ: "",
      extraClients: extraClients.concat([
        {
          id,
          name,
          first,
          img: "",
          area: "",
          visits: 0,
          since: "today",
          spent: 0,
          phone: draft.phone || "",
          email: draft.email || "",
        },
      ]),
    }));
    context.memo.ccSet?.(id);
    actions.toastMsg(name + " added");
  };
  const field = (
    value: string,
    key: keyof typeof draft,
    placeholder: string,
    extra = {},
  ) => (
    <input
      className={styles.input}
      value={value}
      onChange={(event) => update({ [key]: event.target.value })}
      placeholder={placeholder}
      {...extra}
    />
  );
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={styles.scrim}
        onClick={() => setState({ newClient: null })}
      ></div>
      <div
        className={joinClassNames(
          styles.dialog,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.confirmOut, "dlg", isWide),
        )}
      >
        <div className={styles.title}>Add a new client</div>
        <div className={styles.intro}>
          Add phone or email to send confirmation to the client
        </div>
        <div className={styles.twoColsMin}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>First name</span>
            {field(draft.first || "", "first", "Mia")}
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Last name</span>
            {field(draft.last || "", "last", "Thompson")}
          </label>
        </div>
        <label className={styles.fieldSpaced}>
          <span className={styles.fieldLabel}>
            Email <span className={styles.optional}>optional</span>
          </span>
          {field(draft.email || "", "email", "mia@example.com", {
            inputMode: "email",
          })}
        </label>
        <label className={styles.fieldSpaced}>
          <span className={styles.fieldLabel}>
            Phone <span className={styles.optional}>optional</span>
          </span>
          {field(draft.phone || "", "phone", "07…", { inputMode: "tel" })}
        </label>
        <DuplicateNotice
          duplicate={getDuplicateView(
            duplicate,
            "Use {f} instead",
            (client) => {
              setState({ newClient: null, ccQ: "" });
              context.memo.ccSet?.(client.id);
            },
          )}
        />
        <div className={styles.row10}>
          <button
            className={styles.cancel}
            onClick={() => setState({ newClient: null })}
          >
            Cancel
          </button>
          <button
            className={joinClassNames(styles.save, !isReady && styles.saveOff)}
            onClick={save}
            disabled={!isReady}
          >
            Add client
          </button>
        </div>
      </div>
    </>
  );
};
