import { Link } from "react-router";
import { BackBar } from "../../../components/back-bar";
import { AccountAvatar, SiteMenu } from "../../../components/site-menu";
import { getAssetUrl } from "../../../utils/asset-url";
import admin from "../../../styles/features/admin/shell.module.css";

interface AdminPhoneHeaderProps {
  isStylist: boolean;
  initials: string;
}

export const AdminPhoneHeader = ({
  isStylist,
  initials,
}: AdminPhoneHeaderProps) => (
  <BackBar
    screenLabel="Admin back bar"
    back={isStylist ? { label: "Studio", to: "/studio" } : undefined}
    leading={
      <Link to="/" aria-label="Tiwára's House home">
        <img
          className={admin.wordmark}
          src={getAssetUrl("logos/logo-crimson-sm.png")}
          alt=""
        />
      </Link>
    }
  >
    <SiteMenu isSignedIn>
      <AccountAvatar initials={initials} />
    </SiteMenu>
  </BackBar>
);
