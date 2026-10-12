import { useRef } from "react";
import { Link } from "react-router";
import { chatMessages } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import { ArrowIcon } from "./arrow-icon";
import page from "../../styles/features/home/home-page.module.css";
import styles from "../../styles/features/home/problem-section.module.css";
import { useChatSequence } from "./use-chat-sequence";

/** "Tired of the booking back-and-forth?" with the animated chat phone. */
export const ProblemSection = () => {
  const phoneRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { shown, isTyping, isBooked } = useChatSequence(phoneRef, listRef);

  return (
    <section
      data-bg="#FAF6EE"
      data-screen-label="The problem"
      className={joinClassNames(page.problem, styles.section)}
    >
      <div className={joinClassNames(page.chatgrid, styles.grid)}>
        <div className={page.probtext}>
          <div data-rv="" className={styles.eyebrow}>
            The problem
          </div>
          <h2 data-rv="" className={styles.title}>
            Tired of the booking back-and-forth?
          </h2>
          <p data-rv="" className={styles.lede}>
            Messaging a stylist means waiting hours to find out they&apos;re
            full. See real availability and book the slot in a couple of taps.
          </p>
          <Link data-rv="" to="/search" className={styles.bookNow}>
            Book now
            <ArrowIcon roundJoin={false} />
          </Link>
        </div>
        <div data-rv="" className={joinClassNames(page.probvis, styles.visual)}>
          <div
            role="img"
            aria-label="Four clients looking at a phone together"
            className={joinClassNames(page.probphoto, styles.photo)}
          ></div>
          <div
            id="chatphone"
            ref={phoneRef}
            className={joinClassNames(page.chatphone, styles.phone)}
          >
            <div className={styles.buttonSilent}></div>
            <div className={styles.buttonVolumeUp}></div>
            <div className={styles.buttonVolumeDown}></div>
            <div className={styles.buttonPower}></div>
            <div className={styles.bezel}>
              <div className={joinClassNames(page.phonescreen, styles.screen)}>
                <div className={styles.statusBar}>
                  <span>9:41</span>
                  <div className={styles.island}></div>
                  <div className={styles.statusIcons}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M5 12.55a11 11 0 0 1 14 0"></path>
                      <path d="M8.5 16.05a6 6 0 0 1 7 0"></path>
                      <path d="M12 19.5h.01"></path>
                    </svg>
                    <svg width="22" height="12" viewBox="0 0 26 13">
                      <rect
                        x="0.5"
                        y="0.5"
                        width="22"
                        height="12"
                        rx="3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity=".4"
                      ></rect>
                      <rect
                        x="2"
                        y="2"
                        width="15"
                        height="9"
                        rx="2"
                        fill="currentColor"
                      ></rect>
                      <path
                        d="M24.5 4.5v4a2.2 2.2 0 0 0 0-4z"
                        fill="currentColor"
                        fillOpacity=".4"
                      ></path>
                    </svg>
                  </div>
                </div>
                <div className={styles.chatHeader}>
                  <div className={styles.back}>
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-secondary)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 19-7-7 7-7"></path>
                    </svg>
                    <span className={styles.unreadBadge}>2</span>
                  </div>
                  <div className={styles.contact}>
                    <div className={styles.contactAvatar}>S</div>
                    <div className={styles.contactName}>
                      Stylist
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-muted)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 5 7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                  <div className={styles.videoCall}>
                    <svg
                      width="21"
                      height="21"
                      viewBox="0 0 24 24"
                      fill="var(--neutral-700)"
                    >
                      <rect
                        x="2.5"
                        y="7"
                        width="12.5"
                        height="10"
                        rx="3"
                      ></rect>
                      <path d="M16.2 10.9l4.6-3.1c.7-.5 1.7 0 1.7.9v6.6c0 .9-1 1.4-1.7.9l-4.6-3.1z"></path>
                    </svg>
                  </div>
                </div>
                <div id="chatlist" ref={listRef} className={styles.chatList}>
                  {chatMessages.slice(0, shown).map(({ from, text }) => (
                    <div
                      key={text}
                      className={
                        from === "client"
                          ? styles.bubbleClient
                          : styles.bubbleStylist
                      }
                    >
                      {text}
                    </div>
                  ))}
                  {isTyping && (
                    <div className={styles.typing}>
                      <span className={styles.typingDot}></span>
                      <span className={styles.typingDot2}></span>
                      <span className={styles.typingDot3}></span>
                    </div>
                  )}
                  {isBooked && (
                    <div className={styles.booked}>
                      <svg
                        className={styles.bookedIcon}
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--status-success)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5"></path>
                      </svg>
                      Booked in 2 minutes, Sat 10:00
                    </div>
                  )}
                </div>
                <div className={styles.composer}>
                  <div className={styles.composerPlus}>
                    <svg
                      className={styles.composerPlusIcon}
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14M5 12h14"></path>
                    </svg>
                  </div>
                  <div className={styles.composerField}>Message</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
