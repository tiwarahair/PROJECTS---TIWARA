import { Check, CircleAlert } from "lucide-react";
import { useFormState } from "react-hook-form";
import { Link } from "react-router";
import { AddressFinder } from "../../components/address-finder";
import { joinClassNames } from "../../utils/class-names";
import { EMPTY_ADDRESS } from "./logic/constants";
import fields from "../../styles/features/booking/fields.module.css";
import styles from "../../styles/features/booking/appointment-address.module.css";
import type { BookingController } from "./hooks/use-booking";

interface AppointmentAddressProps {
  booking: BookingController;
}

const NEW_ADDRESS_ID = "new";

/** Mobile stylists: saved-address cards (logged in), the address finder, the travel-area check and access notes. */
export const AppointmentAddress = ({ booking }: AppointmentAddressProps) => {
  const { state, stylist, address, actions, detailsForm } = booking;
  const { isSubmitted } = useFormState({ control: detailsForm.control });
  const { setState } = actions;
  const { saved, selectedAddressId, appointmentAddress } = state;

  const cards = saved
    .map(({ id, label, isDefault, line1, line2, town, postcode }) => ({
      id,
      label,
      isDefault,
      line: `${[line1, line2, town].filter(Boolean).join(", ")} ${postcode}`,
    }))
    .concat([
      {
        id: NEW_ADDRESS_ID,
        label: "A different address",
        isDefault: false,
        line: "Search for an address or postcode",
      },
    ]);

  const pickCard = (id: string) => {
    const picked = saved.find((item) => item.id === id);

    if (id === NEW_ADDRESS_ID || !picked)
      setState(({ appointmentAddress: current }) => ({
        selectedAddressId: NEW_ADDRESS_ID,
        appointmentAddress: { ...EMPTY_ADDRESS, notes: current.notes },
      }));
    else
      setState(({ appointmentAddress: current }) => ({
        selectedAddressId: id,
        appointmentAddress: {
          line1: picked.line1,
          line2: picked.line2 || "",
          town: picked.town,
          postcode: picked.postcode,
          source: "saved",
          notes: current.notes,
          lat: picked.lat ?? null,
          lng: picked.lng ?? null,
        },
      }));
  };

  return (
    <section data-screen-label="Appointment address" className={styles.section}>
      <h2 className={fields.heading}>
        {`Where should ${stylist.name} come to?`}
      </h2>
      {saved.length > 0 && (
        <div
          role="radiogroup"
          aria-label="Your saved addresses"
          data-screen-label="Saved address cards"
          className={styles.cards}
        >
          {cards.map(({ id, label, isDefault, line }) => {
            const on = selectedAddressId === id;

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
                  {isDefault && (
                    <span className={styles.defaultTag}>Default</span>
                  )}
                </span>
                <span className={styles.cardLine}>{line}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className={fields.grid}>
        <div className={styles.finderColumn}>
          {(!saved.length || selectedAddressId === NEW_ADDRESS_ID) && (
            // plain block wrapper around the embedded finder
            <div data-dc-host="">
              <AddressFinder
                idPrefix="bk-addr"
                label="Address or postcode"
                value={
                  appointmentAddress.line1 || appointmentAddress.postcode
                    ? appointmentAddress
                    : null
                }
                onChange={(next) =>
                  setState(({ appointmentAddress: current }) => ({
                    appointmentAddress: next
                      ? { ...next, notes: current.notes }
                      : { ...EMPTY_ADDRESS, notes: current.notes },
                  }))
                }
                showErrors={isSubmitted}
                fieldHeight={50}
                labelSize={12.5}
                labelColor="secondary"
              />
            </div>
          )}
          <div id="bk-area" aria-live="polite">
            {address.inArea && (
              <div className={styles.areaIn}>
                <Check size={15} strokeWidth={2} />
                {`Inside ${stylist.name}'s travel area`}
              </div>
            )}
            {address.outBlock && (
              <div role="alert" className={styles.areaOut}>
                <CircleAlert
                  size={15}
                  strokeWidth={1.8}
                  className={fields.errorIcon}
                />
                <span>
                  {`This address is outside ${stylist.name}'s travel area (up to ${stylist.travelMiles} miles). Try another address or find a stylist near you.`}{" "}
                  <Link
                    to={`/search?loc=${encodeURIComponent(address.postcodeLabel)}`}
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
            value={appointmentAddress.notes}
            onChange={(event) =>
              setState(({ appointmentAddress: current }) => ({
                appointmentAddress: {
                  ...current,
                  notes: event.target.value.slice(0, 300),
                },
              }))
            }
            className={styles.accessNotes}
          ></textarea>
        </div>
      </div>
    </section>
  );
};
