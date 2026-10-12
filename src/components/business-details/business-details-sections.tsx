import type { ChangeEvent, ReactNode } from "react";
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
  icon: string;
}[] = [
  {
    key: "shop",
    title: "Shop / salon",
    description: "Clients come to your salon",
    icon: "M4 10v10h16V10M3 10l1.6-6h14.8L21 10M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3M10 20v-5h4v5",
  },
  {
    key: "chair",
    title: "Chair rental",
    description: "You rent a chair in someone else’s salon",
    icon: "M8 3h8a1 1 0 0 1 1 1v6H7V4a1 1 0 0 1 1-1zM5 10h14v4H5zM12 14v4M8 21h8M12 18v3",
  },
  {
    key: "home",
    title: "Home-based",
    description: "Clients come to your home",
    icon: "M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-6h4v6",
  },
  {
    key: "mobile",
    title: "Mobile",
    description: "You travel to your clients",
    icon: "M3 16V11l2.2-5h9.3l4 5H21v5M3 16h2M9 16h6M19 16h2M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  },
];

const RADIUS_OPTIONS = ["3", "5", "10", "15", "20", "30"];

export const ErrorIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 7v6M12 16.5v.5"></path>
  </svg>
);

export const TickIcon = ({
  className,
  size,
  strokeWidth,
  stroke = "currentColor",
}: {
  className?: string;
  size: number;
  strokeWidth: string;
  stroke?: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12.5l4.5 4.5L19 7.5"></path>
  </svg>
);

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
      <ErrorIcon className={styles.errorIcon} />
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
    {TYPES.map(({ key, title, description, icon }) => {
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={icon}></path>
            </svg>
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
          <svg
            className={styles.privacyIcon}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="11" width="14" height="10" rx="2"></rect>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
          </svg>
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
              <svg
                className={styles.areaIcon}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"></path>
                <circle cx="12" cy="9" r="2.5"></circle>
              </svg>
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
            <svg
              className={styles.selectChevron}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </span>
        </div>
        <div className={styles.note}>
          Clients enter their own address when they book.
        </div>
      </div>
    </Reveal>
  </div>
);
