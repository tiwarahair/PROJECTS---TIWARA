// One builder per template key; each turns a row's payload into a notice (layout in _shared/email-layout.ts).
import { renderNotice, SUPPORT_EMAIL } from "../_shared/email-layout.ts";
import type { RenderedEmail } from "../_shared/email-layout.ts";

type TemplateBuilder = (payload: Record<string, unknown>) => RenderedEmail;

const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  dateStyle: "long",
  timeStyle: "short",
});

const getChangedAt = (template: string, changedAt: unknown) => {
  if (typeof changedAt !== "string" || Number.isNaN(Date.parse(changedAt)))
    throw new Error(`${template} needs changed_at`);

  return londonTime.format(new Date(changedAt));
};

/** Payload: `changed_at` (ISO time of the change). Never put the tax details themselves in the payload. */
const taxDetailsUpdated: TemplateBuilder = ({ changed_at: changedAt }) => {
  const when = getChangedAt("tax_details_updated", changedAt);

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

/** Payload: `changed_at`. Sent when an authenticator app is confirmed or removed. */
const authenticatorChanged =
  (isAdded: boolean): TemplateBuilder =>
  ({ changed_at: changedAt }) => {
    const template = isAdded ? "authenticator_added" : "authenticator_removed";
    const when = getChangedAt(template, changedAt);

    return renderNotice({
      title: `An authenticator app was ${isAdded ? "added" : "removed"}`,
      paragraphs: [
        `An authenticator app was ${isAdded ? "added to" : "removed from"} your Tiwára’s House account on ${when} (UK time).`,
        `If this wasn’t you, contact support at ${SUPPORT_EMAIL} straight away.`,
      ],
      button: { label: "Contact support", url: `mailto:${SUPPORT_EMAIL}` },
      footnote: "If you made this change, you don’t need to do anything.",
    });
  };

const templates: Record<string, TemplateBuilder> = {
  tax_details_updated: taxDetailsUpdated,
  authenticator_added: authenticatorChanged(true),
  authenticator_removed: authenticatorChanged(false),
};

export const renderEmail = (
  template: string,
  payload: Record<string, unknown>,
) => {
  const build = templates[template];

  if (!build) throw new Error(`unknown template ${template}`);

  return build(payload);
};
