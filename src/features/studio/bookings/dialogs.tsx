import { Minus, Plus, Trash } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { getAddonDialog } from "./edit-view";
import { getDuplicateView } from "../clients/view";
import type { DuplicateView } from "../clients/view";
import { findDuplicate } from "../core/model";
import { getDialogPlacement, getOverlayAnimation } from "../shell/overlay";
import type { StudioController } from "../core/use-studio";
import { toContactKey } from "./records";
import styles from "../../../styles/features/studio/bookings/dialogs.module.css";

type AddonDialogView = ReturnType<typeof getAddonDialog> & {
  remove: () => void;
  save: () => void;
};

/** "Already uses this phone / email". */
export const DuplicateNotice = ({ duplicate }: { duplicate: DuplicateView }) =>
  duplicate.isOn ? (
    <div className={styles.duplicate} role="alert">
      <img className={styles.duplicateAvatar} src={duplicate.img} alt="" />
      <div className={styles.grow}>
        <div className={styles.duplicateTitle}>{duplicate.title}</div>
        <div className={styles.duplicateSub}>{duplicate.subtitle}</div>
        <button className={styles.duplicateGo} onClick={duplicate.onSelect}>
          {duplicate.cta}
        </button>
      </div>
    </div>
  ) : null;

/** Edits one add-on for this booking only. */
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
          getOverlayAnimation(state.confirmOut, "dialog", isWide),
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
                  value={dialog.quantity}
                  onChange={dialog.onQuantity}
                />
              </span>
              <span className={styles.stepper}>
                <button
                  className={joinClassNames(
                    styles.fewer,
                    dialog.isMinQuantity && styles.fewerOff,
                  )}
                  onClick={dialog.quantityDown}
                  disabled={dialog.isMinQuantity}
                  aria-label="Fewer"
                >
                  <Minus size={17} strokeWidth={2} />
                </button>
                <button
                  className={styles.more}
                  onClick={dialog.quantityUp}
                  aria-label="More"
                >
                  <Plus size={17} strokeWidth={2} />
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
              value={dialog.hours}
              onChange={dialog.onHours}
              aria-label="Hours"
            >
              {dialog.hourOptions.map(({ key, value, label }) => (
                <option key={key} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={dialog.minutes}
              onChange={dialog.onMinutes}
              aria-label="Minutes"
            >
              {dialog.minuteOptions.map(({ key, value, label }) => (
                <option key={key} value={value}>
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
            <Trash size={18} strokeWidth={1.7} />
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

/** "Add a new client" from the booking's change-client step. */
export const NewClientDialog = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, actions, context } = studio;
  const draft = state.newClient;

  if (!draft) return null;

  const update = (patch: Partial<typeof draft>) =>
    setState({ newClient: { ...draft, ...patch } });

  const duplicate = findDuplicate(state, draft.phone, draft.email, null);

  // every client needs a phone or an email for their booking messages
  const isReady =
    (draft.first || "").trim().length > 1 &&
    !!((draft.phone || "").trim() || (draft.email || "").trim()) &&
    !duplicate;

  const save = () => {
    if (!isReady) return;

    const local = `c${Date.now()}`;

    const id = state.account
      ? toContactKey(draft.email || "", draft.phone || "", local)
      : local;

    const first = (draft.first || "").trim();
    const last = (draft.last || "").trim();
    const name = [first, last].filter(Boolean).join(" ");

    setState(({ extraClients }) => ({
      newClient: null,
      changeClientQuery: "",
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

    context.memo.setChangeClient?.(id);
    actions.showToast(`${name} added`);
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
          getOverlayAnimation(state.confirmOut, "dialog", isWide),
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
          <span className={styles.fieldLabel}>Email</span>
          {field(draft.email || "", "email", "mia@example.com", {
            inputMode: "email",
          })}
        </label>
        <label className={styles.fieldSpaced}>
          <span className={styles.fieldLabel}>Phone</span>
          {field(draft.phone || "", "phone", "07…", { inputMode: "tel" })}
        </label>
        <DuplicateNotice
          duplicate={getDuplicateView(
            duplicate,
            "Use {f} instead",
            (client) => {
              setState({ newClient: null, changeClientQuery: "" });
              context.memo.setChangeClient?.(client.id);
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
