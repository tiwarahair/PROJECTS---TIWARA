import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { getAssetUrl } from "../../utils/asset-url";
import { getSearchParams } from "../../utils/page-flags";
import "./manage-booking-helmet.module.css";
import {
  DEFAULT_STYLIST_ID,
  getDemoBooking,
  getEntryStylist,
} from "./manage-booking-logic";
import type { SharedEntry } from "./manage-booking-logic";
import styles from "./manage-booking-page.module.css";
import toastStyles from "./manage-toast.module.css";
import { RemoveDialog } from "./remove-dialog";
import { SharedDetails } from "./shared-details";

export interface ManageBookingPageProps {
  view?: "booking" | "account";
  fixture?: "" | "edit" | "confirm" | "removed";
}

interface ManageState {
  view: string;
  entries: SharedEntry[];
  editing: number;
  draft: string;
  confirm: number;
  toast: string;
}

const TOAST_MS = 2600;

const getInitialState = (
  propView: string,
  propFixture: string,
): ManageState => {
  const params = getSearchParams();
  const view = params.get("view") || propView || "booking";
  const fixture = params.get("fixture") || propFixture || "";
  const id = params.get("stylist") || DEFAULT_STYLIST_ID;
  const entries =
    view === "account"
      ? [
          { id, text: "Sensitive scalp" },
          { id: "crowned-by-kemi", text: "" },
        ]
      : [{ id, text: "Sensitive scalp" }];
  const isEdit = fixture === "edit";
  const isRemoved = fixture === "removed";
  if (isRemoved) entries[0] = { id, text: "" };
  return {
    view,
    entries,
    editing: isEdit ? 0 : -1,
    draft: isEdit ? "Sensitive scalp" : "",
    confirm: fixture === "confirm" ? 0 : -1,
    // ?fixture=removed pins the toast (no timer)
    toast: isRemoved ? "Removed" : "",
  };
};

/**
 * The booking-link page, route "/manage" (prototype Manage Booking.dc.html): booking summary and the allergies
 * shared with the stylist, with Edit / Remove + confirm + toast. ?view=account forwards to Account → Shared.
 */
export const ManageBookingPage = ({
  view = "booking",
  fixture = "",
}: ManageBookingPageProps) => {
  const [state, setState] = useState(() => getInitialState(view, fixture));
  const toastTimer = useRef(0);
  const navigate = useNavigate();
  const isAccount = state.view === "account";
  const first = getEntryStylist(state.entries[0]?.id ?? DEFAULT_STYLIST_ID);
  const booking = getDemoBooking(state.entries[0]?.id ?? DEFAULT_STYLIST_ID);

  useLayoutEffect(() => {
    document.documentElement.classList.add("manage-page");
    return () => document.documentElement.classList.remove("manage-page");
  }, []);

  useEffect(() => {
    if (isAccount) navigate("/account?section=shared", { replace: true });
  }, [isAccount, navigate]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (toast: string) => {
    window.clearTimeout(toastTimer.current);
    setState((current) => ({ ...current, toast }));
    toastTimer.current = window.setTimeout(
      () => setState((current) => ({ ...current, toast: "" })),
      TOAST_MS,
    );
  };
  const setEntry = (index: number, text: string) =>
    setState((current) => ({
      ...current,
      entries: current.entries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, text } : entry,
      ),
    }));
  const confirmEntry = state.entries[state.confirm];

  return (
    <div
      data-screen-label={isAccount ? "Client account" : "Manage booking"}
      className={styles.page}
    >
      <nav className={styles.nav}>
        <div className={styles.bar}>
          <Link to="/" className={styles.logoLink}>
            <img
              src={getAssetUrl("_ds_assets/logo-crimson.png")}
              alt="Tiwára's House"
              className={styles.logo}
            />
          </Link>
          <span className={styles.who}>
            {isAccount ? "Nia Okafor" : "Booking ref TH-48213"}
          </span>
        </div>
      </nav>
      <main className={styles.main}>
        <div className={styles.eyebrow}>
          {isAccount ? "Your account" : "Your booking"}
        </div>
        <h1 className={styles.title}>
          {isAccount
            ? "Your details for stylists"
            : "You’re booked with " + first.name}
        </h1>
        {!isAccount && (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.service}>{booking.service}</div>
              <div className={styles.total}>{booking.total}</div>
            </div>
            <div className={styles.options}>{booking.options}</div>
            <div className={styles.facts}>
              <span className={styles.fact}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="3"></rect>
                  <path d="M3 10h18M8 2v4M16 2v4"></path>
                </svg>
                {booking.when}
              </span>
              <span className={styles.fact}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {booking.stylist + " · " + booking.area}
              </span>
            </div>
          </div>
        )}
        <SharedDetails
          isAccount={isAccount}
          title={
            isAccount
              ? "Allergies or sensitivities"
              : "Shared with " + first.name
          }
          sub={
            isAccount
              ? "Each stylist only sees what you’ve shared with them."
              : "Only " + first.name + " sees this, on your booking."
          }
          entries={state.entries}
          editing={state.editing}
          draft={state.draft}
          onEdit={(index) =>
            setState((current) => ({
              ...current,
              editing: index,
              draft: current.entries[index]?.text ?? "",
            }))
          }
          onRemove={(index) =>
            setState((current) => ({ ...current, confirm: index }))
          }
          onDraft={(draft) => setState((current) => ({ ...current, draft }))}
          onSave={(index) => {
            const text = state.draft.trim();
            setEntry(index, text);
            setState((current) => ({ ...current, editing: -1 }));
            showToast(text ? "Saved" : "Removed");
          }}
          onCancel={() => setState((current) => ({ ...current, editing: -1 }))}
        />
      </main>
      {confirmEntry && (
        <RemoveDialog
          text={
            getEntryStylist(confirmEntry.id).name + " won’t see it any more."
          }
          onCancel={() => setState((current) => ({ ...current, confirm: -1 }))}
          onRemove={() => {
            setEntry(state.confirm, "");
            setState((current) => ({ ...current, confirm: -1 }));
            showToast("Removed");
          }}
        />
      )}
      {!!state.toast && (
        <div role="status" data-mb-anim="1" className={toastStyles.toast}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--brand-yellow)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L20 7"></path>
          </svg>
          {state.toast}
        </div>
      )}
    </div>
  );
};
