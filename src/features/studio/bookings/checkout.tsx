import type {
  CheckoutBooking,
  CheckoutView,
  MenuGroup,
} from "../../../components/checkout/data";
import { CheckoutSheet } from "../../../components/checkout";
import type { CheckoutSheetProps } from "../../../components/checkout/use-checkout";
import type { StudioController } from "../core/use-studio";
import sheet from "../../../styles/features/studio/shell/sheet-frame.module.css";
import { formatDuration } from "../../../utils/dates";

export interface StudioCheckoutProps {
  studio: StudioController;
  booking: CheckoutBooking;
  start?: CheckoutView;
  done?: CheckoutSheetProps["done"];
  refunded?: number;
  onExit: () => void;
  onComplete: NonNullable<CheckoutSheetProps["onComplete"]>;
  onRefund?: (amount: number, reason: string) => void;
}

/** CheckoutSheet over a Studio sheet. */
export const StudioCheckout = ({
  studio,
  booking,
  start = "items",
  done,
  refunded = 0,
  onExit,
  onComplete,
  onRefund = () => {},
}: StudioCheckoutProps) => {
  const { state, isWide, props, actions } = studio;
  const { business } = state;
  const fields = business.details || {};

  const addons = state.addons
    .filter(({ status }) => status !== "archived")
    .map(({ name, price, hours, min }) => {
      const minutes = (Number(hours) || 0) * 60 + (Number(min) || 0);

      return [
        name,
        Number(price) || 0,
        minutes ? `+${formatDuration(minutes)}` : "Add-on",
      ] as [string, number, string];
    });

  const services = state.services
    .filter(({ status }) => status !== "archived")
    .map(
      ({ name, price, duration }) =>
        [name, price || 0, duration || ""] as [string, number, string],
    );

  const menu: MenuGroup[] = [
    { title: "Add-ons", rows: addons },
    { title: "Services", rows: services },
  ].filter(({ rows }) => rows.length);

  return (
    <div className={sheet.checkout} data-screen-label="Checkout">
      <CheckoutSheet
        booking={booking}
        start={start}
        done={done}
        refunded={refunded}
        linkPaid={false}
        layout={isWide ? "desktop" : "mobile"}
        radius={isWide ? "var(--radius-lg)" : "24px 24px 0 0"}
        stylist={{
          name: state.profile?.salon || "Tiwára’s House",
          address: [fields.line1, fields.city, fields.postcode]
            .filter(Boolean)
            .join(", "),
          vat: business.vatOn && fields.vat ? `GB ${fields.vat}` : "",
        }}
        declineMode={props.cardDeclines || "none"}
        menu={menu}
        onExit={onExit}
        onClose={actions.closeSheet}
        onComplete={onComplete}
        onRefund={onRefund}
        onResent={() => {}}
        onCancelLink={() => {}}
      />
    </div>
  );
};
