import { Button } from "@/components/ui/button";

import type { ApproveResult, SubmittedStory } from "./types";

import { getRenderFormatLabel } from "./utils";

type StoryReviewProps = {
  submittedStory: SubmittedStory;
  isApproving: boolean;
  approveResult: ApproveResult | null;
  onApprove: () => void;
  onEdit: () => void;
  onClear: () => void;
};

export function StoryReview({
  submittedStory,
  isApproving,
  approveResult,
  onApprove,
  onEdit,
  onClear,
}: StoryReviewProps) {
  return (
    <>
      <h2 className="text-sm font-semibold text-slate-900">Tarkista tiedot</h2>

      <dl className="mt-3 space-y-2 text-sm text-slate-700">
        <div>
          <dt className="font-medium">Nimi</dt>
          <dd>{submittedStory.author}</dd>
        </div>

        <div>
          <dt className="font-medium">Tarinan otsikko</dt>
          <dd>{submittedStory.title}</dd>
        </div>

        <div>
          <dt className="font-medium">Päivämäärä</dt>
          <dd>{submittedStory.date}</dd>
        </div>

        <div>
          <dt className="font-medium">Kuva</dt>
          <dd>{submittedStory.backgroundImage}</dd>
        </div>

        <div>
          <dt className="font-medium">Video</dt>
          <dd>{submittedStory.storyVideo}</dd>
        </div>

        <div>
          <dt className="font-medium">Luotavat videot</dt>
          <dd>
            {submittedStory.renderFormats
              .map((format) => getRenderFormatLabel(format))
              .join(", ")}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Button
          type="button"
          onClick={onApprove}
          disabled={isApproving || Boolean(approveResult)}
          className="bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isApproving
            ? "Videoita luodaan..."
            : approveResult
              ? "Hyväksytty"
              : "Hyväksy ja luo videot"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onEdit}
          disabled={isApproving}
        >
          Muokkaa tietoja
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          disabled={isApproving}
        >
          Tyhjennä
        </Button>
      </div>
    </>
  );
}
