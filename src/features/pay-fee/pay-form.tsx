import { LinkPayment } from "../../components/link-payment";
import type { PaymentLink } from "../../lib/payment-link-api";
import { useStartLinkPaymentMutation } from "../../stores/api-slice";
import { formatPence, LINK_PAY_ERRORS } from "./logic";

interface PayFormProps {
  link: PaymentLink;
  token: string;
  onPaid: () => void;
}

export const PayForm = ({ link, token, onPaid }: PayFormProps) => {
  const [startPayment] = useStartLinkPaymentMutation();

  return (
    <LinkPayment
      amountPence={link.amount_pence}
      isSavingCard={false}
      payLabel={`Pay ${formatPence(link.amount_pence)}`}
      getClientSecret={async (turnstileToken) =>
        (await startPayment({ token, turnstileToken }).unwrap()).clientSecret
      }
      refusals={LINK_PAY_ERRORS}
      onPaid={onPaid}
    />
  );
};
