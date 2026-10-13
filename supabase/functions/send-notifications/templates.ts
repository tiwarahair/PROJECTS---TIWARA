// Email templates in the notice style of supabase/templates/*.html. Escape any user-supplied payload text before
// adding it to the HTML.
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface Notice {
  title: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  footnote: string;
}

type TemplateBuilder = (payload: Record<string, unknown>) => RenderedEmail;

const FONT = "'Schibsted Grotesk', Helvetica, Arial, sans-serif";
const HELP_URL = "https://www.tiwarashouse.com/help";

const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  dateStyle: "long",
  timeStyle: "short",
});

const renderNotice = ({ title, paragraphs, button, footnote }: Notice) => {
  const body = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:20px 0 0;font-size:15.5px;line-height:1.6">${paragraph}</p>`,
    )
    .join("\n");

  const action = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px">
  <tr>
    <td style="border-radius:999px;background:#8f1112">
      <a href="${button.url}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#fffefb;text-decoration:none;border-radius:999px">${button.label}</a>
    </td>
  </tr>
</table>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#efebe4">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efebe4">
      <tr>
        <td align="center" style="padding:40px 12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffefb;border-radius:16px">
            <tr>
              <td style="padding:40px;font-family:${FONT};color:#1a1714">
                <img src="https://www.tiwarashouse.com/email/logo-crimson.png" alt="Tiwára’s House" height="26" style="display:block;height:26px;width:auto;border:0;color:#8f1112;font-weight:600;font-size:18px" />
                <h1 style="margin:20px 0 0;font-family:${FONT};font-weight:600;letter-spacing:-0.02em;font-size:24px;line-height:1.2;color:#1a1714">${title}</h1>
${body}
${action}
                <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #e9e2d3;font-size:13px;line-height:1.55;color:#575045">${footnote}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

/** Payload: `changed_at` (ISO time of the change). Never put the tax details themselves in the payload. */
const taxDetailsUpdated: TemplateBuilder = ({ changed_at: changedAt }) => {
  if (typeof changedAt !== "string" || Number.isNaN(Date.parse(changedAt)))
    throw new Error("tax_details_updated needs changed_at");

  const when = londonTime.format(new Date(changedAt));
  const title = "Your tax details were updated";
  const changed = `The tax details on your Tiwára’s House account were changed on ${when} (UK time).`;
  const notYou =
    "If this wasn’t you, contact support straight away and check your two-step verification in Studio → Settings → Security.";

  return {
    subject: title,
    html: renderNotice({
      title,
      paragraphs: [changed, notYou],
      button: { label: "Contact support", url: HELP_URL },
      footnote: "If you made this change, you don’t need to do anything.",
    }),
    text: `${title}\n\n${changed}\n\n${notYou}\n\nSupport: ${HELP_URL}\n\nIf you made this change, you don’t need to do anything.`,
  };
};

const templates: Record<string, TemplateBuilder> = {
  tax_details_updated: taxDetailsUpdated,
};

export const renderEmail = (
  template: string,
  payload: Record<string, unknown>,
) => {
  const build = templates[template];

  if (!build) throw new Error(`unknown template ${template}`);

  return build(payload);
};
