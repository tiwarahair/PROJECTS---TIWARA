import { useEffect, useId, useRef, useState } from "react";
import { stylists } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import { policyLines } from "../../utils/pricing";
import {
  EXTRAS_LIMIT,
  PREVIEW_PRICE,
  getDepositError,
  getExistingNote,
  getExtrasUsed,
  getFeeError,
  getInitialPolicyState,
  getPolicyKey,
  getPolicyOutput,
  getPolicySummary,
  getPreviewPolicy,
} from "./payment-policy-logic";
import type {
  ExtraType,
  FeeState,
  PolicyFormState,
  PolicyPreset,
  PolicyValue,
} from "./payment-policy-logic";
import {
  ErrorLine,
  FeeBlock,
  MODES,
  Reveal,
  Ring,
  Select,
  getTextClass,
  getTileClass,
} from "./payment-policy-sections";
import styles from "../../styles/components/payment-policy/payment-policy.module.css";
import { formatMoney } from "../../utils/money";

const FLASH_MS = 1800;

const WINDOW_OPTIONS = (
  [
    [0.5, "30 mins"],
    [1, "1 hour"],
    [2, "2 hours"],
    [12, "12 hours"],
    [24, "24 hours"],
    [48, "48 hours"],
    [72, "72 hours"],
  ] as const
).map(([value, label]) => ({ value: String(value), label }));

const GRACE_OPTIONS = [0, 15, 20, 25, 30, 45, 60].map((minutes) => ({
  value: String(minutes),
  label: minutes ? `${minutes} min` : "None",
}));

const DEFAULT_STYLIST = stylists.find(({ id }) => id === "amara-beauty");

/** What the host (Studio) gets after every render to drive its own save button. */
export interface PaymentPolicyApi {
  canSave: boolean;
  isDirty: boolean;
  save: () => void;
}

export interface PaymentPolicyProps {
  preset?: PolicyPreset;
  embedded?: boolean;
  hideSave?: boolean;
  value?: Partial<PolicyValue>;
  bookingsCount?: number;
  stylistName?: string;
  onSave?: (value: PolicyValue) => void | Promise<boolean>;
  onState?: (api: PaymentPolicyApi) => void;
}

/**
 * Studio → Settings → Payment & cancellation policy: booking protection,
 * cancellation window and fees, grace period, additional policies (300 characters shared), a live client preview
 * and a save bar.
 */
export const PaymentPolicy = ({
  preset = "default",
  embedded = false,
  hideSave = false,
  value,
  bookingsCount,
  stylistName,
  onSave,
  onState,
}: PaymentPolicyProps) => {
  const uid = `pp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const [state, setRawState] = useState(() =>
    getInitialPolicyState(preset, value),
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const focusExtra = useRef<number | null>(null);
  const flashTimer = useRef(0);

  const setState = (patch: Partial<PolicyFormState>) =>
    setRawState((current) => ({ ...current, ...patch }));

  const {
    mode,
    deposit: depositInput,
    refundable,
    freeWindowHours,
    late,
    noShow,
    grace,
    extras,
    flash,
  } = state;

  const deposit = parseInt(depositInput, 10);
  const depositError = getDepositError(state);
  const lateError = getFeeError(mode, late);
  const noShowError = getFeeError(mode, noShow);
  const hasError = !!depositError || !!lateError || !!noShowError;
  const isDirty = getPolicyKey(state) !== state.saved;
  const canSave = isDirty && !hasError;
  const used = getExtrasUsed(extras);
  const isFull = used >= EXTRAS_LIMIT;

  const preview = policyLines(
    getPreviewPolicy(state),
    PREVIEW_PRICE,
    stylistName ?? DEFAULT_STYLIST?.name ?? "",
  );

  const notes = extras
    .filter(({ text }) => text.trim())
    .map(({ text }) => text.trim());

  const save = () => {
    if (!canSave) return;

    const markSaved = () => {
      window.clearTimeout(flashTimer.current);
      setState({ saved: getPolicyKey(state), flash: true });

      flashTimer.current = window.setTimeout(
        () => setState({ flash: false }),
        FLASH_MS,
      );
    };

    const result = onSave?.(getPolicyOutput(state));

    if (result instanceof Promise)
      void result.then((isSaved) => isSaved && markSaved());
    else markSaved();
  };

  // tells the host (Studio) whether a save is possible, so its own header button can mirror the state
  useEffect(() => {
    onState?.({ canSave, isDirty, save });

    if (focusExtra.current !== null) {
      rootRef.current
        ?.querySelector<HTMLElement>(`[data-extra="${focusExtra.current}"]`)
        ?.focus({ preventScroll: false });

      focusExtra.current = null;
    }
  });

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const updateFee = (key: "late" | "noShow") => (patch: Partial<FeeState>) =>
    setRawState((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));

  const addExtra = (type: ExtraType) => {
    if (isFull) return;

    focusExtra.current = state.nextExtraId;

    setState({
      extras: extras.concat({ id: state.nextExtraId, type, text: "" }),
      nextExtraId: state.nextExtraId + 1,
    });
  };

  return (
    <div
      className={styles.root}
      ref={rootRef}
      data-pp-emb={embedded ? "1" : "0"}
      data-pp-hidesave={hideSave ? "1" : "0"}
      data-screen-label="Payment and cancellation policy"
    >
      <div className={styles.scroll} data-pp-scroll="1">
        <div className={styles.pad} data-pp-pad="1">
          {!embedded && (
            <>
              <button className={styles.back}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6"></path>
                </svg>
                Settings
              </button>
              <h1 className={styles.title}>Payment & cancellation policy</h1>
            </>
          )}

          <div className={styles.columns} data-pp-cols="1">
            <div className={styles.main}>
              <section data-screen-label="Booking protection">
                <h2 className={styles.heading}>Booking protection</h2>
                <p className={styles.intro}>
                  Choose what clients pay or provide when they book.
                </p>
                <div
                  className={styles.modes}
                  role="radiogroup"
                  aria-label="Booking protection"
                >
                  {MODES.map(({ key, title, description, isRecommended }) => {
                    const isOn = mode === key;

                    return (
                      <button
                        key={key}
                        className={joinClassNames(
                          styles.modeTile,
                          styles.focusRing,
                          getTileClass(isOn),
                        )}
                        data-pp-in="1"
                        role="radio"
                        aria-checked={isOn ? "true" : "false"}
                        onClick={() => setState({ mode: key })}
                      >
                        <Ring className={styles.modeRing} isOn={isOn} />
                        <span className={styles.modeText}>
                          <span className={styles.modeHead}>
                            <span
                              className={joinClassNames(
                                styles.modeTitle,
                                getTextClass(isOn),
                              )}
                            >
                              {title}
                            </span>
                            {isRecommended && (
                              <span className={styles.tag}>Recommended</span>
                            )}
                          </span>
                          <span className={styles.modeDesc}>{description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <Reveal open={mode === "deposit"}>
                  <div className={styles.depositStack}>
                    <div>
                      <label className={styles.label} htmlFor={`${uid}-dep`}>
                        Deposit amount
                      </label>
                      <div className={styles.pctWrap}>
                        <input
                          className={joinClassNames(
                            styles.depositInput,
                            styles.focusRing,
                            depositError ? styles.fieldErr : styles.fieldOk,
                          )}
                          data-pp-in="1"
                          id={`${uid}-dep`}
                          inputMode="numeric"
                          value={depositInput}
                          onChange={(event) =>
                            setState({
                              deposit: event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 3),
                            })
                          }
                          aria-invalid={depositError ? "true" : "false"}
                        />
                        <span className={styles.pctSign}>%</span>
                      </div>
                      {!!depositError && (
                        <ErrorLine className={styles.error}>
                          {depositError}
                        </ErrorLine>
                      )}
                    </div>
                    <div>
                      <div className={styles.strong} id={`${uid}-ref`}>
                        Deposit refund
                      </div>
                      <div
                        className={styles.options}
                        role="radiogroup"
                        aria-labelledby={`${uid}-ref`}
                      >
                        {(
                          [
                            [
                              true,
                              "Refundable according to cancellation policy",
                            ],
                            [false, "Non-refundable"],
                          ] as const
                        ).map(([isRefundable, label]) => {
                          const isOn = refundable === isRefundable;

                          return (
                            <button
                              key={label}
                              className={joinClassNames(
                                styles.option,
                                styles.focusRing,
                                getTileClass(isOn),
                              )}
                              data-pp-in="1"
                              role="radio"
                              aria-checked={isOn ? "true" : "false"}
                              onClick={() =>
                                setState({ refundable: isRefundable })
                              }
                            >
                              <Ring className={styles.ring} isOn={isOn} />
                              <span
                                className={joinClassNames(
                                  styles.optionLabel,
                                  getTextClass(isOn),
                                )}
                              >
                                {label}
                              </span>
                              {isRefundable && (
                                <span className={styles.tag}>Recommended</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Reveal>

                <Reveal open={mode === "none"}>
                  <div className={styles.note} role="note">
                    <svg
                      className={styles.noteIcon}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 11v5M12 7.5v.5"></path>
                    </svg>
                    <span>
                      You won’t be able to charge fees for late cancellations or
                      no-shows.
                    </span>
                  </div>
                </Reveal>
              </section>

              <section data-screen-label="Cancellations and no-shows">
                <h2 className={styles.heading}>Cancellations & no-shows</h2>
                <div className={styles.windowField}>
                  <label className={styles.label} htmlFor={`${uid}-win`}>
                    Free cancellation & rescheduling until
                  </label>
                  <div className={styles.windowRow}>
                    <Select
                      id={`${uid}-win`}
                      value={String(freeWindowHours)}
                      options={WINDOW_OPTIONS}
                      onChange={(picked) =>
                        setState({ freeWindowHours: parseFloat(picked) })
                      }
                      wrapClassName={styles.selectWrap}
                    />
                    <span className={styles.muted}>before the appointment</span>
                  </div>
                  <div className={styles.help}>
                    Online rescheduling also closes at this point.
                  </div>
                </div>

                <Reveal open={mode !== "none"}>
                  <div className={styles.fees}>
                    <FeeBlock
                      label="Late cancellation fee"
                      fee={late}
                      mode={mode}
                      depositText={String(isNaN(deposit) ? 0 : deposit)}
                      error={lateError}
                      onUpdate={updateFee("late")}
                    />
                    <FeeBlock
                      label="No-show fee"
                      fee={noShow}
                      mode={mode}
                      depositText={String(isNaN(deposit) ? 0 : deposit)}
                      error={noShowError}
                      onUpdate={updateFee("noShow")}
                    />
                  </div>
                </Reveal>

                <div className={styles.graceField}>
                  <label className={styles.label} htmlFor={`${uid}-gr`}>
                    Grace period before no-show
                  </label>
                  <Select
                    id={`${uid}-gr`}
                    value={String(grace)}
                    options={GRACE_OPTIONS}
                    onChange={(picked) =>
                      setState({ grace: parseInt(picked, 10) })
                    }
                    wrapClassName={styles.graceSelectWrap}
                  />
                  {!!grace && (
                    <div className={styles.help}>
                      {`You can mark a no-show ${grace} minutes after the start time. It’s always optional.`}
                    </div>
                  )}
                </div>
              </section>

              <section data-screen-label="Additional policies">
                <h2 className={styles.heading}>
                  Additional policies{" "}
                  <span className={styles.optional}>(optional)</span>
                </h2>
                <p className={styles.intro}>
                  Your settings above always take priority over anything written
                  here.
                </p>
                {extras.length > 0 && (
                  <div className={styles.extras}>
                    {extras.map(({ id, type, text }) => {
                      const fieldId = `${uid}-x${id}`;
                      const isPreparation = type === "prep";

                      const extraName = isPreparation
                        ? "preparation note"
                        : "custom policy";

                      return (
                        <div key={id}>
                          <div className={styles.extraHead}>
                            <label className={styles.strong} htmlFor={fieldId}>
                              {isPreparation
                                ? "Preparation note"
                                : "Custom policy"}
                            </label>
                            <button
                              className={joinClassNames(
                                styles.removeExtra,
                                styles.focusRing,
                              )}
                              data-pp-in="1"
                              aria-label={`Remove ${extraName}`}
                              onClick={() =>
                                setState({
                                  extras: extras.filter(
                                    (extra) => extra.id !== id,
                                  ),
                                })
                              }
                            >
                              <svg
                                className={styles.removeIcon}
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                              >
                                <path d="M18 6 6 18M6 6l12 12"></path>
                              </svg>
                            </button>
                          </div>
                          <textarea
                            className={joinClassNames(
                              styles.extraText,
                              styles.focusRing,
                            )}
                            data-pp-in="1"
                            id={fieldId}
                            data-extra={id}
                            rows={3}
                            placeholder={
                              isPreparation
                                ? "e.g. Please arrive with clean, product-free hair"
                                : "e.g. Please don’t bring extra guests to your appointment"
                            }
                            value={text}
                            onChange={(event) => {
                              const room = EXTRAS_LIMIT - (used - text.length);
                              const next = event.target.value.slice(0, room);

                              setState({
                                extras: extras.map((extra) =>
                                  extra.id === id
                                    ? { ...extra, text: next }
                                    : extra,
                                ),
                              });
                            }}
                          ></textarea>
                        </div>
                      );
                    })}
                    <div
                      className={joinClassNames(
                        styles.count,
                        isFull ? styles.countFull : styles.countOpen,
                      )}
                      aria-live="polite"
                    >
                      {isFull
                        ? `Limit reached, ${used} / ${EXTRAS_LIMIT}`
                        : `${used} / ${EXTRAS_LIMIT}`}
                    </div>
                  </div>
                )}
                <div className={styles.addRow}>
                  {(
                    [
                      ["prep", "Add preparation note"],
                      ["custom", "Add custom policy"],
                    ] as const
                  ).map(([type, label]) => (
                    <button
                      key={type}
                      className={joinClassNames(
                        styles.addButton,
                        styles.focusRing,
                        isFull ? styles.addFull : styles.addOpen,
                      )}
                      data-pp-in="1"
                      disabled={isFull}
                      onClick={() => addExtra(type)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14"></path>
                      </svg>
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <aside
              className={styles.preview}
              data-screen-label="Client preview"
            >
              <h2 className={styles.heading}>What clients will see</h2>
              <p className={styles.intro}>Example for a £100 service.</p>
              <div className={styles.previewCard} aria-live="polite">
                <div className={styles.dueRow}>
                  <span className={styles.dueLabel}>Due today</span>
                  <span className={styles.dueAmount}>
                    {formatMoney(preview.dueToday)}
                  </span>
                </div>
                <div className={styles.dividerTop}></div>
                <div className={styles.lines}>
                  {preview.lines.map(({ icon, text }, index) => (
                    <div key={index} className={styles.line}>
                      <svg
                        className={styles.lineIcon}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={icon}></path>
                      </svg>
                      <span className={styles.lineText}>{text}</span>
                    </div>
                  ))}
                </div>
                {notes.length > 0 && (
                  <>
                    <div className={styles.dividerNotes}></div>
                    <div className={styles.dueLabel}>From your stylist</div>
                    <div className={styles.notes}>
                      {notes.map((note, index) => (
                        <div key={index} className={styles.noteText}>
                          {note}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div
        className={styles.saveBar}
        data-pp-bar="1"
        data-screen-label="Save bar"
      >
        <div className={styles.barInner} data-pp-barin="1">
          <div className={styles.barText}>
            <div className={styles.barHead}>
              {hasError && (
                <span
                  className={joinClassNames(
                    styles.status,
                    styles.statusColours,
                  )}
                >
                  Fix the error to save
                </span>
              )}
              <span
                className={styles.summary}
                data-pp-sum="1"
                title={getPolicySummary(state)}
              >
                {getPolicySummary(state)}
              </span>
            </div>
            <div className={styles.existing}>
              {getExistingNote(bookingsCount)}
            </div>
          </div>
          <button
            className={joinClassNames(
              styles.saveButton,
              styles.focusRing,
              canSave ? styles.saveOn : styles.saveOff,
            )}
            data-pp-in="1"
            data-pp-savebtn="1"
            disabled={!canSave}
            onClick={save}
          >
            {flash && (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5"></path>
              </svg>
            )}
            {flash && !isDirty ? "Saved" : "Save policy"}
          </button>
        </div>
      </div>
    </div>
  );
};
