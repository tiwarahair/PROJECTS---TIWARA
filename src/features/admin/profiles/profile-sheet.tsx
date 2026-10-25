import { Check, ExternalLink, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { Button } from "../../../components/ds/button";
import { Tooltip } from "../../../components/ds/tooltip";
import { ResponsiveImage } from "../../../components/responsive-image";
import { PHONE_QUERY, Sheet } from "../../../components/sheet";
import { useMediaQuery } from "../../../hooks/use-media-query";
import { DISCARD_PROMPT } from "../../../hooks/use-unsaved-changes";
import type { AdminProfileDetail } from "../../../lib/admin-api";
import { toPhotoUrl } from "../../../lib/public-stylist";
import { useAppDispatch } from "../../../stores/hooks";
import { showToast } from "../../../stores/toast-slice";
import { joinClassNames } from "../../../utils/class-names";
import {
  useGetAdminProfileQuery,
  useMarkProfileCheckedMutation,
  useSaveProfileNoteMutation,
  useSuspendStylistMutation,
  useUnsuspendStylistMutation,
} from "../api";
import {
  formatDay,
  getChecks,
  getChecksLine,
  getCount,
  getLiveAgo,
  getPriceRange,
  getStripeUrl,
  STRIPE_LABELS,
} from "./view";
import button from "../../../styles/components/ds/button.module.css";
import form from "../../../styles/components/report-review/index.module.css";
import styles from "../../../styles/features/admin/profile-sheet.module.css";

type Mode = "view" | "suspend" | "unsuspend";

const shortDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
});

const getCheckedText = ({
  checked_at: checkedAt,
  checked_by_name: checker,
}: AdminProfileDetail) => {
  if (!checkedAt) return "Not checked yet";

  const first = checker?.split(" ")[0];

  return `Checked${first ? ` by ${first}` : ""}, ${shortDay.format(new Date(checkedAt))}`;
};

const getFacts = (profile: AdminProfileDetail) => [
  [
    "Went live",
    profile.went_live_at
      ? `${formatDay(profile.went_live_at)}, ${getLiveAgo(profile).toLowerCase()}`
      : "Not live yet",
  ],
  ["Stripe", STRIPE_LABELS[profile.stripe_state]],
  [
    "Services",
    `${getCount(profile.service_count, "service")}, ${getPriceRange(profile)}`,
  ],
  ["Photos", getCount(profile.photo_count, "photo")],
  [
    "Bookings",
    `${profile.booking_count} booked, ${profile.cancelled_count} cancelled`,
  ],
  [
    "Reviews",
    `${getCount(profile.review_count, "review")}, ${profile.reported_count} reported`,
  ],
  ["Phone", profile.contact_phone ?? profile.owner_phone ?? "—"],
  ["Email", profile.contact_email ?? profile.owner_email ?? "—"],
];

interface ProfileSheetProps {
  stylistId: string;
  onClose: () => void;
}

export const ProfileSheet = ({ stylistId, onClose }: ProfileSheetProps) => {
  const dispatch = useAppDispatch();
  const isPhone = useMediaQuery(PHONE_QUERY);

  const {
    data: profile,
    isError,
    isLoading,
  } = useGetAdminProfileQuery(stylistId);

  const [mode, setMode] = useState<Mode>("view");
  const [note, setNote] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isDiscarding, setDiscarding] = useState(false);
  const [saveNote, { isLoading: isSavingNote }] = useSaveProfileNoteMutation();

  const [markChecked, { isLoading: isChecking }] =
    useMarkProfileCheckedMutation();

  const [suspend, { isLoading: isSuspending }] = useSuspendStylistMutation();

  const [unsuspend, { isLoading: isUnsuspending }] =
    useUnsuspendStylistMutation();

  const noteText = note ?? profile?.note ?? "";
  const isBusy = isChecking || isSuspending || isUnsuspending || isSavingNote;

  const isDirty =
    mode === "view"
      ? note != null && note.trim() !== (profile?.note ?? "")
      : !!reason.trim();

  // closing with unsaved words asks first
  const requestClose = () => (isDirty ? setDiscarding(true) : onClose());

  const done = (message: string) => {
    // above the bottom bar on phones
    dispatch(showToast(message, null, { bottom: isPhone ? 96 : 24 }));
    onClose();
  };

  const fail = () => setError("That didn’t save. Try again.");

  const backToView = () => {
    setMode("view");
    setReason("");
    setError("");
  };

  const saveNoteNow = () =>
    void saveNote({ stylistId, note: noteText })
      .unwrap()
      .then(() => {
        setNote(null);
        dispatch(showToast("Note saved", null, { bottom: isPhone ? 96 : 24 }));
      }, fail);

  const check = () => {
    if (!noteText.trim())
      return setError("Add a note so other admins know what you checked.");

    void markChecked({ stylistId, note: noteText })
      .unwrap()
      .then(() => done("Marked as checked"), fail);
  };

  const confirm = () => {
    if (!reason.trim())
      return setError(
        mode === "suspend"
          ? "Add a reason. The stylist sees it."
          : "Add a note so other admins know why.",
      );

    const request = mode === "suspend" ? suspend : unsuspend;

    void request({ stylistId, note: reason })
      .unwrap()
      .then(
        () =>
          done(
            mode === "suspend"
              ? `${profile?.business_name ?? "Stylist"} suspended`
              : `${profile?.business_name ?? "Stylist"} unsuspended`,
          ),
        fail,
      );
  };

  const getMissingText = () => {
    if (isLoading) return "Loading…";

    return isError
      ? "This profile didn’t load. Try again."
      : "This business has closed, so it’s no longer in Profiles.";
  };

  if (!profile)
    return (
      <Sheet open title="Profile" onClose={onClose}>
        <p className={styles.muted}>{getMissingText()}</p>
      </Sheet>
    );

  const discardDialog = isDiscarding && (
    <ConfirmDialog
      title={DISCARD_PROMPT.title}
      body={DISCARD_PROMPT.body}
      yesLabel={DISCARD_PROMPT.discard}
      noLabel={DISCARD_PROMPT.keep}
      onYes={onClose}
      onNo={() => setDiscarding(false)}
    />
  );

  const isSuspended = profile.status === "suspended";
  const firstName = profile.owner_name.split(" ")[0] || "The stylist";
  const contactEmail = profile.contact_email ?? profile.owner_email;
  const confirmLabel = mode === "suspend" ? "Suspend stylist" : "Unsuspend";

  if (mode !== "view")
    return (
      <Sheet
        open
        title={
          mode === "suspend"
            ? `Suspend ${profile.business_name}?`
            : `Unsuspend ${profile.business_name}?`
        }
        onClose={requestClose}
        footer={
          <>
            <Button variant="ghost" onClick={backToView}>
              Cancel
            </Button>
            <Button disabled={isBusy} onClick={confirm}>
              {isBusy ? "Saving…" : confirmLabel}
            </Button>
          </>
        }
      >
        {discardDialog}
        <ul className={styles.effects}>
          {mode === "suspend" ? (
            <>
              <li>Their profile is hidden from search and their link.</li>
              <li>Clients can’t make new bookings.</li>
              <li>Existing bookings carry on as booked.</li>
              <li>{`${firstName} sees a notice in Studio and is emailed your reason.`}</li>
            </>
          ) : (
            <>
              <li>They go live again once everything in setup is done.</li>
              <li>{`${firstName} is emailed that the suspension is lifted.`}</li>
            </>
          )}
        </ul>
        <label className={form.field}>
          <span className={form.legend}>
            {mode === "suspend" ? "Reason" : "Note"}{" "}
            <span className={form.optional}>(required)</span>
          </span>
          <textarea
            className={form.textarea}
            value={reason}
            maxLength={1000}
            rows={3}
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
          />
        </label>
        <p className={styles.hint}>
          {mode !== "suspend" && "Only admins see this."}
        </p>
        {!!error && (
          <p className={form.error} role="alert">
            {error}
          </p>
        )}
      </Sheet>
    );

  const isCheckable = !profile.checked_at || !!profile.new_flags.length;

  // Mark as checked saves the note too; without it, a changed note gets its own Save
  const getFooter = () => {
    if (!isSuspended && isCheckable)
      return (
        <Button disabled={isBusy} onClick={check}>
          {isChecking ? "Saving…" : "Mark as checked"}
        </Button>
      );

    if (!isDirty) return null;

    return (
      <Button disabled={isBusy} onClick={saveNoteNow}>
        {isSavingNote ? "Saving…" : "Save note"}
      </Button>
    );
  };

  return (
    <Sheet
      open
      title={profile.business_name}
      subtitle={[profile.owner_name, profile.area_label]
        .filter(Boolean)
        .join(" · ")}
      media={
        <span className={styles.cover}>
          {!!profile.cover_path && (
            <ResponsiveImage
              className={styles.coverImage}
              src={toPhotoUrl(profile.cover_path)}
              sizes="60px"
              alt=""
            />
          )}
        </span>
      }
      hasDivider={false}
      onClose={requestClose}
      footer={getFooter()}
    >
      {discardDialog}
      {isSuspended && (
        <div className={styles.suspended}>
          <div className={styles.stack}>
            <b>
              {`Suspended${profile.suspended_at ? ` on ${formatDay(profile.suspended_at)}` : ""}${profile.suspended_by ? ` by ${profile.suspended_by}` : ""}`}
            </b>
            {!!profile.suspend_reason && (
              <span>{`“${profile.suspend_reason}”`}</span>
            )}
          </div>
          <Button variant="ghost" onClick={() => setMode("unsuspend")}>
            Unsuspend
          </Button>
        </div>
      )}
      <div className={styles.statusRow}>
        <span
          className={joinClassNames(
            styles.status,
            !profile.checked_at && !isSuspended && styles.statusWaiting,
          )}
        >
          {getCheckedText(profile)}
        </span>
        <span className={styles.muted}>{getChecksLine(profile)}</span>
        <a
          className={styles.clientLink}
          href={`/${profile.slug}`}
          target="_blank"
          rel="noreferrer"
        >
          View as a client
          <ExternalLink size={14} strokeWidth={2} />
        </a>
      </div>
      <ul className={styles.checks} aria-label="Checks">
        {getChecks(profile).map(({ label, isOk, text }) => (
          <li key={label} className={styles.check}>
            <span
              className={joinClassNames(
                styles.checkIcon,
                !isOk && styles.checkIconFail,
              )}
            >
              {isOk ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <TriangleAlert size={14} strokeWidth={2.2} />
              )}
            </span>
            <span className={styles.stack}>
              <b>{label}</b>
              <span className={styles.muted}>{text}</span>
            </span>
          </li>
        ))}
        <li className={styles.check}>
          <span className={styles.checkIcon}>
            <ExternalLink size={14} strokeWidth={2.2} />
          </span>
          <span className={styles.stack}>
            <b>Bank details</b>
            {profile.stripe_account_id ? (
              <a
                className={styles.stripeLink}
                href={getStripeUrl(profile.stripe_account_id)}
                target="_blank"
                rel="noreferrer"
              >
                Check by hand in Stripe
              </a>
            ) : (
              <span className={styles.muted}>Not connected to Stripe yet</span>
            )}
          </span>
        </li>
      </ul>
      <dl className={styles.facts}>
        {getFacts(profile).map(([label, value]) => (
          <div key={label} className={styles.fact}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <label className={form.field}>
        <span className={form.legend}>Notes</span>
        <textarea
          className={form.textarea}
          value={noteText}
          maxLength={2000}
          rows={2}
          onChange={(event) => {
            setNote(event.target.value);
            setError("");
          }}
        />
      </label>
      <p className={styles.hint}>Only admins see these.</p>
      {!!error && (
        <p className={form.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {!!contactEmail && (
          <a
            className={joinClassNames(button.button, button.md, button.outline)}
            href={`mailto:${contactEmail}`}
          >
            Contact stylist
          </a>
        )}
        {!isSuspended && (
          <Tooltip
            label="Suspending hides them from search and stops new bookings."
            placement="below"
            isFloating
          >
            <Button variant="outline" onClick={() => setMode("suspend")}>
              Suspend stylist
            </Button>
          </Tooltip>
        )}
      </div>
    </Sheet>
  );
};
