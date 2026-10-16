import { asStyle } from "../../../../utils/as-style";
import { joinClassNames } from "../../../../utils/class-names";
import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/appointments.module.css";
import shared from "../../../../styles/features/studio/clients/profile/index.module.css";

interface ProfileAppointmentsProps {
  profile: Profile;
}

export const ProfileAppointments = ({ profile }: ProfileAppointmentsProps) => (
  <>
    <div className={styles.apptHead}>
      <div className={shared.h3}>Appointments</div>
      <div className={styles.segs}>
        {profile.appointmentTabs.map(({ key, label, isOn, onSelect }) => (
          <button
            key={key}
            className={joinClassNames(styles.seg, isOn && styles.segOn)}
            onClick={onSelect}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
    <div className={styles.appts}>
      {profile.appointments.map(
        ({
          key,
          service,
          when,
          price,
          isStruck,
          status,
          statusBackground,
          statusForeground,
          open,
        }) => (
          <button key={key} className={styles.appt} onClick={open}>
            <span className={shared.grow}>
              <span className={styles.apptSvc}>{service}</span>
              <span className={styles.apptWhen}>{when}</span>
            </span>
            <span className={styles.apptEnd}>
              <span
                className={joinClassNames(
                  styles.apptPrice,
                  isStruck && styles.apptPriceStruck,
                )}
              >
                {price}
              </span>
              <span
                className={styles.apptStatus}
                style={asStyle({
                  "--st-bg": statusBackground,
                  "--st-fg": statusForeground,
                })}
              >
                {status}
              </span>
            </span>
          </button>
        ),
      )}
      {profile.appointments.length === 0 && (
        <div className={styles.apptEmpty}>
          {profile.appointmentsEmptyMessage}
        </div>
      )}
    </div>
  </>
);
