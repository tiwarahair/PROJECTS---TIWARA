import type { CSSProperties } from "react";
import { hairColours } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import { formatDuration } from "../../utils/services";
import helmet from "../../styles/features/booking/booking-helmet.module.css";
import { getDeltaLabel } from "./booking-pricing";
import type { Selection } from "./booking-state";
import step from "../../styles/features/booking/booking-step.module.css";
import styles from "../../styles/features/booking/step-customise.module.css";
import type { BookingController } from "./use-booking";

interface StepCustomiseProps {
  booking: BookingController;
}

interface ChipProps {
  label: string;
  delta: string;
  on: boolean;
  onPick: () => void;
  /** Own customisations are radios; size and length are toggle buttons. */
  isRadio?: boolean;
}

const OptionChip = ({ label, delta, on, onPick, isRadio }: ChipProps) => {
  const ariaState = on ? "true" : "false";

  return (
    <button
      role={isRadio ? "radio" : undefined}
      aria-checked={isRadio ? ariaState : undefined}
      aria-pressed={isRadio ? undefined : ariaState}
      onClick={onPick}
      className={joinClassNames(
        styles.chip,
        on ? styles.chipOn : styles.chipOff,
      )}
    >
      {label}
      {!!delta && <span className={styles.delta}>{delta}</span>}
    </button>
  );
};

const getChooseHint = (needSize: boolean, needLength: boolean): string => {
  if (needSize && needLength) return "Choose a size and length";

  return needSize ? "Choose a size" : "Choose a length";
};

export const CheckBox = ({ on }: { on: boolean }) => (
  <span className={joinClassNames(step.box, on ? step.boxOn : step.boxOff)}>
    {on && (
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fffefb"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    )}
  </span>
);

/** Step 2 (Make it yours): size, length, colour, own customisations and add-ons. */
export const StepCustomise = ({ booking }: StepCustomiseProps) => {
  const { state, stylist, service, options, needSize, needLength, actions } =
    booking;

  const { setState } = actions;
  const { selection } = state;
  const serviceName = service ? service.name : "Appointment";

  // size, length and add-ons change the duration, so they clear the chosen time
  const pickTimed = (patch: Partial<Selection>) =>
    setState((current) => ({
      selection: { ...current.selection, ...patch },
      date: null,
      time: null,
    }));

  return (
    <>
      <h1 className={step.title}>Make it yours</h1>
      <p className={step.lead}>
        {`${serviceName} with ${stylist.name} — price and time update as you choose.`}
      </p>
      <div className={joinClassNames(helmet.custgrid, styles.grid)}>
        <div>
          {options.size.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sizeHead}>
                <div className={styles.sizeLabel}>Size / thickness</div>
                <button
                  onClick={() => setState({ sizeGuide: true })}
                  className={styles.sizeGuide}
                >
                  Size guide{" "}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h13M13 6.5 18.5 12 13 17.5"></path>
                  </svg>
                </button>
              </div>
              <div className={styles.chips}>
                {options.size.map((option) => (
                  <OptionChip
                    key={option.label}
                    label={option.label}
                    delta={getDeltaLabel(option)}
                    on={selection.size === option.label}
                    onPick={() => pickTimed({ size: option.label })}
                  />
                ))}
              </div>
            </div>
          )}
          {options.length.length > 0 && (
            <div className={styles.section}>
              <div className={styles.label}>Length</div>
              <div className={styles.chips}>
                {options.length.map((option) => (
                  <OptionChip
                    key={option.label}
                    label={option.label}
                    delta={getDeltaLabel(option)}
                    on={selection.length === option.label}
                    onPick={() => pickTimed({ length: option.label })}
                  />
                ))}
              </div>
            </div>
          )}
          {options.colour && (
            <div className={styles.section}>
              <div className={styles.colourLabel}>Colour</div>
              <div className={styles.colourNote}>
                {`Doesn't affect the price — ${stylist.name} will see your pick.`}
              </div>
              <div className={styles.swatches}>
                {hairColours.map(({ name, hex }) => {
                  const on = selection.colour === name;
                  // o.style background: the colour's hex (or gradient)
                  const swatchStyle = { "--swatch": hex } as CSSProperties;

                  return (
                    <span
                      key={name}
                      className={joinClassNames(
                        helmet.swwrap,
                        on && helmet.swwrapOn,
                        styles.swatchWrap,
                      )}
                    >
                      <button
                        onClick={() =>
                          setState({
                            selection: { ...selection, colour: name },
                          })
                        }
                        aria-label={name}
                        title={name}
                        className={joinClassNames(
                          styles.swatch,
                          on && styles.swatchOn,
                        )}
                        style={swatchStyle}
                      ></button>
                      <span className={helmet.swtip}>{name}</span>
                      <span className={helmet.swname}>{name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {options.own.map(({ name, options: ownOptions }, groupIndex) => (
            <div key={name} className={styles.section}>
              <div id={`own-${groupIndex}`} className={styles.label}>
                {name}
              </div>
              <div
                role="radiogroup"
                aria-labelledby={`own-${groupIndex}`}
                className={styles.chips}
              >
                {ownOptions.map((option) => (
                  <OptionChip
                    key={option.label}
                    label={option.label}
                    delta={getDeltaLabel(option, true)}
                    on={selection.own[name] === option.label}
                    isRadio
                    onPick={() =>
                      setState((current) => ({
                        selection: {
                          ...current.selection,
                          own: {
                            ...current.selection.own,
                            [name]: option.label,
                          },
                        },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          ))}
          {options.addons.length > 0 && (
            <div>
              <div className={styles.label}>Add-ons</div>
              <div className={styles.addons}>
                {options.addons.map(({ name, price, minutes }) => {
                  const on = selection.addons.includes(name);

                  const timeExtra = minutes
                    ? ` · +${formatDuration(minutes)}`
                    : "";

                  return (
                    <button
                      key={name}
                      onClick={() =>
                        pickTimed({
                          addons: on
                            ? selection.addons.filter((addon) => addon !== name)
                            : selection.addons.concat(name),
                        })
                      }
                      className={joinClassNames(
                        styles.addon,
                        on ? styles.addonOn : styles.addonOff,
                      )}
                    >
                      <span className={styles.addonLabel}>
                        <CheckBox on={on} />
                        {name}
                      </span>
                      <span className={styles.addonMeta}>
                        {`+£${price}${timeExtra}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {state.step === 2 && (needSize || needLength) && (
            <div role="status" className={styles.hint}>
              {getChooseHint(needSize, needLength)}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
