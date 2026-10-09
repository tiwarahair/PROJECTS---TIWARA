import { Link } from "react-router";
import { AddressFinder } from "../../components/address-finder/address-finder";
import { joinClassNames } from "../../utils/class-names";
import { EMPTY_ADDRESS } from "./booking-state";
import fields from "./booking-fields.module.css";
import styles from "./appointment-address.module.css";
import type { BookingController } from "./use-booking";

interface AppointmentAddressProps {
  booking: BookingController;
}

const NEW_ADDRESS_ID = "new";

/** Mobile stylists: saved-address cards (logged in), the address finder, the travel-area check and access notes. */
export const AppointmentAddress = ({ booking }: AppointmentAddressProps) => {
  const { state, stylist, address, actions } = booking;
  const { setState } = actions;
  const { saved, savedSel, addr } = state;
  const cards = saved
    .map(({ id, label, def, line1, line2, town, postcode }) => ({
      id,
      label,
      def,
      line: [line1, line2, town].filter(Boolean).join(", ") + " " + postcode,
    }))
    .concat([
      {
        id: NEW_ADDRESS_ID,
        label: "A different address",
        def: false,
        line: "Search for an address or postcode",
      },
    ]);
  const pickCard = (id: string) => {
    const picked = saved.find((item) => item.id === id);
    if (id === NEW_ADDRESS_ID || !picked)
      setState(({ addr: current }) => ({
        savedSel: NEW_ADDRESS_ID,
        addr: { ...EMPTY_ADDRESS, notes: current.notes },
      }));
    else
      setState(({ addr: current }) => ({
        savedSel: id,
        addr: {
          line1: picked.line1,
          line2: picked.line2 || "",
          town: picked.town,
          postcode: picked.postcode,
          source: "saved",
          notes: current.notes,
        },
      }));
  };

  return (
    <section data-screen-label="Appointment address" className={styles.section}>
      <h2 className={fields.heading}>
        {"Where should " + stylist.name + " come to?"}
      </h2>
      {saved.length > 0 && (
        <div
          role="radiogroup"
          aria-label="Your saved addresses"
          data-screen-label="Saved address cards"
          className={styles.cards}
        >
          {cards.map(({ id, label, def, line }) => {
            const on = savedSel === id;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={on ? "true" : "false"}
                onClick={() => pickCard(id)}
                className={joinClassNames(
                  styles.card,
                  on ? styles.cardOn : styles.cardOff,
                )}
              >
                <span
                  className={joinClassNames(
                    styles.cardLabel,
                    on ? styles.cardLabelOn : styles.cardLabelOff,
                  )}
                >
                  {label}
                  {def && <span className={styles.defaultTag}>Default</span>}
                </span>
                <span className={styles.cardLine}>{line}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className={fields.grid}>
        <div className={styles.finderColumn}>
          {(!saved.length || savedSel === NEW_ADDRESS_ID) && (
            // plain block wrapper = the prototype runtime's .sc-host around the embedded finder
            <div data-dc-host="">
              <AddressFinder
                idPrefix="bk-addr"
                label="Address or postcode"
                value={addr.line1 || addr.postcode ? addr : null}
                onChange={(next) =>
                  setState(({ addr: current }) => ({
                    addr: next
                      ? { ...next, notes: current.notes }
                      : { ...EMPTY_ADDRESS, notes: current.notes },
                  }))
                }
                showErrors={state.showErrs}
                fieldHeight={50}
                labelSize={12.5}
                labelColor="secondary"
              />
            </div>
          )}
          <div id="bk-area" aria-live="polite">
            {address.inArea && (
              <div className={styles.areaIn}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                </svg>
                {"Inside " + stylist.name + "'s travel area"}
              </div>
            )}
            {address.outBlock && (
              <div role="alert" className={styles.areaOut}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className={fields.errorIcon}
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 7v6M12 16.5v.5"></path>
                </svg>
                <span>
                  {"This address is outside " +
                    stylist.name +
                    "'s travel area (up to " +
                    stylist.travelMiles +
                    " miles). Try another address or find a stylist near you."}{" "}
                  <Link
                    to={
                      "/search?loc=" + encodeURIComponent(address.postcodeLabel)
                    }
                    onClick={actions.onLeaveLink}
                    className={styles.nearLink}
                  >
                    Find stylists near this address
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>
        <div className={fields.fieldWide}>
          <label htmlFor="bk-access" className={fields.label}>
            Access notes <span className={fields.optional}>(optional)</span>
          </label>
          <textarea
            id="bk-access"
            rows={2}
            placeholder="Parking, buzzer number, floor…"
            value={addr.notes}
            onChange={(event) =>
              setState(({ addr: current }) => ({
                addr: { ...current, notes: event.target.value.slice(0, 300) },
              }))
            }
            className={styles.accessNotes}
          ></textarea>
        </div>
      </div>
    </section>
  );
};
