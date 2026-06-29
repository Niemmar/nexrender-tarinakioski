import type { RenderJobProgress } from "./types";

import { getRenderFormatLabel, getRenderJobStatusLabel } from "./utils";

type RenderProgressPanelProps = {
  renderProgress: RenderJobProgress[];
};

export function RenderProgressPanel({
  renderProgress,
}: RenderProgressPanelProps) {
  if (renderProgress.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      <p className="font-semibold">Renderöinnin eteneminen</p>

      <div className="mt-3 space-y-3">
        {renderProgress.map((job) => {
          const progress = Math.round(job.progress ?? 0);

          return (
            <div key={job.format}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="font-medium">
                  {getRenderFormatLabel(job.format)}
                </span>

                <span>
                  {getRenderJobStatusLabel(job.status)} {progress} %
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {job.message && (
                <p className="mt-1 text-xs text-blue-800">{job.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
