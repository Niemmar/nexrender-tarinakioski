import type { BackgroundRemovalProgress, RenderJobProgress } from "./types";

import { getRenderFormatLabel } from "./utils";

type RenderFailedMessageProps = {
  isVisible: boolean;
  backgroundRemovalProgress: BackgroundRemovalProgress | null;
  renderProgress: RenderJobProgress[];
};

export function RenderFailedMessage({
  isVisible,
  backgroundRemovalProgress,
  renderProgress,
}: RenderFailedMessageProps) {
  if (!isVisible) {
    return null;
  }

  const userMessages: string[] = [];
  const technicalDetails: string[] = [];

  const backgroundRemovalFailed =
    backgroundRemovalProgress?.status === "failed";

  if (backgroundRemovalFailed) {
    userMessages.push(
      backgroundRemovalProgress.error ||
        "Taustan poistaminen videosta epäonnistui.",
    );

    if (backgroundRemovalProgress.technicalDetails) {
      technicalDetails.push(backgroundRemovalProgress.technicalDetails);
    }
  } else {
    renderProgress
      .filter((job) => job.status === "failed")
      .forEach((job) => {
        const label = getRenderFormatLabel(job.format);

        userMessages.push(
          `${label}: ${
            job.error ||
            job.message ||
            "Lopullisen videon luominen epäonnistui."
          }`,
        );

        if (job.technicalDetails) {
          technicalDetails.push(`${label}\n${job.technicalDetails}`);
        }
      });
  }

  if (userMessages.length === 0) {
    userMessages.push("Videon käsittely ei onnistunut.");
  }

  return (
    <div className="mt-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-semibold">Videon käsittely epäonnistui.</p>

      <p className="mt-1">
        Tarina on tallennettu, mutta videon käsittely ei valmistunut.
      </p>

      <ul className="mt-3 list-disc space-y-1 pl-5">
        {userMessages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>

      {technicalDetails.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer font-medium">
            Näytä tekniset tiedot
          </summary>

          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-red-100 p-3 text-xs">
            {technicalDetails.join("\n\n")}
          </pre>
        </details>
      )}
    </div>
  );
}
