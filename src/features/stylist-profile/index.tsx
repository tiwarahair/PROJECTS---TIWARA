import { useLayoutEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { FavHost } from "../../components/fav-host";
import { SiteHeader } from "../../components/site-header";
import { WelcomeToast } from "../../components/welcome-toast";
import { useFavourites } from "../../hooks/use-favourites";
import { getShareData, useShare } from "../../hooks/use-share";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { getLastSearch, markSearchBack } from "../../utils/last-search";
import { BookingAside } from "./booking-aside";
import { PortfolioLightbox } from "./portfolio-lightbox";
import { ProfileCover } from "./profile-cover";
import type { ProfileActions } from "./profile-cover";
import { ProfileLede } from "./profile-lede";
import { getGallery, getLoginHref, getProfileFacts } from "./profile-facts";
import { getHoursRows, getOpenStatus } from "./profile-hours";
import type { ServiceModal as ServiceModalData } from "./profile-menu";
import {
  countServices,
  getBookHref,
  getMenuGroups,
  hasMoreServices,
  limitMenuGroups,
} from "./profile-menu";
import { ProfilePortfolio } from "./profile-portfolio";
import { ProfileReviews } from "./profile-reviews";
import { ProfileServices } from "./profile-services";
import { ProfileStickyBar } from "./profile-sticky-bar";
import { ServiceModal } from "./service-modal";
import { SharePopover } from "./share-popover";
import pageGlobal from "../../styles/features/stylist-profile/index-global.module.css";
import styles from "../../styles/features/stylist-profile/index.module.css";
import { useRevealSweep } from "./use-reveal-sweep";
import { useSharePopover } from "./use-share-popover";
import { useStickyBar } from "./use-sticky-bar";
import type { PublicStylist } from "../../lib/public-stylist";

interface StylistProfileViewProps {
  publicStylist: PublicStylist;
}

/** A stylist's public profile, route "/{slug}". */
export const StylistProfileView = ({
  publicStylist: { stylist, hours, nextStart, isTakingBookings, socials },
}: StylistProfileViewProps) => {
  const { shareAt, openShare, closeShare } = useSharePopover();
  const { heroRef, isShown: isStickyShown } = useStickyBar();

  const [serviceModal, setServiceModal] = useState<ServiceModalData | null>(
    null,
  );

  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [isCoverActionsOn, setIsCoverActionsOn] = useState(false);
  const navigate = useNavigate();
  const { isFavourite, toggleFavourite } = useFavourites();
  const { share, copyLink } = useShare();

  useRevealSweep(pageGlobal.rvIn ?? "");

  // page-wide rules (colour easings, focus ring, mobile overflow) apply while the profile is mounted
  useLayoutEffect(() => {
    document.documentElement.classList.add("profile-page");

    return () => document.documentElement.classList.remove("profile-page");
  }, []);

  const { name, area, cover, portfolio = [], fromLabel } = stylist;
  const gallery = useMemo(() => getGallery(stylist), [stylist]);
  const menuGroups = useMemo(() => getMenuGroups(stylist), [stylist]);
  const facts = getProfileFacts(stylist, socials);
  const status = getOpenStatus(hours, nextStart);
  const back = getLastSearch();
  const bookHref = isTakingBookings ? getBookHref(stylist.id) : "";
  const shareData = getShareData({ id: stylist.id, name, area });
  const saved = isFavourite(stylist.id);

  const goBack = (event: MouseEvent<HTMLAnchorElement>) => {
    markSearchBack();

    if (!back.has) return;

    event.preventDefault();
    navigate(back.href);
  };

  const zoomTo = (src: string) =>
    setZoomIndex(Math.max(0, gallery.indexOf(src)));

  const actions: ProfileActions = {
    shareLabel: `Share ${name}`,
    shareExpanded: shareAt ? "true" : "false",
    onShare: (event) => {
      event.stopPropagation();

      if (shareAt) {
        closeShare();

        return;
      }

      if (share({ id: stylist.id, name, area })) return;

      openShare(event.currentTarget);
    },
    saved,
    saveLabel:
      (saved ? "Remove " : "Save ") +
      name +
      (saved ? " from favourites" : " to favourites"),
    saveTip: saved ? "Saved" : "Save",
    onToggleSaved: (event) => toggleFavourite(stylist.id, event),
  };

  return (
    <div data-screen-label="Stylist profile" className={styles.page}>
      <SiteHeader loginHref={getLoginHref(stylist.id)} />
      <ProfileCover
        name={name}
        coverUrl={cover}
        back={back}
        onBack={goBack}
        heroRef={heroRef}
        coverActionsOn={isCoverActionsOn || !!shareAt}
        onToggleCoverActions={() => setIsCoverActionsOn((isOn) => !isOn)}
        actions={actions}
      />
      <div className={joinClassNames(pageGlobal.profbody, styles.body)}>
        <ProfileLede stylist={stylist} facts={facts} status={status} />
        <div className={joinClassNames(pageGlobal.profgrid, styles.grid)}>
          <div>
            <ProfileServices
              groups={limitMenuGroups(menuGroups)}
              hasMore={hasMoreServices(menuGroups)}
              showAllLabel={`Show all ${countServices(menuGroups)} services`}
              bookHref={getBookHref(stylist.id)}
              onOpenService={setServiceModal}
            />
            <ProfilePortfolio
              portfolio={portfolio}
              onZoom={zoomTo}
              onSeeAll={() => zoomTo(portfolio[0] ?? "")}
            />
            <ProfileReviews
              slug={stylist.id}
              stylistName={name}
              rating={stylist.rating}
              reviews={stylist.reviews}
            />
          </div>
          <BookingAside
            fromLabel={fromLabel}
            bookHref={bookHref}
            facts={facts}
            hoursRows={getHoursRows(hours)}
          />
        </div>
      </div>
      {isStickyShown && (
        <ProfileStickyBar
          name={name}
          back={back}
          onBack={goBack}
          actions={actions}
        />
      )}
      {shareAt && (
        <SharePopover
          position={shareAt}
          whatsappHref={shareData.whatsapp}
          mailHref={shareData.mail}
          onCopy={() => {
            copyLink(shareData.url);
            closeShare();
          }}
          onClose={closeShare}
        />
      )}
      <div className={joinClassNames(pageGlobal.bookbar, styles.bookbar)}>
        <div className={styles.barInner}>
          <div className={styles.barText}>
            <span className={styles.barNext}>
              {bookHref
                ? `Next available: ${status.nextAvailable}`
                : "Not taking bookings right now"}
            </span>
            <span className={styles.barFrom}>{`from ${fromLabel}`}</span>
          </div>
          {bookHref && (
            <Link to={bookHref} className={styles.barBook}>
              Book now
            </Link>
          )}
        </div>
      </div>
      {zoomIndex != null && (
        <PortfolioLightbox
          photos={gallery}
          index={zoomIndex}
          onIndexChange={setZoomIndex}
          onClose={() => setZoomIndex(null)}
        />
      )}
      <div className={styles.footer}>
        <Link to="/" className={styles.poweredBy}>
          Powered by{" "}
          <img
            src={getAssetUrl("logos/logo-crimson-sm.png")}
            alt="Tiwára's House"
            className={styles.poweredLogo}
          />
        </Link>
      </div>
      {serviceModal && (
        <ServiceModal
          service={serviceModal}
          onClose={() => setServiceModal(null)}
        />
      )}
      <WelcomeToast />
      <FavHost />
    </div>
  );
};
