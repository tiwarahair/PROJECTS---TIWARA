import { getAddressLine } from "../logic";
import type { AccountController } from "../use-account";
import type { AccountView } from "../view";
import { closeThen } from "./close-then";
import { Confirm } from "./confirm";

interface AllergyRemoveProps {
  account: AccountController;
  view: AccountView;
  index: number;
}

export const AllergyRemove = ({ account, view, index }: AllergyRemoveProps) => (
  <Confirm
    title="Remove this?"
    text={`${view.getStylistName(account.state.entries[index]?.id ?? "")} won’t see it any more.`}
    action="Remove"
    onCancel={account.actions.closeDialog}
    onConfirm={() => {
      closeThen(account, ({ entries: current }) => ({
        entries: current.map((entry, position) =>
          position === index ? { ...entry, text: "" } : entry,
        ),
        dialog: null,
      }));

      account.actions.showToast("Removed");
    }}
  />
);

interface CardRemoveProps {
  account: AccountController;
  id: string;
}

export const CardRemove = ({ account, id }: CardRemoveProps) => {
  const { cards } = account.state;
  const card = cards.find((item) => item.id === id);

  const defaultNote =
    card?.isDefault && cards.length > 1
      ? " Your other card becomes your default."
      : "";

  return (
    <Confirm
      title="Remove this card?"
      text={`${card?.brand} ending ${card?.last4} will be removed from your account.${defaultNote}`}
      action="Remove card"
      onCancel={account.actions.closeDialog}
      onConfirm={() => {
        closeThen(account, ({ cards: current }) => {
          let list = current.filter((item) => item.id !== id);

          if (card?.isDefault && list.length)
            list = list.map((item, index) => ({
              ...item,
              isDefault: index === 0,
            }));

          return { cards: list, dialog: null };
        });

        account.actions.showToast("Card removed");
      }}
    />
  );
};

interface LogoutAllProps {
  account: AccountController;
}

export const LogoutAll = ({ account: { actions } }: LogoutAllProps) => (
  <Confirm
    title="Log out of all devices?"
    text="You’ll be logged out everywhere you use Tiwára's House, including here. Your bookings and details stay as they are."
    action="Log out everywhere"
    onCancel={actions.closeDialog}
    onConfirm={() => {
      actions.setState({ dialog: null, loggedOut: true });
      actions.endSession();
      actions.showToast("You’re logged out of all devices");
    }}
  />
);

interface AddressRemoveProps {
  account: AccountController;
  id: string;
}

export const AddressRemove = ({ account, id }: AddressRemoveProps) => {
  const { addresses } = account.state;
  const address = addresses.find((item) => item.id === id);

  return (
    <Confirm
      title="Remove this address?"
      text={
        address
          ? `${address.label} at ${getAddressLine(address)} will be removed.`
          : ""
      }
      action="Remove"
      onCancel={account.actions.closeDialog}
      onConfirm={() => {
        let list = addresses.filter((item) => item.id !== id);

        if (address?.isDefault && list.length)
          list = list.map((item, index) => ({
            ...item,
            isDefault: index === 0,
          }));

        account.actions.setAddresses(list);
        closeThen(account, { dialog: null });
        account.actions.showToast("Address removed");
      }}
    />
  );
};

interface SyncResetProps {
  account: AccountController;
}

export const SyncReset = ({ account }: SyncResetProps) => (
  <Confirm
    title="Reset your calendar link?"
    text="The old link will stop working."
    action="Reset link"
    onCancel={account.actions.closeDialog}
    onConfirm={() => {
      closeThen(account, {
        sync: Math.random().toString(36).slice(2, 10),
        dialog: null,
      });

      account.actions.showToast("New calendar link created");
    }}
  />
);
