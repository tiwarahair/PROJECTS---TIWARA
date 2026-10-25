// TO DO: NEED TO CHECK the copy of every policy page
import { Check, Mail, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FavHost } from "../../components/fav-host";
import { SiteHeader } from "../../components/site-header";
import { getSupportMailto, SUPPORT_EMAIL } from "../../utils/support";
import styles from "../../styles/features/review-policy/index.module.css";

const LOGIN_HREF = `/login?screen=cust-email&return=${encodeURIComponent("/reviews")}`;

const IN_SHORT = [
  "Only clients who’ve had a booking can review it.",
  "Honest reviews stay up, even bad ones.",
  "We remove abuse, private details, threats, fakes and adverts.",
];

const ALLOWED = [
  "Your honest experience of the appointment, good or bad",
  "How the hair turned out and how long it lasted",
  "Timing, communication, cleanliness and price",
];

const NOT_ALLOWED = [
  "Insults, hate or harassment, about anyone",
  "Phone numbers, addresses or other private details",
  "Threats, or asking for money or a refund in return for changing a review",
  "Reviews from the stylist, their friends or a rival business",
  "Adverts, promo codes or links to other accounts",
];

interface RuleListProps {
  items: string[];
  icon: LucideIcon;
  isAllowed: boolean;
}

const RuleList = ({ items, icon: Icon, isAllowed }: RuleListProps) => (
  <ul className={styles.rules}>
    {items.map((item) => (
      <li key={item} className={styles.rule}>
        <span className={isAllowed ? styles.yes : styles.no} aria-hidden="true">
          <Icon size={14} strokeWidth={2.6} />
        </span>
        {item}
      </li>
    ))}
  </ul>
);

/** who can review, what's allowed, reporting, decisions and appeals. */
export const ReviewPolicyPage = () => (
  <div className={styles.page} data-screen-label="Review policy">
    <SiteHeader loginHref={LOGIN_HREF} />

    <main className={styles.main}>
      <p className={styles.eyebrow}>Policies</p>
      <h1 className={styles.title}>Review policy</h1>
      <p className={styles.lede}>
        Reviews help clients choose a stylist and help stylists grow and stay
        accountable. These are the rules every review on Tiwára’s House follows,
        and what happens when one is reported.
      </p>

      <section className={styles.summary} aria-labelledby="rp-short">
        <h2 className={styles.summaryTitle} id="rp-short">
          In short
        </h2>
        <ul className={styles.summaryList}>
          {IN_SHORT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="rp-who">
        <h2 className={styles.heading} id="rp-who">
          Who can leave a review
        </h2>
        <p className={styles.text}>
          After a completed appointment, we email the client a link to review
          it, with one reminder a few days later. The link lasts 30 days.
        </p>
        <p className={styles.text}>
          Each booking gets one review, and it can’t be edited once it’s sent. A
          stylist’s rating shows once they have 3 reviews. Stylists can reply to
          reviews.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="rp-rules">
        <h2 className={styles.heading} id="rp-rules">
          What a review can and can’t say
        </h2>
        <h3 className={styles.subheading}>Welcome</h3>
        <RuleList items={ALLOWED} icon={Check} isAllowed />
        <h3 className={styles.subheading}>Not allowed</h3>
        <RuleList items={NOT_ALLOWED} icon={X} isAllowed={false} />
      </section>

      <section className={styles.section} aria-labelledby="rp-report">
        <h2 className={styles.heading} id="rp-report">
          Reporting a review
        </h2>
        <p className={styles.text}>
          Anyone signed in can report a review from its ⋯ menu. A bad rating on
          its own isn’t a reason to remove a review.
        </p>
        <p className={styles.text}>
          Reviews reported for abuse, private details or threats are hidden
          straight away and stop counting toward the rating while we check them.
          We look at those within 24 hours, and at other reports within 5
          working days.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="rp-decide">
        <h2 className={styles.heading} id="rp-decide">
          What we decide
        </h2>
        <dl className={styles.outcomes}>
          <div className={styles.outcome}>
            <dt>Keep the review</dt>
            <dd>It stays up and counts toward the rating.</dd>
          </div>
          <div className={styles.outcome}>
            <dt>Remove the words</dt>
            <dd>
              The text is replaced with a short note. The stars stay and still
              count.
            </dd>
          </div>
          <div className={styles.outcome}>
            <dt>Remove the review</dt>
            <dd>It’s taken down and no longer counts toward the rating.</dd>
          </div>
        </dl>
        <p className={styles.text}>
          We email the reviewer, the stylist and whoever reported it with our
          decision.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="rp-appeal">
        <h2 className={styles.heading} id="rp-appeal">
          Appeals
        </h2>
        <p className={styles.text}>
          If we remove a review or its words, the reviewer can appeal from the
          link in our email. If the stylist reported a review we kept, or whose
          words we removed, they can appeal from Reviews in Studio.
        </p>
        <p className={styles.text}>
          Each decision can be appealed once, within 14 days. Someone from our
          team looks again, and their answer is final.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="rp-contact">
        <h2 className={styles.heading} id="rp-contact">
          Questions
        </h2>
        <p className={styles.text}>Email us and we’ll get back to you.</p>
        <a
          className={styles.mail}
          href={getSupportMailto("A question about reviews")}
        >
          <Mail size={17} strokeWidth={1.7} />
          {/* TO DO: email still needs updating */}
          {SUPPORT_EMAIL}
        </a>
      </section>
    </main>
    <FavHost />
  </div>
);
