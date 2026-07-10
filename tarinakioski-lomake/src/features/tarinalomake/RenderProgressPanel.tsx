import type {
  BackgroundRemovalProgress,
  BackgroundRemovalStepName,
  BackgroundRemovalStepProgress,
  RenderJobProgress,
} from "./types";

import {
  getBackgroundRemovalStepLabel,
  getBackgroundRemovalStepStatusLabel,
  getRenderFormatLabel,
  getRenderJobStatusLabel,
} from "./utils";

type RenderProgressPanelProps = {
  renderProgress: RenderJobProgress[];
  backgroundRemovalProgress: BackgroundRemovalProgress | null;
};

const backgroundRemovalStepOrder: BackgroundRemovalStepName[] = [
  "preprocessing",
  "processing",
  "finishing",
];

function ProgressBar({ progress, label }: { progress: number; label: string }) {
  const roundedProgress = Math.round(progress);

  return (
    <div
      className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedProgress}
    >
      <div
        className="h-full rounded-full bg-blue-600 transition-all"
        style={{ width: `${roundedProgress}%` }}
      />
    </div>
  );
}

function getBackgroundRemovalStepText(step: BackgroundRemovalStepProgress) {
  if (step.status === "running") {
    return `${Math.round(step.progress)} %`;
  }

  return getBackgroundRemovalStepStatusLabel(step.status);
}

function getRenderJobText(job: RenderJobProgress) {
  if (job.status === "rendering") {
    return `${getRenderJobStatusLabel(job.status)} ${Math.round(
      job.progress,
    )} %`;
  }

  return getRenderJobStatusLabel(job.status);
}

export function RenderProgressPanel({
  renderProgress,
  backgroundRemovalProgress,
}: RenderProgressPanelProps) {
  const showBackgroundRemoval = Boolean(backgroundRemovalProgress?.enabled);

  if (!showBackgroundRemoval && renderProgress.length === 0) {
    return null;
  }

  const finalVideoStageNumber = showBackgroundRemoval ? 2 : 1;

  return (
    <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      <p className="font-semibold">Videon käsittelyn eteneminen</p>

      <div className="mt-4 space-y-5">
        {showBackgroundRemoval && backgroundRemovalProgress && (
          <section>
            <h3 className="font-semibold">1. Taustan poistaminen videosta</h3>

            <div className="mt-3 space-y-4">
              {backgroundRemovalStepOrder.map((stepName) => {
                const step = backgroundRemovalProgress.steps[stepName];

                if (!step) {
                  return null;
                }

                const showProgressBar =
                  stepName === "processing" || stepName === "finishing";

                return (
                  <div key={stepName}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">
                        {getBackgroundRemovalStepLabel(stepName)}
                      </span>

                      <span>{getBackgroundRemovalStepText(step)}</span>
                    </div>

                    {showProgressBar && (
                      <ProgressBar
                        progress={step.progress}
                        label={getBackgroundRemovalStepLabel(stepName)}
                      />
                    )}

                    {step.status === "failed" && step.message && (
                      <p className="mt-1 text-xs text-red-700">
                        {step.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h3 className="font-semibold">
            {finalVideoStageNumber}. Lopullisen videon luominen
          </h3>

          <div className="mt-3 space-y-4">
            {renderProgress.map((job) => (
              <div key={job.format}>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">
                    {getRenderFormatLabel(job.format)}
                  </span>

                  <span>{getRenderJobText(job)}</span>
                </div>

                <ProgressBar
                  progress={job.progress}
                  label={getRenderFormatLabel(job.format)}
                />

                {job.message && (
                  <p
                    className={`mt-1 text-xs ${
                      job.status === "failed" ? "text-red-700" : "text-blue-800"
                    }`}
                  >
                    {job.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
