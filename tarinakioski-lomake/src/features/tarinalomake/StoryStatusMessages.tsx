import type { ApproveResult } from "./types";

import { getStartedJobsText } from "./utils";

type StoryStatusMessagesProps = {
  isApproving: boolean;
  approveResult: ApproveResult | null;
  approveError: string;
  progressError: string;
};

export function StoryStatusMessages({
  isApproving,
  approveResult,
  approveError,
  progressError,
}: StoryStatusMessagesProps) {
  return (
    <>
      {isApproving && (
        <div className="mt-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          Tallennetaan tarinaa ja käynnistetään renderöintiä. Tämä voi kestää
          hetken. Älä sulje ikkunaa.
        </div>
      )}

      {approveResult && (
        <div className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">Tarina tallennettu onnistuneesti.</p>

          <p>
            Tarinan numero:{" "}
            <strong>{approveResult.storyId || "ei tunnusta"}</strong>
          </p>

          <p>
            Käynnistetyt renderöinnit:{" "}
            <strong>{getStartedJobsText(approveResult.startedJobs)}</strong>
          </p>
        </div>
      )}

      {progressError && (
        <div className="mt-3 rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          Renderöinnin etenemistietoa ei saatu haettua: {progressError}
        </div>
      )}

      {approveError && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">Tietojen lähettäminen epäonnistui.</p>
          <p>{approveError}</p>
        </div>
      )}
    </>
  );
}
