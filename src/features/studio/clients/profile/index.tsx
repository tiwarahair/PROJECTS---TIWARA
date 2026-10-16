import { joinClassNames } from "../../../../utils/class-names";
import type { ClientsView } from "../view";
import { ProfileActions } from "./actions";
import { ProfileAppointments } from "./appointments";
import { BlockedNote } from "./blocked-note";
import { ProfileContacts } from "./contacts";
import { HairNotes } from "./hair-notes";
import { ProfileHead } from "./head";
import { ProfileMoney } from "./money";
import { ProfileReliability } from "./reliability";
import { SensitivityNote } from "./sensitivities";
import styles from "../../../../styles/features/studio/clients/profile/index.module.css";

export type Profile = NonNullable<ClientsView["profile"]>;

interface ClientProfileProps {
  view: ClientsView;
  variant: "page" | "sheet";
}

/** The client's profile: the narrow Clients page, or the wide "Client" sheet. */
export const ClientProfile = ({ view, variant }: ClientProfileProps) => {
  const { profile } = view;

  if (!profile) return null;

  const isSheet = variant === "sheet";
  const card = isSheet ? styles.sheetCard : styles.card;

  const nextCard = joinClassNames(
    card,
    isSheet ? styles.sheetCardNext : styles.cardNext,
  );

  return (
    <>
      <section className={card}>
        <ProfileHead view={view} profile={profile} />
        {profile.contacts.length > 0 && <ProfileContacts profile={profile} />}
        {profile.isBlocked && <BlockedNote profile={profile} />}
        <ProfileActions view={view} profile={profile} />
      </section>
      {!!profile.sensitivities && (
        <SensitivityNote view={view} profile={profile} />
      )}
      <section className={nextCard}>
        <HairNotes view={view} profile={profile} />
      </section>
      <section className={nextCard}>
        <ProfileReliability profile={profile} />
      </section>
      <section className={nextCard}>
        <ProfileAppointments profile={profile} />
      </section>
      <section className={nextCard}>
        <ProfileMoney profile={profile} />
      </section>
    </>
  );
};
