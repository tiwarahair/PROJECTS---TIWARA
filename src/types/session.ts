/** The signed-in Supabase user, as the UI needs it. */
export interface SessionUser {
  id: string;
  email: string;
  isStylist: boolean;
  isAdmin: boolean;
  /** Sign-in methods on the account: "email", "google". */
  providers: string[];
  /** ISO time the account was created. */
  createdAt: string;
}
