import type { ChangeEvent } from "react";
import type { AddContext } from "./context";

export const getDetailsView = ({
  state,
  setState,
  client,
  clientFirst,
  hasNoEmail,
}: AddContext) => ({
  isAddressAsked: !!state.profile.mobile && !!client && !client.address,
  addressValue: state.addAddress,
  onAddress: (event: ChangeEvent<HTMLInputElement>) =>
    setState({ addAddress: event.target.value }),
  noEmailNote: hasNoEmail
    ? `No email, so ${clientFirst} won’t get reminders, receipts or a link to manage the booking.`
    : "",
  note: state.addNote,
  onNote: (event: ChangeEvent<HTMLTextAreaElement>) =>
    setState({ addNote: event.target.value }),
});
