import { ChevronDown, Lock, MapPin } from "lucide-react";
import { RADII } from "../../features/onboarding/data";
import { joinClassNames } from "../../utils/class-names";
import { AddressFinder } from "../address-finder";
import { getAreaLabel } from "./display";
import { FieldError, Reveal, Section } from "./parts";
import type { BusinessType } from "./types";
import type { BusinessDetailsController } from "./use-business-details";
import styles from "../../styles/components/business-details/location-section.module.css";
import parts from "../../styles/components/business-details/parts.module.css";

const LOCATION_HEADINGS: Partial<Record<BusinessType, string>> = {
  mobile: "Where you work",
  home: "Your address",
};

export const LocationSection = ({
  business,
}: {
  business: BusinessDetailsController;
}) => {
  const {
    uid,
    type,
    address,
    addressSource,
    setAddress,
    getError,
    getBasePostcodeField,
    radiusInput,
  } = business;

  const basePostcode = getBasePostcodeField();

  return (
    <Section
      id="location"
      label="Location"
      heading={LOCATION_HEADINGS[type] ?? "Salon address"}
    >
      <div className={parts.card}>
        <Reveal open={type !== "mobile"}>
          <div className={styles.stack}>
            {/* host block for the embedded address finder */}
            <div data-dc-host="">
              <AddressFinder
                idPrefix={`${uid}-addr`}
                label="Address or postcode"
                value={
                  address.line1
                    ? {
                        line1: address.line1,
                        line2: address.line2,
                        town: address.city,
                        postcode: address.postcode,
                        source: addressSource || "pick",
                      }
                    : null
                }
                onChange={setAddress}
                showErrors={!!getError("address")}
                fieldHeight={44}
                labelSize={15}
              />
            </div>
            {(type === "shop" || type === "chair") && (
              <div className={styles.note}>
                Shown on your profile and booking page.
              </div>
            )}
          </div>
        </Reveal>

        <Reveal open={type === "home"}>
          <div className={styles.homeStack}>
            <div className={styles.privacy} role="note">
              <Lock
                className={styles.privacyIcon}
                size={18}
                strokeWidth={1.7}
              />
              <span>
                Only your area is shown publicly (e.g. Rusholme, M14). Clients
                see your full address once their booking is confirmed.
              </span>
            </div>
            <div>
              <div className={styles.previewLabel}>What clients see</div>
              <div className={styles.preview}>
                <div className={styles.map} aria-hidden="true">
                  <span className={styles.radius}></span>
                </div>
                <div className={styles.area}>
                  <MapPin
                    className={styles.areaIcon}
                    size={16}
                    strokeWidth={1.7}
                  />
                  <span className={parts.areaText}>
                    {getAreaLabel(address.postcode)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal open={type === "mobile"}>
          <div className={styles.stack}>
            <div>
              <label className={parts.label} htmlFor={basePostcode.id}>
                {basePostcode.label}
              </label>
              <input
                className={joinClassNames(
                  styles.postcodeInput,
                  parts.focusRing,
                  basePostcode.error ? parts.fieldErr : parts.fieldOk,
                )}
                data-bd-in="1"
                id={basePostcode.id}
                type="text"
                autoComplete="postal-code"
                {...basePostcode.input}
                aria-invalid={basePostcode.error ? "true" : "false"}
                aria-describedby={basePostcode.errorId}
              />
              <FieldError
                id={basePostcode.errorId}
                error={basePostcode.error}
              />
            </div>
            <div>
              <label className={parts.label} htmlFor={`${uid}-rad`}>
                How far will you travel?
              </label>
              <span className={styles.selectWrap}>
                <select
                  className={joinClassNames(styles.select, parts.focusRing)}
                  data-bd-in="1"
                  id={`${uid}-rad`}
                  {...radiusInput}
                >
                  {RADII.map((miles) => (
                    <option key={miles} value={String(miles)}>
                      {`${miles} miles`}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className={styles.selectChevron}
                  size={16}
                  strokeWidth={2}
                />
              </span>
            </div>
            <div className={styles.note}>
              Clients enter their own address when they book.
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
};
