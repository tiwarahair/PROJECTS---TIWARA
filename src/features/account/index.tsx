import { ArrowLeft, Check } from "lucide-react";
import { useLayoutEffect } from "react";
import { Link } from "react-router";
import { FavHost } from "../../components/fav-host";
import { SiteHeader } from "../../components/site-header";
import { useAppSelector } from "../../stores/hooks";
import { joinClassNames } from "../../utils/class-names";
import { AccountDialogs } from "./dialogs";
import { downloadFile } from "../../utils/download-file";
import { getBookingCalendarFile } from "./logic";
import { AccountMobileList, AccountSideNav } from "./nav";
import { getAccountView } from "./view";
import type { BookingCardView } from "./view";
import { BookingsSection, OverviewSection } from "./bookings-sections";
import { PersonalSection } from "./personal-section";
import { FavouritesSection, HairSection } from "./profile-sections";
import { SecuritySection } from "./security-section";
import {
  CommunicationSection,
  PrivacySection,
  SharedSection,
} from "./settings-sections";
import { useAccount } from "./use-account";
import type { AccountProps } from "./state";
import { AddressesSection, PaymentsSection } from "./wallet-sections";
import pageGlobal from "../../styles/features/account/index-global.module.css";
import styles from "../../styles/features/account/index.module.css";

export type AccountPageProps = AccountProps;

/**
 * The customer account, route "/account": side nav (wide) or section list (narrow),
 * eleven sections chosen by ?section= (legacy ?tab=), dialogs, toast, and the logged-out / deleted gate.
 */
export const AccountPage = (props: AccountPageProps) => {
  const account = useAccount(props);
  const { state, actions, loggedIn } = account;
  const ids = useAppSelector(({ favourites }) => favourites.ids);
  const isLoaded = useAppSelector(({ favourites }) => favourites.isLoaded);

  const view = getAccountView(state, account.data, { ids, isLoaded }, loggedIn);
  const { current, mobileHome, initials, accountName } = view;
  const { setState, goToSection, showToast } = actions;

  useLayoutEffect(() => {
    document.documentElement.classList.add("account-page");

    return () => document.documentElement.classList.remove("account-page");
  }, []);

  const onCalendar = ({ booking }: BookingCardView) => {
    downloadFile(
      `tiwaras-house-${booking.ref}.ics`,
      getBookingCalendarFile(booking),
      "text/calendar",
    );

    showToast("Calendar file downloaded");
  };

  const onCookies = () => {
    setState(({ cookies }) => ({ cookiesDraft: { ...cookies } }));
    actions.openDialog({ kind: "cookies" });
  };

  return (
    <div className={styles.page} data-screen-label={view.screenLabel}>
      <SiteHeader
        loginHref={view.loginHref}
        signedIn={loggedIn}
        initials={initials}
      />
      {!loggedIn && (
        <main
          className={styles.gate}
          data-screen-label={
            state.deleted ? "Account deleted" : "Log in to see your account"
          }
        >
          <div className={styles.gateInner}>
            <h1 className={styles.gateTitle}>
              {state.deleted
                ? "Your account has been deleted"
                : "Log in to see your account"}
            </h1>
            <p className={styles.gateText}>
              {state.deleted
                ? "We’ve logged you out. Your payment records are kept without your name, as we explained."
                : "Your bookings, favourites and saved details are here once you log in."}
            </p>
            <Link
              className={styles.gateCta}
              to={state.deleted ? "/" : view.loginHref}
            >
              {state.deleted ? "Go to the home page" : "Log in"}
            </Link>
          </div>
        </main>
      )}
      {loggedIn && (
        <div className={styles.layout}>
          {state.wide && (
            <AccountSideNav
              current={current}
              accountName={accountName}
              initials={initials}
              onGo={goToSection}
              onLogOut={actions.logout}
            />
          )}
          <main className={styles.main}>
            {mobileHome && (
              <AccountMobileList
                accountName={accountName}
                initials={initials}
                onGo={goToSection}
                onLogOut={actions.logout}
              />
            )}
            {!mobileHome && (
              <>
                <div className={styles.titleRow}>
                  {!state.wide && !!state.sectionId && (
                    <button
                      className={styles.back}
                      onClick={() => goToSection(null)}
                      aria-label="Back to your account"
                    >
                      <ArrowLeft
                        className={styles.icon}
                        size={22}
                        strokeWidth={2}
                      />
                    </button>
                  )}
                  <h1 className={styles.title} id="ac-title" tabIndex={-1}>
                    {view.title}
                  </h1>
                </div>
                <p className={styles.description}>{view.description}</p>
                <div className={styles.body}>
                  {current === "overview" && (
                    <OverviewSection
                      upcoming={view.upcoming}
                      quick={view.quick}
                      onCalendar={onCalendar}
                      onGo={goToSection}
                    />
                  )}
                  {current === "bookings" && (
                    <BookingsSection
                      upcoming={view.upcoming}
                      past={view.past}
                      activeTab={view.activeTab}
                      showUpcoming={view.showUpcoming}
                      showPast={view.showPast}
                      onTab={(bookingsTab, focus) =>
                        setState(
                          { bookingsTab },
                          focus
                            ? () =>
                                document
                                  .getElementById(`ac-bk-${bookingsTab}`)
                                  ?.focus()
                            : undefined,
                        )
                      }
                      onCalendar={onCalendar}
                      onReceipt={(id) =>
                        actions.openDialog({ kind: "receipt", id })
                      }
                    />
                  )}
                  {current === "favourites" && (
                    <FavouritesSection
                      favouriteIds={view.favouriteIds}
                      isLoaded={view.isFavouritesLoaded}
                    />
                  )}
                  {current === "hair" && (
                    <HairSection quiz={state.quiz} quizDate={view.quizDate} />
                  )}
                  {current === "personal" && (
                    <PersonalSection account={account} initials={initials} />
                  )}
                  {current === "security" && (
                    <SecuritySection account={account} />
                  )}
                  {current === "payments" && (
                    <PaymentsSection
                      account={account}
                      getCardInUse={view.getCardInUse}
                    />
                  )}
                  {current === "addresses" && (
                    <AddressesSection account={account} />
                  )}
                  {current === "shared" && (
                    <SharedSection
                      account={account}
                      getStylistName={view.getStylistName}
                    />
                  )}
                  {current === "communication" && (
                    <CommunicationSection account={account} />
                  )}
                  {current === "privacy" && (
                    <PrivacySection account={account} onCookies={onCookies} />
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      )}
      <footer className={styles.footer} data-screen-label="Account footer">
        <div className={joinClassNames(pageGlobal.acFoot, styles.footInner)}>
          <span>{"© Tiwára's House"}</span>
          <nav className={styles.footNav} aria-label="Footer">
            <Link className={styles.footLink} to="/help">
              Help
            </Link>
            <Link className={styles.footLink} to="/help#terms">
              Terms
            </Link>
            <Link className={styles.footLink} to="/help#privacy">
              Privacy
            </Link>
            <button className={styles.footCookies} onClick={onCookies}>
              Cookies
            </button>
          </nav>
        </div>
      </footer>
      <AccountDialogs account={account} view={view} />
      <div className={styles.liveRegion} aria-live="polite" role="status">
        {state.toast}
      </div>
      {!!state.toast && (
        <div className={styles.toast} aria-hidden="true" data-a="1">
          <Check
            className={styles.icon}
            size={18}
            strokeWidth={2.2}
            color="var(--brand-yellow)"
          />
          <span className={styles.toastText}>{state.toast}</span>
        </div>
      )}
      <FavHost />
    </div>
  );
};
