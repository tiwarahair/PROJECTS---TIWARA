import { useLayoutEffect, useMemo } from "react";
import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { FavHost } from "../../components/fav-host/fav-host";
import { WelcomeToast } from "../../components/welcome-toast/welcome-toast";
import { useFavourites } from "../../hooks/use-favourites";
import { getShareData, useShare } from "../../hooks/use-share";
import { getAssetUrl, resolveAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { getLastSearch, markSearchBack } from "../../utils/last-search";
import { BookingAside } from "./booking-aside";
import { PortfolioLightbox } from "./portfolio-lightbox";
import { ProfileCover } from "./profile-cover";
import type { ProfileActions } from "./profile-cover";
import { ProfileHeader } from "./profile-header";
import { ProfileLede } from "./profile-lede";
import {
  countServices,
  getBookHref,
  getGallery,
  getLoginHref,
  getMenuGroups,
  getOpenStatus,
  getProfileFacts,
  getReviews,
  getStylist,
  hasMoreServices,
  limitMenuGroups,
} from "./profile-logic";
import { ProfilePortfolio } from "./profile-portfolio";
import { ProfileReviews } from "./profile-reviews";
import { ProfileServices } from "./profile-services";
import { ProfileStickyBar } from "./profile-sticky-bar";
import { ServiceModal } from "./service-modal";
import { SharePopover } from "./share-popover";
import pageGlobal from "../../styles/features/stylist-profile/stylist-profile-page-global.module.css";
import styles from "../../styles/features/stylist-profile/stylist-profile-page.module.css";
import { useRevealSweep } from "./use-reveal-sweep";
import { useStylistProfile } from "./use-stylist-profile";

/** A stylist's public profile, route "/stylist?stylist=<id>". */
export const StylistProfilePage = () => {
  const profile = useStylistProfile();
  const { id, shareAt, serviceModal, zoom, openZoom } = profile;
  const navigate = useNavigate();
  const { loggedIn, isFavourite, toggleFavourite } = useFavourites();
  const { share, copyLink } = useShare();

  useRevealSweep(pageGlobal.rvIn ?? "");

  // page-wide rules (colour easings, focus ring, mobile overflow) apply while the profile is mounted
  useLayoutEffect(() => {
    document.documentElement.classList.add("profile-page");

    return () => document.documentElement.classList.remove("profile-page");
  }, []);

  const stylist = getStylist(id);
  const { name, area, cover, portfolio = [], fromLabel } = stylist;
  const gallery = useMemo(() => getGallery(stylist), [stylist]);
  const menuGroups = useMemo(() => getMenuGroups(stylist), [stylist]);
  const facts = getProfileFacts(stylist);
  const status = getOpenStatus();
  const reviews = useMemo(getReviews, []);
  const back = getLastSearch();
  const bookHref = getBookHref(stylist.id);
  const shareData = getShareData({ id: stylist.id, name, area });
  const saved = isFavourite(stylist.id);

  const goBack = (event: MouseEvent<HTMLAnchorElement>) => {
    markSearchBack();

    if (!back.has) return;

    event.preventDefault();
    navigate(back.href);
  };

  const zoomTo = (src: string) => openZoom(gallery, gallery.indexOf(src));

  const actions: ProfileActions = {
    shareLabel: `Share ${name}`,
    shareExpanded: shareAt ? "true" : "false",
    onShare: (event) => {
      event.stopPropagation();

      if (shareAt) {
        profile.closeShare();

        return;
      }

      if (share({ id: stylist.id, name, area })) return;

      profile.openShare(event.currentTarget);
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
      <ProfileHeader
        loggedIn={loggedIn}
        loginHref={getLoginHref(stylist.id)}
        menuOpen={profile.menuOpen}
        onToggleMenu={profile.toggleMenu}
      />
      <ProfileCover
        name={name}
        coverUrl={cover ? resolveAssetUrl(cover) : ""}
        back={back}
        onBack={goBack}
        heroRef={profile.heroRef}
        shareButtonRef={profile.shareButtonRef}
        coverActionsOn={profile.coverActionsOn}
        onToggleCoverActions={profile.toggleCoverActions}
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
              bookHref={bookHref}
              onOpenService={profile.openServiceModal}
            />
            <ProfilePortfolio
              portfolio={portfolio}
              onZoom={zoomTo}
              onSeeAll={() => zoomTo(portfolio[0] ?? "")}
            />
            <ProfileReviews reviews={reviews} />
          </div>
          <BookingAside
            fromLabel={fromLabel}
            bookHref={bookHref}
            facts={facts}
          />
        </div>
      </div>
      {profile.sticky && (
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
            profile.closeShare();
          }}
          onClose={profile.closeShare}
        />
      )}
      <div className={joinClassNames(pageGlobal.bookbar, styles.bookbar)}>
        <div className={styles.barInner}>
          <div className={styles.barText}>
            <span className={styles.barNext}>
              {`Next available: ${status.nextAvailable}`}
            </span>
            <span className={styles.barFrom}>{`from ${fromLabel}`}</span>
          </div>
          <Link to={bookHref} className={styles.barBook}>
            Book now
          </Link>
        </div>
      </div>
      {zoom.src && <PortfolioLightbox zoom={zoom} />}{" "}
      <div className={styles.footer}>
        <Link to="/" className={styles.poweredBy}>
          Powered by{" "}
          <img
            src={getAssetUrl("logos/logo-crimson.png")}
            alt="Tiwára's House"
            className={styles.poweredLogo}
          />
        </Link>
      </div>
      {serviceModal && (
        <ServiceModal
          service={serviceModal}
          onClose={profile.closeServiceModal}
        />
      )}
      <WelcomeToast />
      <FavHost />
    </div>
  );
};
