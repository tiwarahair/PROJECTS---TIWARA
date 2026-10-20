import { useId } from "react";
import {
  Check,
  ImagePlus,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  ShieldAlert,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { EvidenceSlot } from "../core/types";
import { EVIDENCE_ACCEPT } from "./view";
import type { DisputeView } from "./view";
import styles from "../../../styles/features/studio/disputes/index.module.css";
import sheet from "../../../styles/features/studio/shell/sheet-frame.module.css";

const SLOT_ICONS: Record<EvidenceSlot, LucideIcon> = {
  photos: ImagePlus,
  messages: MessageSquare,
  other: Paperclip,
};

const EvidenceRow = ({
  slot: { slot, label, file, pick, remove },
}: {
  slot: DisputeView["slots"][number];
}) => {
  const uid = useId();
  const Icon = SLOT_ICONS[slot];

  return (
    <div className={styles.slot}>
      <Icon
        className={styles.slotIcon}
        size={18}
        strokeWidth={1.7}
        color="var(--neutral-600)"
      />
      <div className={styles.slotText}>
        <div className={styles.slotLabel}>{label}</div>
        {file && <div className={styles.fileName}>{file.name}</div>}
      </div>
      {!file && (
        <label className={styles.add} htmlFor={uid}>
          Add
          <input
            id={uid}
            className={styles.fileInput}
            type="file"
            accept={EVIDENCE_ACCEPT}
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      )}
      {file && !file.fileId && (
        <LoaderCircle
          className={styles.spinner}
          size={18}
          strokeWidth={2}
          aria-label="Uploading"
        />
      )}
      {file?.fileId && (
        <>
          <Check size={18} strokeWidth={2} color="var(--status-success)" />
          <button
            className={styles.remove}
            onClick={remove}
            aria-label={`Remove ${file.name}`}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  );
};

/** the client's dispute & the evidence the stylist sends their bank */
export const DisputeSheet = ({
  view: { title, summary, body, respondBy, text, setText, slots, added },
}: {
  view: DisputeView;
}) => {
  const uid = useId();

  return (
    <div className={styles.body}>
      <div className={styles.alert} role="alert">
        <ShieldAlert
          className={styles.alertIcon}
          size={20}
          strokeWidth={1.7}
          color="var(--accent-700)"
        />
        <div className={styles.alertText}>
          <div className={styles.alertTitle}>{title}</div>
          <div className={styles.summary}>{summary}</div>
          <div className={styles.copy}>{body}</div>
        </div>
      </div>
      {respondBy && <div className={styles.due}>{respondBy}</div>}
      <label className={styles.field} htmlFor={uid}>
        <span className={styles.label}>What happened?</span>
        <textarea
          id={uid}
          className={styles.textarea}
          value={text}
          maxLength={5000}
          rows={5}
          placeholder="e.g. She came in on 6 November and had her curls defined. She was happy at the end and paid the deposit when she booked."
          onChange={(event) => setText(event.target.value)}
        ></textarea>
      </label>
      <div className={styles.group}>
        <div className={styles.label}>Files (optional)</div>
        <div className={styles.hint}>PDF, JPG or PNG, up to 4.5 MB each</div>
        <div className={styles.slots}>
          {slots.map((slot) => (
            <EvidenceRow key={slot.slot} slot={slot} />
          ))}
        </div>
      </div>
      <div className={styles.added}>
        <div className={styles.label}>We add these for you</div>
        <ul className={styles.addedList}>
          {added.map((item) => (
            <li key={item} className={styles.addedItem}>
              <Check size={15} strokeWidth={2} color="var(--neutral-600)" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const DisputeFooter = ({
  view: { accept, send, isSending, canSend },
}: {
  view: DisputeView;
}) => (
  <div className={sheet.footerRow}>
    <button className={sheet.cancel} onClick={accept} disabled={isSending}>
      Accept dispute
    </button>
    <button
      className={joinClassNames(sheet.wide48, styles.send)}
      onClick={send}
      disabled={!canSend}
    >
      {isSending ? "Sending…" : "Send evidence"}
    </button>
  </div>
);
