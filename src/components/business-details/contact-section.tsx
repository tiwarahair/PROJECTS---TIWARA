import { joinClassNames } from "../../utils/class-names";
import { FieldError, Section } from "./parts";
import type { BusinessDetailsController } from "./use-business-details";
import styles from "../../styles/components/business-details/contact-section.module.css";
import parts from "../../styles/components/business-details/parts.module.css";

export const ContactSection = ({
  business: { type, getContactField },
}: {
  business: BusinessDetailsController;
}) => {
  const contactFields = [
    {
      field: getContactField("phone", "Business phone"),
      type: "tel",
      isPhone: true,
    },
    {
      field: getContactField("email", "Business email"),
      type: "email",
      isPhone: false,
    },
  ];

  return (
    <Section
      id="contact"
      label="Contact details"
      heading="Contact details"
      intro={
        type === "home" || type === "mobile"
          ? "Shown to clients once their booking is confirmed, clients can use these to contact you about a booking."
          : "Shown on your profile."
      }
    >
      <div className={styles.contactCard}>
        {contactFields.map(({ field, type: inputType, isPhone }) => (
          <div key={field.id}>
            <label className={parts.label} htmlFor={field.id}>
              {field.label}
            </label>
            <input
              className={joinClassNames(
                styles.input,
                parts.focusRing,
                isPhone ? styles.widthPhone : styles.widthFull,
                field.error ? parts.fieldErr : parts.fieldOk,
              )}
              data-bd-in="1"
              id={field.id}
              type={inputType}
              autoComplete={inputType}
              inputMode={inputType === "tel" ? "tel" : "email"}
              {...field.input}
              aria-invalid={field.error ? "true" : "false"}
              aria-describedby={field.errorId}
            />
            <FieldError id={field.errorId} error={field.error} />
          </div>
        ))}
      </div>
    </Section>
  );
};
