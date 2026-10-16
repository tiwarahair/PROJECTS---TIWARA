import { Ellipsis, Info, Lock, Plus } from "lucide-react";
import { Controller, useFormState } from "react-hook-form";
import { AddressFinder } from "../../components/address-finder/address-finder";
import { joinClassNames } from "../../utils/class-names";
import { getAddressLine } from "./account-logic";
import type { AccountController } from "./use-account";
import styles from "../../styles/features/account/wallet-sections.module.css";
import ui from "../../styles/features/account/account-ui.module.css";

interface PaymentsSectionProps {
  account: AccountController;
  /** "Wed 14 Oct" when the card secures an upcoming booking, else "". */
  getCardInUse: (cardId: string) => string;
}

const getCardMark = (brand: string) => {
  if (brand === "Visa") return "VISA";

  if (brand === "Mastercard") return "MC";

  return brand.toUpperCase().slice(0, 4);
};

export const PaymentsSection = ({
  account: { state, actions },
  getCardInUse,
}: PaymentsSectionProps) => (
  <section data-screen-label="Account: Payment methods">
    {state.cards.length > 0 && (
      <div className={ui.list}>
        {state.cards.map(({ id, brand, last4, expiry, isDefault }) => {
          const inUse = getCardInUse(id);

          return (
            <div key={id} className={styles.card}>
              <span className={styles.cardMark} aria-hidden="true">
                {getCardMark(brand)}
              </span>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>
                  <span className={ui.strongText}>
                    {brand}
                    {" •••• "}
                    {last4}
                  </span>
                  {isDefault && <span className={ui.defaultTag}>Default</span>}
                </div>
                <div className={ui.muted}>
                  {"Expires "}
                  {expiry}
                </div>
                {!!inUse && (
                  <div className={styles.inUse}>
                    <Lock size={14} strokeWidth={1.5} />
                    <span>{`In use for your booking on ${inUse}`}</span>
                  </div>
                )}
              </div>
              <div className={styles.cardActions}>
                {!isDefault && (
                  <button
                    className={styles.cardButton}
                    onClick={() => {
                      actions.setState(({ cards }) => ({
                        cards: cards.map((card) => ({
                          ...card,
                          isDefault: card.id === id,
                        })),
                      }));

                      actions.showToast(
                        `${brand} •••• ${last4} is now your default card`,
                      );
                    }}
                  >
                    Make default
                  </button>
                )}
                {!inUse && (
                  <button
                    className={styles.cardButton}
                    onClick={() => actions.openDialog({ kind: "card", id })}
                    aria-label={`Remove ${brand} ending ${last4}`}
                  >
                    Remove
                  </button>
                )}
                {!!inUse && (
                  <span
                    className={styles.inUseNote}
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                    tabIndex={0}
                    role="note"
                    aria-label="This card is needed for your booking until it’s over"
                    title="This card is needed for your booking until it’s over"
                  >
                    <Info size={18} strokeWidth={1.7} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
    {!state.cards.length && (
      <p className={ui.emptyLine} data-screen-label="Payment methods empty">
        No saved cards. You can save a card when you book.
      </p>
    )}
    <button
      className={styles.addCard}
      onClick={() => actions.openDialog({ kind: "addCard" })}
    >
      <Plus size={16} strokeWidth={1.7} />
      Add a card
    </button>
  </section>
);

interface AddressFormFieldsProps {
  account: AccountController;
  showDefault: boolean;
}

/** Label, AddressFinder, default checkbox and Save / Cancel (shared by add and edit). */
const AddressFormFields = ({
  account: { actions, forms },
  showDefault,
}: AddressFormFieldsProps) => {
  const { register, control } = forms.address;
  const { isSubmitted } = useFormState({ control });

  return (
    <>
      <label className={ui.label}>
        Label
        <span className={styles.optionalHint}>Optional</span>
        <input
          className={styles.labelInput}
          {...register("label")}
          placeholder="e.g. Home"
          maxLength={30}
        />
      </label>
      {/* plain block wrapper (the finder is not a flex item of the form) */}
      <div data-dc-host="">
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <AddressFinder
              idPrefix="ac-addr"
              label="Address or postcode"
              value={field.value}
              onChange={field.onChange}
              showErrors={isSubmitted}
              fieldHeight={48}
            />
          )}
        />
      </div>
      {showDefault && (
        <label className={ui.checkLabel}>
          <input
            className={ui.checkbox}
            type="checkbox"
            {...register("isDefault")}
          />
          Make this my default address
        </label>
      )}
      <div className={ui.actions}>
        <button className={ui.save} onClick={() => void actions.saveAddress()}>
          Save address
        </button>
        <button
          className={ui.cancel}
          onClick={() => actions.setState({ addressForm: null })}
        >
          Cancel
        </button>
      </div>
    </>
  );
};

export const AddressesSection = ({
  account,
}: {
  account: AccountController;
}) => {
  const { state, actions, forms } = account;
  const { addresses, addressForm: form, addressMenu } = state;
  const { setState, showToast, focusLater } = actions;
  const isEditing = form?.mode === "edit";

  const showDefault =
    addresses.length > (isEditing ? 1 : 0) &&
    !(
      isEditing &&
      addresses.find(({ id, isDefault }) => id === form?.id && isDefault)
    );

  return (
    <section data-screen-label="Account: Saved addresses">
      {addresses.length > 0 && (
        <div className={ui.list}>
          {addresses.map((address, index) => {
            const { id, label, isDefault } = address;
            const isOpen = addressMenu === id;
            const menuLabel = `Options for address ${index + 1}`;
            const isThisEditing = isEditing && form?.id === id;

            return (
              <div key={id} className={ui.row}>
                {!isThisEditing && (
                  <div className={styles.addrRow}>
                    <div className={styles.addrMain}>
                      <div className={ui.rowLabel}>
                        {`Address ${index + 1}`}
                      </div>
                      <div className={styles.addrBody}>
                        <div className={styles.addrTitle}>
                          {label}
                          {isDefault && (
                            <span className={ui.defaultTag}>Default</span>
                          )}
                        </div>
                        <div className={ui.value}>
                          {getAddressLine(address)}
                        </div>
                      </div>
                    </div>
                    <div className={styles.menuWrap}>
                      <button
                        className={joinClassNames(
                          styles.dots,
                          isOpen ? styles.dotsOpen : styles.dotsClosed,
                          !!form && ui.dimmed,
                        )}
                        onClick={() =>
                          setState(({ addressMenu: current }) => ({
                            addressMenu: current === id ? null : id,
                          }))
                        }
                        disabled={!!form}
                        aria-label={menuLabel}
                        aria-haspopup="menu"
                        aria-expanded={isOpen ? "true" : "false"}
                      >
                        <Ellipsis size={18} />
                      </button>
                      {isOpen && (
                        <>
                          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                          <div
                            className={styles.menuScrim}
                            onClick={() => setState({ addressMenu: null })}
                          ></div>
                          <div
                            className={styles.menu}
                            role="menu"
                            aria-label={menuLabel}
                          >
                            <button
                              className={styles.menuItem}
                              role="menuitem"
                              onClick={() => {
                                forms.address.reset({
                                  label,
                                  address: {
                                    line1: address.line1,
                                    line2: address.line2,
                                    town: address.town,
                                    postcode: address.postcode,
                                    source: "manual",
                                  },
                                  isDefault,
                                });

                                setState(
                                  {
                                    addressMenu: null,
                                    addressForm: { mode: "edit", id },
                                  },
                                  () => focusLater("address"),
                                );
                              }}
                            >
                              Edit
                            </button>
                            {!isDefault && (
                              <button
                                className={styles.menuItem}
                                role="menuitem"
                                onClick={() => {
                                  setState({ addressMenu: null });

                                  actions.setAddresses(
                                    addresses.map((item) => ({
                                      ...item,
                                      isDefault: item.id === id,
                                    })),
                                  );

                                  showToast(
                                    `${label} is now your default address`,
                                  );
                                }}
                              >
                                Make default
                              </button>
                            )}
                            <button
                              className={styles.menuRemove}
                              role="menuitem"
                              onClick={() => {
                                setState({ addressMenu: null });
                                actions.openDialog({ kind: "address", id });
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {isThisEditing && form && (
                  <div data-screen-label="Edit address">
                    <div className={styles.addrForm}>
                      <div className={ui.strongText}>Edit address</div>
                      <AddressFormFields
                        account={account}
                        showDefault={showDefault}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!addresses.length && form?.mode !== "add" && (
        <p className={ui.emptyLine} data-screen-label="Saved addresses empty">
          No saved addresses. Save one to book mobile stylists faster.
        </p>
      )}
      {form?.mode === "add" && (
        <div className={styles.addPanel} data-screen-label="Add an address">
          <div className={styles.addrForm}>
            <h2 className={styles.addTitle}>Add an address</h2>
            <AddressFormFields account={account} showDefault={showDefault} />
          </div>
        </div>
      )}
      {!form && (
        <button
          className={styles.addAddress}
          onClick={() => {
            forms.address.reset({ label: "", address: null, isDefault: false });

            setState({ addressForm: { mode: "add" } }, () =>
              focusLater("address"),
            );
          }}
        >
          <Plus className={ui.icon} size={16} strokeWidth={1.7} />
          Add an address
        </button>
      )}
    </section>
  );
};
