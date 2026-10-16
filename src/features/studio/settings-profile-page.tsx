import { ResponsiveImage } from "../../components/responsive-image/responsive-image";
import { useRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Camera, Plus, X } from "lucide-react";
import { Avatar } from "../../components/ds/avatar";
import { joinClassNames } from "../../utils/class-names";
import type { SocialPlatform } from "../../utils/social-handles";
import { PROFILE_FORM_ID, useProfileForm } from "./use-profile-form";
import type { SettingsView } from "./settings-view";
import type { StudioController } from "./use-studio";
import { Field } from "./settings-page-parts";
import parts from "../../styles/features/studio/settings-page-parts.module.css";
import styles from "../../styles/features/studio/settings-profile-page.module.css";
import { BookingLinkField } from "./booking-link-field";

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
}

const TextField = ({
  label,
  value,
  onChange,
  ...inputProps
}: TextFieldProps) => (
  <Field label={label}>
    <input
      className={styles.input}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      {...inputProps}
    />
  </Field>
);

interface UsernameFieldProps {
  platform: SocialPlatform;
  label: string;
  value: string | undefined;
  view: SettingsView;
}

const UsernameField = ({
  platform,
  label,
  value,
  view,
}: UsernameFieldProps) => {
  const error = view.socialErrors[platform];
  const errorId = `${platform}-error`;

  return (
    <Field label={label}>
      <input
        className={joinClassNames(styles.input, error && styles.inputError)}
        value={value ?? ""}
        onChange={(event) =>
          view.setProfile({ [platform]: event.target.value })
        }
        placeholder={`${label} username`}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} role="alert" className={styles.fieldError}>
          {error}
        </span>
      )}
    </Field>
  );
};

interface ProfilePageProps {
  studio: StudioController;
  view: SettingsView;
}

/** Settings → Your profile. */
export const ProfilePage = ({ studio, view }: ProfilePageProps) => {
  const { state } = studio;
  const { profile } = state;
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const portInput = useRef<HTMLInputElement>(null);
  const portfolioRef = useRef<HTMLDivElement>(null);

  const {
    handleSubmit,
    formState: { errors },
  } = useProfileForm(state.portfolio.length);

  const showErrors = () => {
    view.flagSocialErrors();

    portfolioRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  };

  return (
    <form
      id={PROFILE_FORM_ID}
      className={styles.profile}
      data-screen-label="Edit profile"
      noValidate
      onSubmit={handleSubmit(view.saveProfile, showErrors)}
    >
      <div className={styles.cover}>
        {state.coverUrl ? (
          <ResponsiveImage
            className={styles.coverImage}
            src={state.coverUrl}
            sizes="(min-width: 1024px) 640px, 100vw"
            alt="Cover"
          />
        ) : (
          <div
            className={styles.coverPlaceholder}
            role="img"
            aria-label="Cover"
          />
        )}
        <input
          className={styles.hiddenInput}
          type="file"
          accept="image/*"
          ref={coverInput}
          onChange={view.onCoverFile}
        />
        <button
          type="button"
          className={styles.changeCover}
          onClick={() => coverInput.current?.click()}
        >
          Change cover
        </button>
        <input
          className={styles.hiddenInput}
          type="file"
          accept="image/*"
          ref={avatarInput}
          onChange={view.onAvatarFile}
        />
        <button
          type="button"
          className={styles.avatarButton}
          onClick={() => avatarInput.current?.click()}
          aria-label="Change profile photo"
        >
          <Avatar
            className={styles.avatar}
            src={state.avatarUrl ?? undefined}
            name={state.owner.name}
            size={52}
          />
          <span className={styles.camera}>
            <Camera size={11} strokeWidth={2.4} color="#fff" />
          </span>
        </button>
      </div>
      <div className={styles.fields}>
        <TextField
          label="Salon name"
          value={profile.salon}
          onChange={(salon) => view.setProfile({ salon })}
        />
        <BookingLinkField studio={studio} />
        <Field label="About">
          <textarea
            className={styles.textarea}
            value={profile.about}
            onChange={(event) => view.setProfile({ about: event.target.value })}
            rows={3}
          ></textarea>
        </Field>
        <div className={styles.twoCols}>
          <UsernameField
            platform="instagram"
            label="Instagram"
            value={profile.instagram}
            view={view}
          />
          <UsernameField
            platform="tiktok"
            label="TikTok"
            value={profile.tiktok}
            view={view}
          />
        </div>
        <TextField
          label="Email"
          value={profile.email}
          onChange={(email) => view.setProfile({ email })}
        />
        <TextField
          label="Website"
          value={profile.site}
          onChange={(site) => view.setProfile({ site })}
          type="url"
          inputMode="url"
          placeholder="tiwarashouse.com"
          autoComplete="url"
        />
        <UsernameField
          platform="youtube"
          label="YouTube"
          value={profile.youtube}
          view={view}
        />
        <div ref={portfolioRef} className={styles.portfolio}>
          <div className={styles.portfolioHead}>
            <span className={parts.title15}>Portfolio</span>
            <span className={parts.muted}>{view.portCount}</span>
          </div>
          <div className={parts.mutedTop}>
            Up to twenty photos of your work, shown on your public profile.
          </div>
          {errors.portfolioCount && (
            <div className={styles.error} role="alert">
              {errors.portfolioCount.message}
            </div>
          )}
          <input
            className={styles.hiddenInput}
            type="file"
            accept="image/*"
            multiple={true}
            ref={portInput}
            onChange={view.onPortFiles}
          />
          <div className={styles.photos}>
            {view.portfolio.map(({ key, src, remove }) => (
              <div key={key} className={styles.photo}>
                <ResponsiveImage
                  className={styles.photoImage}
                  src={src}
                  sizes="(min-width: 1024px) 200px, 33vw"
                  alt="Portfolio photo"
                />
                <button
                  type="button"
                  className={styles.removePhoto}
                  onClick={remove}
                  aria-label="Remove photo"
                >
                  <X size={13} strokeWidth={2.4} />
                </button>
              </div>
            ))}
            {view.canAddPhotos && (
              <button
                type="button"
                className={styles.addPhotos}
                onClick={() => portInput.current?.click()}
              >
                <Plus size={18} strokeWidth={2} />
                Add photos
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};
