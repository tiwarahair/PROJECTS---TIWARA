import type { ChangeEvent, ReactNode } from "react";
import {
  Armchair,
  Car,
  ChevronDown,
  CircleAlert,
  House,
  Lock,
  MapPin,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { AddressFinder } from "../address-finder/address-finder";
import type { AddressFinderValue } from "../address-finder/use-address-finder";
import type { EmittedAddress } from "../address-finder/use-address-finder";
import type { BusinessType } from "./business-details-logic";
import styles from "../../styles/components/business-details/business-details.module.css";

const TYPES: {
  key: BusinessType;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    key: "shop",
    title: "Shop / salon",
    description: "Clients come to your salon",
    icon: Store,
  },
  {
    key: "chair",
    title: "Chair rental",
    description: "You rent a chair in someone else’s salon",
    icon: Armchair,
  },
  {
    key: "home",
    title: "Home-based",
    description: "Clients come to your home",
    icon: House,
  },
  {
    key: "mobile",
    title: "Mobile",
    description: "You travel to your clients",
    icon: Car,
  },
];

const RADIUS_OPTIONS = ["3", "5", "10", "15", "20", "30"];

/** Section with the heading column on the left (wraps above on narrow containers). */
export const Section = ({
  id,
  label,
  heading,
  intro,
  children,
}: {
  id: string;
  label: string;
  heading: string;
  intro?: string;
  children: ReactNode;
}) => (
  <section className={styles.section} data-sec={id} data-screen-label={label}>
    <div className={styles.intro}>
      <h2 className={styles.heading}>{heading}</h2>
      {intro !== undefined && <p className={styles.introText}>{intro}</p>}
    </div>
    {children}
  </section>
);

/** Grid-rows disclosure. */
export const Reveal = ({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) => (
  <div
    className={joinClassNames(
      styles.reveal,
      open ? styles.revealOpen : styles.revealClosed,
    )}
    data-bd-anim="1"
    aria-hidden={open ? "false" : "true"}
  >
    <div className={styles.revealInner}>{children}</div>
  </div>
);

export interface FieldView {
  id: string;
  errorId: string;
  label: string;
  value: string;
  error: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export const FieldError = ({ id, error }: { id: string; error: string }) =>
  error ? (
    <div className={styles.error} id={id} role="alert">
      <CircleAlert className={styles.errorIcon} size={15} strokeWidth={1.5} />
      {error}
    </div>
  ) : null;

export const TypeTiles = ({
  type,
  onPick,
}: {
  type: BusinessType;
  onPick: (type: BusinessType) => void;
}) => (
  <div className={styles.types} role="radiogroup" aria-label="Business type">
    {TYPES.map(({ key, title, description, icon: TypeIcon }) => {
      const isOn = type === key;

      return (
        <button
          key={key}
          className={joinClassNames(
            styles.tile,
            styles.focusRing,
            isOn ? styles.tileOn : styles.tileOff,
          )}
          data-bd-in="1"
          role="radio"
          aria-checked={isOn ? "true" : "false"}
          onClick={() => onPick(key)}
        >
          <span
            className={joinClassNames(
              styles.tileIcon,
              isOn ? styles.tileIconOn : styles.tileIconOff,
            )}
          >
            <TypeIcon size={20} strokeWidth={1.7} />
          </span>
          <span className={styles.tileText}>
            <span
              className={joinClassNames(
                styles.tileTitle,
                isOn ? styles.tileTitleOn : styles.tileTitleOff,
              )}
            >
              {title}
            </span>
            <span className={styles.tileDesc}>{description}</span>
          </span>
          <span
            className={joinClassNames(
              styles.ring,
              isOn ? styles.ringOn : styles.ringOff,
            )}
          >
            <span
              className={joinClassNames(
                styles.dot,
                isOn ? styles.dotOn : styles.dotOff,
              )}
            ></span>
          </span>
        </button>
      );
    })}
  </div>
);

interface LocationCardProps {
  type: BusinessType;
  finderId: string;
  addressValue: AddressFinderValue | null;
  onAddress: (address: EmittedAddress | null) => void;
  showAddressErrors: boolean;
  areaLabel: string;
  basePostcode: FieldView;
  radiusId: string;
  radius: string;
  onRadius: (radius: string) => void;
}

export const LocationCard = ({
  type,
  finderId,
  addressValue,
  onAddress,
  showAddressErrors,
  areaLabel,
  basePostcode,
  radiusId,
  radius,
  onRadius,
}: LocationCardProps) => (
  <div className={styles.card}>
    <Reveal open={type !== "mobile"}>
      <div className={styles.stack}>
        {/* host block for the embedded address finder */}
        <div data-dc-host="">
          <AddressFinder
            idPrefix={finderId}
            label="Address or postcode"
            value={addressValue}
            onChange={onAddress}
            showErrors={showAddressErrors}
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
          <Lock className={styles.privacyIcon} size={18} strokeWidth={1.7} />
          <span>
            Only your area is shown publicly (e.g. Rusholme, M14). Clients see
            your full address once their booking is confirmed.
          </span>
        </div>
        <div>
          <div className={styles.previewLabel}>What clients see</div>
          <div className={styles.preview}>
            <div className={styles.map} aria-hidden="true">
              <span className={styles.radius}></span>
            </div>
            <div className={styles.area}>
              <MapPin className={styles.areaIcon} size={16} strokeWidth={1.7} />
              <span className={styles.areaText}>{areaLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </Reveal>

    <Reveal open={type === "mobile"}>
      <div className={styles.stack}>
        <div>
          <label className={styles.label} htmlFor={basePostcode.id}>
            {basePostcode.label}
          </label>
          <input
            className={joinClassNames(
              styles.postcodeInput,
              styles.focusRing,
              basePostcode.error ? styles.fieldErr : styles.fieldOk,
            )}
            data-bd-in="1"
            id={basePostcode.id}
            type="text"
            autoComplete="postal-code"
            value={basePostcode.value}
            onChange={basePostcode.onChange}
            onBlur={basePostcode.onBlur}
            aria-invalid={basePostcode.error ? "true" : "false"}
            aria-describedby={basePostcode.errorId}
          />
          <FieldError id={basePostcode.errorId} error={basePostcode.error} />
        </div>
        <div>
          <label className={styles.label} htmlFor={radiusId}>
            How far will you travel?
          </label>
          <span className={styles.selectWrap}>
            <select
              className={joinClassNames(styles.select, styles.focusRing)}
              data-bd-in="1"
              id={radiusId}
              value={radius}
              onChange={(event) => onRadius(event.target.value)}
            >
              {RADIUS_OPTIONS.map((miles) => (
                <option key={miles} value={miles}>
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
);
