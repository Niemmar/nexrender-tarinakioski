import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { RenderCompleteMessage } from "@/features/tarinalomake/RenderCompleteMessage";
import { RenderFailedMessage } from "@/features/tarinalomake/RenderFailedMessage";
import { RenderProgressPanel } from "@/features/tarinalomake/RenderProgressPanel";
import { StoryFormFields } from "@/features/tarinalomake/StoryFormFields";
import { StoryReview } from "@/features/tarinalomake/StoryReview";
import { StoryStatusMessages } from "@/features/tarinalomake/StoryStatusMessages";
import { approveStory, cancelStory } from "@/features/tarinalomake/storyApi";
import { createSubmittedStoryFromFormData } from "@/features/tarinalomake/storyFormData";
import { useRenderProgress } from "@/features/tarinalomake/useRenderProgress";

import type {
  ApproveResult,
  SubmittedStory,
} from "@/features/tarinalomake/types";

const TITLE_MAX_LENGTH = 50;
const DEFAULT_OUTPUT_ROOT_DIR = "C:\\nexrender-tarinakioski\\output";

export default function Tarinalomake() {
  const formRef = useRef<HTMLFormElement>(null);

  const [submittedStory, setSubmittedStory] = useState<SubmittedStory | null>(
    null,
  );
  const [approveResult, setApproveResult] = useState<ApproveResult | null>(
    null,
  );

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const [isCancelling, setIsCancelling] = useState(false);

  const [cancelError, setCancelError] = useState<string | null>(null);

  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [titleLength, setTitleLength] = useState(0);
  const [formKey, setFormKey] = useState(0);

  const {
    renderProgress,
    backgroundRemovalProgress,
    progressError,
    canCancel,
    wasCancelled,
  } = useRenderProgress(
    approveResult?.storyId,
    approveResult?.startedJobs,
    submittedStory?.removeBackground,
  );

  const allRenderJobsFinished =
    renderProgress.length > 0 &&
    renderProgress.every((job) => job.status === "finished");

  const hasFailedRenderJob = renderProgress.some(
    (job) => job.status === "failed",
  );

  const hasFailedBackgroundRemoval =
    backgroundRemovalProgress?.status === "failed";

  const hasFailedProcessing = hasFailedRenderJob || hasFailedBackgroundRemoval;

  const outputDir =
    approveResult?.outputDir ||
    (approveResult?.storyId
      ? `${DEFAULT_OUTPUT_ROOT_DIR}\\${approveResult.storyId}`
      : "");

  function resetApproveState() {
    setApproveResult(null);
    setApproveError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetApproveState();

    const formData = new FormData(event.currentTarget);

    try {
      const storyData = createSubmittedStoryFromFormData(formData, {
        titleMaxLength: TITLE_MAX_LENGTH,
      });

      setSubmittedStory(storyData);

      console.log("Lomakkeen koko data:", storyData);
      console.log("Luotava metadata.json:", storyData.metadataJson);
      console.log("Renderöintivalinnat:", storyData.renderFormats);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Lomakkeen tiedoissa on virhe.";

      alert(message);
    }
  }

  function handleEdit() {
    setSubmittedStory(null);
    resetApproveState();
  }

  async function handleApprove() {
    if (isApproving || approveResult) {
      return;
    }

    if (!submittedStory || !formRef.current) {
      return;
    }

    setIsApproving(true);
    resetApproveState();

    const formData = new FormData(formRef.current);

    formData.set("title", submittedStory.title);
    formData.set("author", submittedStory.author);
    formData.set("date", submittedStory.date);
    formData.set("renderFormats", JSON.stringify(submittedStory.renderFormats));
    formData.set("metadataJson", JSON.stringify(submittedStory.metadataJson));

    console.log("Lähetetään tiedot ja tiedostot API:lle:", submittedStory);

    try {
      const result = await approveStory(formData);

      console.log("API:n vastaus:", result);

      setApproveResult(result);
    } catch (error: unknown) {
      console.error("Virhe tietojen lähettämisessä:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Tietojen lähettäminen epäonnistui. Tarkista, että API on käynnissä.";

      setApproveError(message);
    } finally {
      setIsApproving(false);
    }
  }

  async function handleConfirmCancel() {
    const storyId = approveResult?.storyId;

    if (!storyId || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      await cancelStory(storyId);
      setIsCancelDialogOpen(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Videoiden työstämisen keskeyttäminen epäonnistui.";

      setCancelError(message);
    } finally {
      setIsCancelling(false);
    }
  }

  function handleClear() {
    formRef.current?.reset();
    setSubmittedStory(null);
    resetApproveState();
    setIsApproving(false);
    setTitleLength(0);
    setFormKey((current) => current + 1);
  }

  return (
    <>
      <main className="min-h-screen bg-slate-100 p-6">
        <header className="mx-auto mb-6 max-w-2xl px-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Tarinakioski
          </h1>
          <p className="mt-1 text-base font-medium text-slate-700">
            Museon tarinavideoiden luontityökalu
          </p>
        </header>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl space-y-6 rounded-xl bg-white p-6 shadow-md"
        >
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Uusi tarina</h2>

            <p className="mt-2 text-sm text-slate-600">
              Syötä tarinan perustiedot ja valitse, mitkä videot luodaan.
            </p>
          </div>

          <StoryFormFields
            key={formKey}
            isHidden={Boolean(submittedStory)}
            titleLength={titleLength}
            titleMaxLength={TITLE_MAX_LENGTH}
            onTitleLengthChange={setTitleLength}
          />

          {submittedStory && (
            <section className="rounded-lg border bg-slate-50 p-4">
              <StoryReview
                submittedStory={submittedStory}
                isApproving={isApproving}
                approveResult={approveResult}
                onApprove={handleApprove}
                onEdit={handleEdit}
                onClear={handleClear}
              />

              <StoryStatusMessages
                isApproving={isApproving}
                approveResult={approveResult}
                approveError={approveError}
                progressError={progressError}
              />

              <RenderProgressPanel
                renderProgress={renderProgress}
                backgroundRemovalProgress={backgroundRemovalProgress}
                canCancel={canCancel}
                isCancelling={isCancelling}
                onCancel={() => {
                  setCancelError(null);
                  setIsCancelDialogOpen(true);
                }}
              />

              {wasCancelled && (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  Videoiden työstäminen keskeytettiin.
                </div>
              )}

              <RenderCompleteMessage
                approveResult={approveResult}
                outputDir={outputDir}
                isVisible={
                  allRenderJobsFinished && !hasFailedProcessing && !wasCancelled
                }
                onStartNewStory={handleClear}
              />

              <RenderFailedMessage
                isVisible={
                  Boolean(approveResult) && hasFailedProcessing && !wasCancelled
                }
                backgroundRemovalProgress={backgroundRemovalProgress}
                renderProgress={renderProgress}
              />
            </section>
          )}
        </form>
      </main>

      {isCancelDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          aria-describedby="cancel-dialog-description"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2
              id="cancel-dialog-title"
              className="text-xl font-semibold text-slate-900"
            >
              Keskeytetäänkö videoiden työstäminen?
            </h2>

            <p
              id="cancel-dialog-description"
              className="mt-3 text-sm text-slate-700"
            >
              Haluatko varmasti keskeyttää? Valitsemalla ”Kyllä, keskeytä”
              taustanpoisto ja videoiden luominen lopetetaan. Jo muodostuneita
              tiedostoja ei poisteta.
            </p>

            {cancelError && (
              <p className="mt-4 text-sm text-red-700">{cancelError}</p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCancelDialogOpen(false);
                  setCancelError(null);
                }}
                disabled={isCancelling}
                className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ei, jatka
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleConfirmCancel();
                }}
                disabled={isCancelling}
                className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancelling ? "Keskeytetään…" : "Kyllä, keskeytä"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
