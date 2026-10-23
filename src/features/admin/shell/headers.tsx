import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";
import { AccountAvatar, SiteMenu } from "../../../components/site-menu";
import { getAssetUrl } from "../../../utils/asset-url";
import backBar from "../../../styles/features/studio/settings/back-bar.module.css";
import admin from "../../../styles/features/admin/shell.module.css";

interface AdminPhoneHeaderProps {
  isStylist: boolean;
  initials: string;
}

/** Studio's back bar on phones: back to Studio for stylists (the wordmark for everyone else) and the account menu. */
export const AdminPhoneHeader = ({
  isStylist,
  initials,
}: AdminPhoneHeaderProps) => (
  <div className={backBar.backBar} data-screen-label="Admin back bar">
    <div className={backBar.backRow}>
      {isStylist ? (
        <Link className={backBar.backButton} to="/studio">
          <ChevronLeft size={18} strokeWidth={2} />
          Studio
        </Link>
      ) : (
        <Link to="/" aria-label="Tiwára's House home">
          <img
            className={admin.wordmark}
            src={getAssetUrl("logos/logo-crimson-sm.png")}
            alt=""
          />
        </Link>
      )}
      <div className={backBar.spacer}></div>
      <SiteMenu isSignedIn>
        <AccountAvatar initials={initials} />
      </SiteMenu>
    </div>
  </div>
);
