import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { RenderCompleteMessage } from "@/features/tarinalomake/RenderCompleteMessage";
import { RenderFailedMessage } from "@/features/tarinalomake/RenderFailedMessage";
import { RenderProgressPanel } from "@/features/tarinalomake/RenderProgressPanel";
import { StoryFormFields } from "@/features/tarinalomake/StoryFormFields";
import { StoryReview } from "@/features/tarinalomake/StoryReview";
import { StoryStatusMessages } from "@/features/tarinalomake/StoryStatusMessages";
import { approveStory } from "@/features/tarinalomake/storyApi";
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

  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [titleLength, setTitleLength] = useState(0);

  const { renderProgress, progressError } = useRenderProgress(
    approveResult?.storyId,
    approveResult?.startedJobs,
  );

  const allRenderJobsFinished =
    renderProgress.length > 0 &&
    renderProgress.every((job) => job.status === "finished");

  const hasFailedRenderJob = renderProgress.some(
    (job) => job.status === "failed",
  );

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

  function handleClear() {
    formRef.current?.reset();
    setSubmittedStory(null);
    resetApproveState();
    setIsApproving(false);
    setTitleLength(0);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl space-y-6 rounded-xl bg-white p-6 shadow-md"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Uusi tarina</h1>
          <p className="mt-2 text-sm text-slate-600">
            Syötä tarinan perustiedot ja valitse, mitkä videot luodaan.
          </p>
        </div>

        <StoryFormFields
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

            <RenderProgressPanel renderProgress={renderProgress} />

            <RenderCompleteMessage
              approveResult={approveResult}
              outputDir={outputDir}
              isVisible={allRenderJobsFinished && !hasFailedRenderJob}
              onStartNewStory={handleClear}
            />

            <RenderFailedMessage
              isVisible={Boolean(approveResult) && hasFailedRenderJob}
            />
          </section>
        )}
      </form>
    </main>
  );
}
