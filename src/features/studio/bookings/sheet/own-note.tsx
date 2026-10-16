import { Plus } from "lucide-react";
import type { StudioController } from "../../core/use-studio";
import type { BookingSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/sheet/own-note.module.css";
import shared from "../../../../styles/features/studio/bookings/sheet/index.module.css";

interface OwnNoteProps {
  studio: StudioController;
  view: BookingSheetView;
}

export const OwnNote = ({ studio, view }: OwnNoteProps) => {
  const { state, setState } = studio;
  const { booking } = view;

  const openNote = () =>
    setState({ bookingNoteOn: true, bookingNoteDraft: booking.stylistNote });

  if (state.bookingNoteOn)
    return (
      <div className={styles.noteEditor}>
        <textarea
          className={styles.noteInput}
          value={state.bookingNoteDraft}
          onChange={(event) =>
            setState({ bookingNoteDraft: event.target.value })
          }
          rows={3}
          placeholder="e.g. Bring the 30 colour, she wants it longer this time"
        ></textarea>
        <div className={styles.noteActions}>
          <button
            className={styles.noteCancel}
            onClick={() => setState({ bookingNoteOn: false })}
          >
            Cancel
          </button>
          <button className={styles.noteSave} onClick={view.saveNote}>
            Save note
          </button>
        </div>
      </div>
    );

  return (
    <>
      {booking.hasStylistNote && (
        <button className={styles.ownNote} onClick={openNote}>
          <span className={shared.strong}>Your note:</span>{" "}
          {booking.stylistNote}
        </button>
      )}
      {booking.noStylistNote && (
        <button className={styles.addNote} onClick={openNote}>
          <Plus size={13} strokeWidth={2.2} />
          Add a note only you can see
        </button>
      )}
    </>
  );
};
