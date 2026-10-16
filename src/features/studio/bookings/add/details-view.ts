import type { ChangeEvent } from "react";
import type { AddContext } from "./context";

export const getDetailsView = ({ state, setState, client }: AddContext) => ({
  isAddressAsked: !!state.profile.mobile && !!client && !client.address,
  addressValue: state.addAddress,
  onAddress: (event: ChangeEvent<HTMLInputElement>) =>
    setState({ addAddress: event.target.value }),
  note: state.addNote,
  onNote: (event: ChangeEvent<HTMLTextAreaElement>) =>
    setState({ addNote: event.target.value }),
});
