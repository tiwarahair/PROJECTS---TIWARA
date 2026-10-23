import { useState } from "react";
import { useForm } from "react-hook-form";
import { PasswordMeter } from "../../components/password-meter";
import { useMediaQuery } from "../../hooks/use-media-query";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { signInWithInvite } from "../../lib/booking-invite-api";
import type { BookingInvite } from "../../lib/booking-invite-api";
import {
  getErrorMessage,
  useClaimBookingInviteMutation,
} from "../../stores/api-slice";
import { joinClassNames } from "../../utils/class-names";
import { checkPassword, getPasswordView } from "../../utils/password";
import { TermsSheet } from "../onboarding/terms-sheet";
import type { TermsKind } from "../onboarding/state";
import styles from "../../styles/features/save-details/index.module.css";

const CLIENT_MIN = 15;

export type SaveOutcome = "done" | "exists" | "expired";

interface SaveDetailsFormProps {
  token: string;
  invite: BookingInvite;
  onDone: (outcome: SaveOutcome) => void;
}

const getOutcome = (code: string): SaveOutcome | null => {
  if (code === "account_exists") return "exists";

  return code === "expired" ? "expired" : null;
};

export const SaveDetailsForm = ({
  token,
  invite: { email, first, last },
  onDone,
}: SaveDetailsFormProps) => {
  const [isShown, setShown] = useState(false);
  const [terms, setTerms] = useState<TermsKind | null>(null);
  const [saveError, setSaveError] = useState("");
  const [claim] = useClaimBookingInviteMutation();
  const isDesktop = useMediaQuery("(min-width:900px)");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string }>({
    defaultValues: { password: "" },
    mode: "onTouched",
  });

  usePasswordChecker();

  const getCheck = (value: string) =>
    checkPassword(value, { min: CLIENT_MIN, first, last, email });

  const meter = getPasswordView(getCheck(watch("password")), {
    show: !!errors.password,
    errorColour: "var(--accent-700)",
  });

  const passwordField = register("password", {
    validate: (value) => getCheck(value).valid,
  });

  const save = async ({ password }: { password: string }) => {
    setSaveError("");

    const result = await claim({ token, password });

    if (!("error" in result)) {
      onDone("done");

      return signInWithInvite(result.data.tokenHash).catch(() => undefined);
    }

    const outcome = getOutcome(getErrorMessage(result.error));

    if (outcome) return onDone(outcome);

    setSaveError("We couldn’t save your details. Try again.");
  };

  return (
    <>
      <div data-sd-in="1" data-screen-label="Set password">
        <h1 className={styles.title}>Finish saving your details</h1>
        <p className={styles.lead}>
          Create a password to book faster and see all your bookings in one
          place.
        </p>
        <form
          className={styles.fields}
          noValidate
          onSubmit={handleSubmit(save)}
        >
          <div className={styles.field}>
            <span className={styles.label}>Email</span>
            <div aria-readonly="true" className={styles.readonly}>
              {email}
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="sd-pw" className={styles.label}>
              Create a password
            </label>
            <span className={styles.inputWrap}>
              <input
                id="sd-pw"
                type={isShown ? "text" : "password"}
                autoComplete="new-password"
                {...passwordField}
                onBlur={(event) => {
                  if (event.target.value) void passwordField.onBlur(event);
                }}
                aria-describedby="sd-pw-help"
                aria-invalid={meter.hasError ? "true" : "false"}
                className={joinClassNames(
                  styles.input,
                  meter.hasError ? styles.inputBorderError : styles.inputBorder,
                )}
              />
              <button
                type="button"
                onClick={() => setShown(!isShown)}
                aria-label={isShown ? "Hide password" : "Show password"}
                className={styles.toggle}
              >
                {isShown ? "Hide" : "Show"}
              </button>
            </span>
            <PasswordMeter id="sd-pw-help" view={meter} />
          </div>
          {!!saveError && (
            <p role="alert" className={styles.error}>
              {saveError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={joinClassNames(
              styles.save,
              isSubmitting ? styles.saveBusy : styles.saveReady,
            )}
          >
            {isSubmitting ? "Saving…" : "Save my details"}
          </button>
          <p className={styles.terms}>
            {"By saving, you agree to our "}
            <button
              type="button"
              onClick={() => setTerms("client")}
              className={styles.termsLink}
            >
              Terms
            </button>
            {" and "}
            <button
              type="button"
              onClick={() => setTerms("privacy")}
              className={styles.termsLink}
            >
              Privacy Policy
            </button>
            .
          </p>
        </form>
      </div>
      {!!terms && (
        <TermsSheet
          kind={terms}
          isDesktop={isDesktop}
          onClose={() => setTerms(null)}
        />
      )}
    </>
  );
};
