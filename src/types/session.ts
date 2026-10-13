/** The signed-in Supabase user, as the UI needs it. */
export interface SessionUser {
  id: string;
  email: string;
  isStylist: boolean;
  isAdmin: boolean;
}
