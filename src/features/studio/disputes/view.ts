import {
  acceptDispute,
  EVIDENCE_TYPES,
  MAX_EVIDENCE_BYTES,
  sendDisputeEvidence,
  uploadDisputeFile,
} from "../../../lib/studio-api/disputes";
import { SaveError } from "../../../lib/studio-writes";
import { formatMoney } from "../../../utils/money";
import {
  getDisputeReason,
  getRespondBy,
  getTakenBack,
} from "../bookings/dispute-records";
import type { DisputeForm, EvidenceSlot, StudioState } from "../core/types";
import type { StudioController } from "../core/use-studio";

export const EVIDENCE_SLOTS: { slot: EvidenceSlot; label: string }[] = [
  { slot: "photos", label: "Photos of the work" },
  { slot: "messages", label: "Messages with the client" },
  { slot: "other", label: "Anything else" },
];

export const EVIDENCE_ACCEPT = EVIDENCE_TYPES.join(",");

const SENT_MESSAGE =
  "Evidence sent. You’ll see the bank’s decision in Earnings.";

const markAnswered =
  (id: string, outcome: string) =>
  ({ answeredDisputes, pastNew }: StudioState): Partial<StudioState> => ({
    answeredDisputes: { ...answeredDisputes, [id]: outcome },
    pastNew: pastNew.map((row) =>
      row.dispute?.id === id
        ? { ...row, dispute: { ...row.dispute, outcome } }
        : row,
    ),
  });

export const getDisputeView = (studio: StudioController) => {
  const {
    state: { sheet, disputeForm: form },
    setState,
    actions: { showToast, closeSheet },
  } = studio;

  if (sheet !== "dispute" || !form) return null;

  const { dispute, files, text, clientName, service, when, isSending } = form;
  const { id } = dispute;
  const first = clientName.split(" ")[0] || "Your client";

  // an upload finishing after the sheet moved on to another dispute
  const isThisForm = (
    current: DisputeForm | null | undefined,
  ): current is DisputeForm => current?.dispute.id === id;

  const patch = (value: Partial<DisputeForm>) =>
    setState(({ disputeForm }) => ({
      disputeForm: isThisForm(disputeForm)
        ? { ...disputeForm, ...value }
        : disputeForm,
    }));

  const setFile = (
    slot: EvidenceSlot,
    file: DisputeForm["files"][EvidenceSlot],
  ) =>
    setState(({ disputeForm }) => ({
      disputeForm: isThisForm(disputeForm)
        ? { ...disputeForm, files: { ...disputeForm.files, [slot]: file } }
        : disputeForm,
    }));

  const fail = (error: unknown, fallback: string) =>
    showToast(error instanceof SaveError ? error.message : fallback);

  const pickFile = async (slot: EvidenceSlot, file: File | undefined) => {
    if (!file) return;

    if (!EVIDENCE_TYPES.includes(file.type))
      return showToast("Add a PDF, JPG or PNG.");

    if (file.size > MAX_EVIDENCE_BYTES)
      return showToast("That file is over 4.5 MB. Try a smaller one.");

    setFile(slot, { name: file.name, fileId: null });

    try {
      const fileId = await uploadDisputeFile(id, file);

      setFile(slot, { name: file.name, fileId });
    } catch (error) {
      setFile(slot, undefined);
      fail(error, "That file didn’t upload. Try again.");
    }
  };

  const answer = async (
    task: () => Promise<unknown>,
    outcome: string,
    message: string,
  ) => {
    patch({ isSending: true });

    try {
      await task();
      setState(markAnswered(id, outcome));
      closeSheet();
      showToast(message);
    } catch (error) {
      patch({ isSending: false });
      fail(error, "That didn’t go through. Try again.");
    }
  };

  const getFileId = (slot: EvidenceSlot) => files[slot]?.fileId ?? undefined;

  const send = () =>
    answer(
      () =>
        sendDisputeEvidence(id, {
          text,
          photos: getFileId("photos"),
          messages: getFileId("messages"),
          other: getFileId("other"),
        }),
      "submitted",
      SENT_MESSAGE,
    );

  const accept = () =>
    setState({
      confirm: {
        title: "Accept the dispute?",
        body: `${first} keeps the ${formatMoney(dispute.amount, { pence: "always" })} and the bank closes the dispute. This can’t be undone.`,
        yesLabel: "Accept dispute",
        noLabel: "Go back",
        yes: () => {
          setState({ confirm: null });

          void answer(() => acceptDispute(id), "accepted", "Dispute accepted");
        },
      },
    });

  const picked = EVIDENCE_SLOTS.map(({ slot }) => files[slot]);
  const isUploading = picked.some((file) => file && !file.fileId);
  const hasEvidence = !!text.trim() || picked.some((file) => file?.fileId);

  return {
    title: `${first} ${getDisputeReason(dispute.reason)}`,
    summary: `${service} · ${when}`,
    body: `${getTakenBack(dispute)} Tell the bank what happened and add anything that shows the appointment took place.`,
    respondBy: dispute.respondBy
      ? `${getRespondBy(dispute)} If you don’t, we’ll send the booking details on your behalf.`
      : "",
    added: [
      "Service, date and time",
      "The booking policy they agreed to",
      "Their name and email",
      "When they arrived and what was charged",
    ],
    text,
    setText: (value: string) => patch({ text: value }),
    slots: EVIDENCE_SLOTS.map(({ slot, label }) => ({
      slot,
      label,
      file: files[slot] ?? null,
      pick: (file: File | undefined) => void pickFile(slot, file),
      remove: () => setFile(slot, undefined),
    })),
    isSending,
    canSend: hasEvidence && !isUploading && !isSending,
    send: () => void send(),
    accept,
  };
};

export type DisputeView = NonNullable<ReturnType<typeof getDisputeView>>;
