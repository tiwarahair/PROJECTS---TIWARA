import { useLayoutEffect, useState } from "react";
import { FavHost } from "../../components/fav-host/fav-host";
import { SiteHeader } from "../../components/site-header/site-header";
import { faqs } from "../../data";
import { useIdentity } from "../../hooks/use-identity";
import { joinClassNames } from "../../utils/class-names";
import { getSearchParams } from "../../utils/page-flags";
import "../../styles/features/help/help-page-global.module.css";
import styles from "../../styles/features/help/help-page.module.css";

const HELP_FAQS = faqs.filter(({ question }) =>
  /cancel or reschedule|deposits work|How do I pay/.test(question),
);

const LOGIN_HREF = `/login?screen=cust-email&return=${encodeURIComponent("/help")}`;

/** Help & support, route "/help": FAQs (one open at a time) and the contact email. */
export const HelpPage = () => {
  const identity = useIdentity();
  const [openFaq, setOpenFaq] = useState(-1);
  const [bookingRef] = useState(() => getSearchParams().get("booking") || "");
  const mailSubject = encodeURIComponent(`Help with booking ${bookingRef}`);
  const mailQuery = bookingRef ? `?subject=${mailSubject}` : "";
  const mailHref = `mailto:help@tiwarashouse.co.uk${mailQuery}`;

  useLayoutEffect(() => {
    document.documentElement.classList.add("help-page");

    return () => document.documentElement.classList.remove("help-page");
  }, []);

  return (
    <div className={styles.page} data-screen-label="Help and support">
      <SiteHeader
        loginHref={LOGIN_HREF}
        accountMenu={{ label: "Account", initials: identity?.initials ?? "" }}
      />

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
                    <svg
                      className={joinClassNames(
                        styles.chevron,
                        isOpen ? styles.chevronOpen : styles.chevronClosed,
                      )}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6"></path>
                    </svg>
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
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2"></rect>
            <path d="m3 7 9 6 9-6"></path>
          </svg>
          help@tiwarashouse.co.uk
        </a>
      </main>
      <FavHost />
    </div>
  );
};
