// link-preview HTML for a stylist profile (WhatsApp, iMessage, Facebook and other crawlers read only these tags).
export interface PreviewProfile {
  slug: string;
  business_name: string;
  area_label: string | null;
  bio: string | null;
  cover_path: string | null;
}

const SITE_NAME = "Tiwára’s House";

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

const toDescription = ({ area_label, bio }: PreviewProfile) => {
  const summary = (bio ?? "").trim().replace(/\s+/g, " ");
  const intro = area_label ? `${area_label} · ` : "";

  return `${intro}${summary.length > 150 ? `${summary.slice(0, 147)}…` : summary || "Book online."}`;
};

/** The profile's tags, or the site's own when the profile isn't public (or the path isn't a profile). */
export const getPreviewHtml = (
  origin: string,
  supabaseUrl: string,
  profile: PreviewProfile | null,
) => {
  const title = profile ? `${profile.business_name} · ${SITE_NAME}` : SITE_NAME;
  const url = profile ? `${origin}/${profile.slug}` : origin;

  const description = profile
    ? toDescription(profile)
    : "Find and book hair stylists near you.";

  // demo covers (local seed) are app assets, not Storage objects
  const image =
    profile?.cover_path && !profile.cover_path.startsWith("demo/")
      ? `${supabaseUrl}/storage/v1/object/public/stylist-photos/${profile.cover_path}`
      : null;

  const tags = [
    ["og:type", "profile"],
    ["og:site_name", SITE_NAME],
    ["og:title", title],
    ["og:description", description],
    ["og:url", url],
    ...(image ? [["og:image", image]] : []),
  ];

  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
${tags.map(([property, content]) => `    <meta property="${property}" content="${escapeHtml(content ?? "")}" />`).join("\n")}
    <link rel="canonical" href="${escapeHtml(url)}" />
  </head>
  <body></body>
</html>`;
};
