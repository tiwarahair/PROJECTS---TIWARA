import { useLayoutEffect, useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import { FavHost } from "../../components/fav-host";
import { SiteHeader } from "../../components/site-header";
import { faqs } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import { getSearchParams } from "../../utils/page-flags";
import "../../styles/features/help/index-global.module.css";
import styles from "../../styles/features/help/index.module.css";
import { getSupportMailto, SUPPORT_EMAIL } from "../../utils/support";

const HELP_FAQS = faqs.filter(({ question }) =>
  /cancel or reschedule|deposits work|How do I pay/.test(question),
);

const LOGIN_HREF = `/login?screen=cust-email&return=${encodeURIComponent("/help")}`;

/** Help & support, route "/help": FAQs (one open at a time) and the contact email. */
export const HelpPage = () => {
  const [openFaq, setOpenFaq] = useState(-1);
  const [bookingRef] = useState(() => getSearchParams().get("booking") || "");

  // TO DO: add an actual support email
  const mailHref = getSupportMailto(
    bookingRef ? `Help with booking ${bookingRef}` : undefined,
  );

  useLayoutEffect(() => {
    document.documentElement.classList.add("help-page");

    return () => document.documentElement.classList.remove("help-page");
  }, []);

  return (
    <div className={styles.page} data-screen-label="Help and support">
      <SiteHeader loginHref={LOGIN_HREF} />

      <main className={styles.main}>
        <h1 className={styles.title}>Help & support</h1>
        {!!bookingRef && (
          <p className={styles.about}>
            About booking{" "}
            <strong className={styles.strong}>{bookingRef}</strong>
          </p>
        )}
        <h2 className={styles.faqHeading}>FAQs</h2>
        <div className={styles.faqList}>
          {HELP_FAQS.map(({ question, answer }, index) => {
            const isOpen = openFaq === index;

            return (
              <div key={`f${index}`} className={styles.faq}>
                <h3 className={styles.faqTitle}>
                  <button
                    className={styles.faqButton}
                    onClick={() =>
                      setOpenFaq((open) => (open === index ? -1 : index))
                    }
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${index}`}
                  >
                    {question}
                    <ChevronDown
                      className={joinClassNames(
                        styles.chevron,
                        isOpen ? styles.chevronOpen : styles.chevronClosed,
                      )}
                      size={18}
                      strokeWidth={1.7}
                    />
                  </button>
                </h3>
                {isOpen && (
                  <p className={styles.answer} id={`faq-a-${index}`}>
                    {answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <h2 className={styles.contactHeading}>Contact us</h2>
        <p className={styles.contactText}>
          Email us and we’ll reply within one working day.
        </p>
        <a className={styles.mail} href={mailHref}>
          <Mail size={17} strokeWidth={1.7} />
          {SUPPORT_EMAIL}
        </a>
      </main>
      <FavHost />
    </div>
  );
};
