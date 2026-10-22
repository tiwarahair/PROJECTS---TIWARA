import { skipToken } from "@reduxjs/toolkit/query";
import { useGetProfileQuery } from "../stores/api-slice";
import { useAppSelector } from "../stores/hooks";

export const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** The signed-in person: Supabase user plus their profile (names fill in once loaded). */
export const useIdentity = () => {
  const user = useAppSelector(({ session }) => session.user);

  const { data: profile } = useGetProfileQuery(user?.id ?? skipToken);

  if (!user) return null;

  const first = profile?.first ?? "";
  const last = profile?.last ?? "";
  const name = [first, last].filter(Boolean).join(" ");

  return {
    user,
    first,
    last,
    name: name || user.email,
    initials: getInitials(name || user.email),
    email: user.email,
    mobile: profile?.mobile ?? "",
    marketing: profile?.marketing ?? false,
    photoPath: profile?.photoPath ?? null,
    isLoaded: !!profile,
  };
};

export type Identity = NonNullable<ReturnType<typeof useIdentity>>;
