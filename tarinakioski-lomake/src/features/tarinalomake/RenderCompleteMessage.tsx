import { Button } from "@/components/ui/button";

import type { ApproveResult } from "./types";

type RenderCompleteMessageProps = {
  approveResult: ApproveResult | null;
  outputDir: string;
  isVisible: boolean;
  onStartNewStory: () => void;
};

export function RenderCompleteMessage({
  approveResult,
  outputDir,
  isVisible,
  onStartNewStory,
}: RenderCompleteMessageProps) {
  if (!approveResult || !isVisible) {
    return null;
  }

  return (
    <div className="mt-3 rounded border border-green-300 bg-green-100 p-4 text-sm text-green-950">
      <p className="text-base font-semibold">Video on valmis.</p>

      <p className="mt-2">
        Tarinan numero: <strong>{approveResult.storyId}</strong>
      </p>

      <p className="mt-2">Valmis video löytyy kansiosta:</p>

      <code className="mt-1 block rounded bg-white p-2 text-xs text-slate-900">
        {outputDir}
      </code>

      <Button type="button" onClick={onStartNewStory} className="mt-4">
        Aloita uusi tarina
      </Button>
    </div>
  );
}
