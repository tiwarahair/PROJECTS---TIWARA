import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useNavigate, useSearchParams } from "react-router";
import { useAccountPhoto } from "../../hooks/use-account-photo";
import { useIdentity } from "../../hooks/use-identity";
import { useSavedAddresses } from "../../hooks/use-saved-addresses";
import {
  useDeleteClientAddressMutation,
  useGetClientBookingsQuery,
  useGetClientCardsQuery,
  useRemoveClientCardMutation,
  useSaveClientAddressMutation,
  useSetAccountPhotoMutation,
  useSetDefaultCardMutation,
} from "../../stores/account-api";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { useUpdateProfileMutation } from "../../stores/api-slice";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import type { SavedAddress } from "../../types/address";
import type { Profile as SavedProfile } from "../../types/profile";
import type { AccountBooking, SavedCard } from "./data";
import { useAccountForms } from "./forms";
import { getInitialState } from "./initial-state";
import { EMPTY_CODE } from "./state";
import type { CodeTarget } from "./state";
import type { AccountProps, StatePatch } from "./state";

const NO_BOOKINGS: AccountBooking[] = [];
const NO_CARDS: SavedCard[] = [];

/** What the account has on the server; read from the queries, never copied into page state. */
export interface AccountData {
  addresses: SavedAddress[];
  bookings: AccountBooking[];
  cards: SavedCard[];
  hasPhoto: boolean;
}

export const useAccountCore = (props: AccountProps) => {
  const [searchParams] = useSearchParams();

  // read once: later URL changes move between sections via goToSection / popstate, not a re-initialise
  const [initial] = useState(() => getInitialState(props, searchParams));
  const [state, setRawState] = useState(initial);
  const stateRef = useRef(state);

  stateRef.current = state;

  const forms = useAccountForms({ ...initial.profile }, () => ({
    edit: stateRef.current.edit,
    profile: stateRef.current.profile,
    isCodeSent: stateRef.current.password.isCodeSent,
  }));

  const afterCommit = useRef<(() => void)[]>([]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const sessionLoggedIn = useAppSelector((root) => root.session.loggedIn);

  const refs = useMemo(
    () => ({
      dialog: createRef<HTMLDivElement>(),
      deleteConfirm: createRef<HTMLInputElement>(),
      file: createRef<HTMLInputElement>(),
      codes: {
        current: EMPTY_CODE.map(() => createRef<HTMLInputElement>()),
        next: EMPTY_CODE.map(() => createRef<HTMLInputElement>()),
      },
    }),
    [],
  );

  const returnFocus = useRef<Element | null>(null);

  const emailCheck = useRef({
    queue: Promise.resolve(),
    confirmed: new Set<CodeTarget>(),
  });

  const toastTimer = useRef(0);
  const resendTimer = useRef(0);

  usePasswordChecker();

  const setState = useCallback((patch: StatePatch, callback?: () => void) => {
    if (callback) afterCommit.current.push(callback);

    setRawState((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));
  }, []);

  useEffect(() => {
    const callbacks = afterCommit.current.splice(0);

    for (const callback of callbacks) callback();
  });

  const identity = useIdentity();

  const signedIn = identity?.isLoaded ? identity : null;
  const [updateProfile] = useUpdateProfileMutation();
  const savedAddresses = useSavedAddresses();
  const [saveAddress] = useSaveClientAddressMutation();
  const [deleteAddress] = useDeleteClientAddressMutation();

  // a booking made or changed since the last visit shows straight away
  const { data: bookings } = useGetClientBookingsQuery(
    identity?.user.id ?? skipToken,
    { refetchOnMountOrArgChange: true },
  );

  const { data: cards, refetch: refetchCards } = useGetClientCardsQuery(
    identity?.user.id ?? skipToken,
  );

  const [setDefaultCard] = useSetDefaultCardMutation();
  const [removeCard] = useRemoveClientCardMutation();

  const { hasPhoto } = useAccountPhoto();

  const [setAccountPhoto] = useSetAccountPhotoMutation();

  const setPhoto = useCallback(
    async (file: File | null) => {
      if (!identity) throw new Error("Not signed in");

      await setAccountPhoto({ userId: identity.user.id, file }).unwrap();
    },
    [identity, setAccountPhoto],
  );

  const data: AccountData = useMemo(
    () => ({
      addresses: savedAddresses,
      bookings: bookings ?? NO_BOOKINGS,
      cards: cards ?? NO_CARDS,
      hasPhoto,
    }),
    [savedAddresses, bookings, cards, hasPhoto],
  );

  const dataRef = useRef(data);

  dataRef.current = data;

  const saveProfile = useCallback(
    async (patch: Partial<SavedProfile>) => {
      if (!identity) throw new Error("Not signed in");

      await updateProfile({ userId: identity.user.id, patch }).unwrap();
    },
    [identity, updateProfile],
  );

  // a real account shows the signed-in person's details and sign-in methods
  useEffect(() => {
    if (!signedIn) return;

    const { first, last, email, mobile, marketing, user } = signedIn;
    const profile = { first, last, email, mobile };

    forms.edit.reset({ ...profile }, { keepDirtyValues: true });

    setState(({ password }) => ({
      profile,
      marketing,
      password: { ...password, has: user.providers.includes("email") },
      googleConnected: user.providers.includes("google"),
    }));
    // once per signed-in account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn?.user.id, setState]);

  return {
    searchParams,
    state,
    stateRef,
    data,
    dataRef,
    emailCheck,
    setState,
    forms,
    navigate,
    dispatch,
    sessionLoggedIn,
    refs,
    returnFocus,
    toastTimer,
    resendTimer,
    saveProfile,
    setPhoto,
    saveAddress,
    deleteAddress,
    setDefaultCard,
    removeCard,
    refetchCards,
  };
};

export type AccountCore = ReturnType<typeof useAccountCore>;
