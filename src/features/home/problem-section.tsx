import { useRef } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  WifiHigh,
} from "lucide-react";
import { Link } from "react-router";
import { chatMessages } from "../../data";
import { joinClassNames } from "../../utils/class-names";
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
            <ArrowRight size={16} strokeWidth={2} strokeLinejoin="miter" />
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
                    <WifiHigh size={16} strokeWidth={2} />
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
                    <ChevronLeft
                      size={17}
                      strokeWidth={2.4}
                      color="var(--text-secondary)"
                    />
                    <span className={styles.unreadBadge}>2</span>
                  </div>
                  <div className={styles.contact}>
                    <div className={styles.contactAvatar}>S</div>
                    <div className={styles.contactName}>
                      Stylist
                      <ChevronRight
                        size={12}
                        strokeWidth={3}
                        color="var(--text-muted)"
                      />
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
                      <Check
                        className={styles.bookedIcon}
                        size={15}
                        strokeWidth={2.5}
                        color="var(--status-success)"
                      />
                      Booked in 2 minutes, Sat 10:00
                    </div>
                  )}
                </div>
                <div className={styles.composer}>
                  <div className={styles.composerPlus}>
                    <Plus
                      className={styles.composerPlusIcon}
                      size={13}
                      strokeWidth={2}
                    />
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
