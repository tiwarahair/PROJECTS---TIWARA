// One builder per template key; each turns a row's payload into a notice (layout in _shared/email-layout.ts).
import { renderNotice, SUPPORT_EMAIL } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";

type TemplateBuilder = (payload: Record<string, unknown>) => RenderedEmail;

const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  dateStyle: "long",
  timeStyle: "short",
});

/** Payload: `changed_at` (ISO time of the change). Never put the tax details themselves in the payload. */
const taxDetailsUpdated: TemplateBuilder = ({ changed_at: changedAt }) => {
  if (typeof changedAt !== "string" || Number.isNaN(Date.parse(changedAt)))
    throw new Error("tax_details_updated needs changed_at");

  const when = londonTime.format(new Date(changedAt));

  return renderNotice({
    title: "Your tax details were updated",
    paragraphs: [
      `The tax details on your Tiwára’s House account were changed on ${when} (UK time).`,
      `If this wasn’t you, contact support at ${SUPPORT_EMAIL} straight away and check your two-step verification in Studio → Settings → Security.`,
    ],
    button: { label: "Contact support", url: `mailto:${SUPPORT_EMAIL}` },
    footnote: "If you made this change, you don’t need to do anything.",
  });
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
