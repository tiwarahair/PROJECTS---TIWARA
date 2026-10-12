import { useLayoutEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FavHost } from "../../components/fav-host/fav-host";
import { faqs } from "../../data";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { ACCOUNT_INITIALS, logOut } from "../../stores/session-slice";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { getSearchParams } from "../../utils/page-flags";
import helmet from "./help-helmet.module.css";
import styles from "./help-page.module.css";

const HELP_FAQS = faqs.filter(({ question }) =>
  /cancel or reschedule|deposits work|How do I pay/.test(question),
);

const LOGIN_HREF = `/login?screen=cust-email&return=${encodeURIComponent("/help")}`;

const HEART_PATH =
  "M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z";

/** Help & support, route "/help": FAQs (one open at a time) and the contact email. */
export const HelpPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(-1);
  const loggedIn = useAppSelector(({ session }) => session.loggedIn);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [bookingRef] = useState(() => getSearchParams().get("booking") || "");
  const mailSubject = encodeURIComponent(`Help with booking ${bookingRef}`);
  const mailQuery = bookingRef ? `?subject=${mailSubject}` : "";
  const mailHref = `mailto:help@tiwarashouse.co.uk${mailQuery}`;

  useLayoutEffect(() => {
    document.documentElement.classList.add("help-page");

    return () => document.documentElement.classList.remove("help-page");
  }, []);

  const logout = () => {
    dispatch(logOut());
    navigate("/");
  };

  return (
    <div className={styles.page} data-screen-label="Help and support">
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link className={styles.logoLink} to="/">
            <img
              className={styles.logo}
              src={getAssetUrl("logos/logo-crimson.png")}
              alt="Tiwára's House"
            />
          </Link>
          <div className={joinClassNames(helmet.hpMob, styles.mobActions)}>
            {loggedIn && (
              <Link
                className={styles.mobFav}
                to="/account?section=favourites"
                aria-label="Favourites"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={HEART_PATH}></path>
                </svg>
              </Link>
            )}
            <button
              className={styles.menuButton}
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <span className={styles.menuLine}></span>
              <span className={styles.menuLine}></span>
            </button>
          </div>
          <nav className={joinClassNames(helmet.hpDesk, styles.desk)}>
            <Link className={styles.deskLink} to="/search">
              Find a stylist
            </Link>
            <Link className={styles.deskLink} to="/#stylegrid">
              Services
            </Link>
            {loggedIn && (
              <button
                className={styles.accountButton}
                data-tw-acct="1"
                aria-label="Account"
                aria-haspopup="menu"
                aria-expanded="false"
              >
                <span className={styles.accountAvatar} aria-hidden="true">
                  {ACCOUNT_INITIALS}
                </span>
                <svg
                  width="14"
                  height="14"
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
            )}
            {!loggedIn && (
              <Link className={styles.deskLink} to={LOGIN_HREF}>
                Log in
              </Link>
            )}
          </nav>
        </div>
        {menuOpen && (
          <div className={joinClassNames(helmet.hpMob, styles.mobMenu)}>
            <Link className={styles.mobLink} to="/search">
              Find a stylist
            </Link>
            <Link className={styles.mobLink} to="/#stylegrid">
              Services
            </Link>
            {loggedIn && (
              <>
                <div className={styles.mobName}>Account</div>
                <Link className={styles.mobLink} to="/account?section=bookings">
                  Bookings
                </Link>
                <Link
                  className={styles.mobLink}
                  to="/account?section=favourites"
                >
                  Favourites
                </Link>
                <Link className={styles.mobLink} to="/account?section=personal">
                  Account settings
                </Link>
                <Link
                  className={styles.mobLinkCurrent}
                  to="/help"
                  aria-current="page"
                >
                  Help & support
                </Link>
                <button className={styles.mobLogOut} onClick={logout}>
                  Log out
                </button>
              </>
            )}
            {!loggedIn && (
              <Link className={styles.mobLink} to={LOGIN_HREF}>
                Log in
              </Link>
            )}
          </div>
        )}
      </header>

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
