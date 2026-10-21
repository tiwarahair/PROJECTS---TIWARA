import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useIdentity } from "../../hooks/use-identity";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { useAccountForms } from "./forms";
import { getInitialState } from "./initial-state";
import { EMPTY_CODE } from "./state";
import type { AccountProps, StatePatch } from "./state";

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
    hasPassword: stateRef.current.password.has,
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
      code: EMPTY_CODE.map(() => createRef<HTMLInputElement>()),
    }),
    [],
  );

  const returnFocus = useRef<Element | null>(null);
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
    setState,
    forms,
    navigate,
    dispatch,
    sessionLoggedIn,
    refs,
    returnFocus,
    toastTimer,
    resendTimer,
  };
};

export type AccountCore = ReturnType<typeof useAccountCore>;
