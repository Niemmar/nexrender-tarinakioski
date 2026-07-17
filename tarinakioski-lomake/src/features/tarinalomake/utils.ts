import type {
  BackgroundRemovalProgress,
  BackgroundRemovalStatus,
  BackgroundRemovalStepName,
  BackgroundRemovalStepProgress,
  BackgroundRemovalStepStatus,
  RenderFormat,
  RenderJobProgress,
  RenderJobStatus,
} from "./types";

export function getTodayDate() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - timezoneOffset * 60 * 1000);

  return localDate.toISOString().split("T")[0];
}

export function isRenderFormat(value: unknown): value is RenderFormat {
  return value === "insta" || value === "hd";
}

export function isRenderJobStatus(value: unknown): value is RenderJobStatus {
  return (
    value === "queued" ||
    value === "preparing" ||
    value === "rendering" ||
    value === "finished" ||
    value === "failed"
  );
}

export function isBackgroundRemovalStatus(
  value: unknown,
): value is BackgroundRemovalStatus {
  return (
    value === "skipped" ||
    value === "queued" ||
    value === "running" ||
    value === "finished" ||
    value === "failed"
  );
}

export function isBackgroundRemovalStepStatus(
  value: unknown,
): value is BackgroundRemovalStepStatus {
  return (
    value === "queued" ||
    value === "running" ||
    value === "finished" ||
    value === "failed"
  );
}

export function getRenderFormatLabel(format: RenderFormat) {
  if (format === "insta") {
    return "Instagram-video";
  }

  return "HD-video";
}

export function getRenderJobStatusLabel(status: RenderJobStatus) {
  if (status === "queued") {
    return "Odottaa";
  }

  if (status === "preparing") {
    return "Valmistellaan";
  }

  if (status === "rendering") {
    return "Luodaan";
  }

  if (status === "finished") {
    return "Valmis";
  }

  if (status === "cancelled") {
    return "Keskeytetty";
  }

  return "Epäonnistui";
}

export function getBackgroundRemovalStepLabel(step: BackgroundRemovalStepName) {
  if (step === "preprocessing") {
    return "Esikäsittely";
  }

  if (step === "processing") {
    return "Taustan poistaminen";
  }

  return "Viimeistely";
}

export function getBackgroundRemovalStepStatusLabel(
  status: BackgroundRemovalStepStatus,
) {
  if (status === "queued") {
    return "Odottaa";
  }

  if (status === "running") {
    return "Käynnissä";
  }

  if (status === "finished") {
    return "Valmis";
  }

  if (status === "cancelled") {
    return "Keskeytetty";
  }

  return "Epäonnistui";
}

export function getStartedJobsText(startedJobs: RenderFormat[] | undefined) {
  if (!startedJobs || startedJobs.length === 0) {
    return "ei renderöintejä";
  }

  return startedJobs.map((format) => getRenderFormatLabel(format)).join(", ");
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

export function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, progress));
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function normalizeBackgroundRemovalStep(
  value: unknown,
  fallbackMessage: string,
): BackgroundRemovalStepProgress {
  if (!value || typeof value !== "object") {
    return {
      status: "queued",
      progress: 0,
      message: fallbackMessage,
    };
  }

  const item = value as {
    status?: unknown;
    progress?: unknown;
    message?: unknown;
    updatedAt?: unknown;
  };

  const status = isBackgroundRemovalStepStatus(item.status)
    ? item.status
    : "queued";

  const rawProgress =
    typeof item.progress === "number" ? item.progress : Number(item.progress);

  const progress = Number.isFinite(rawProgress)
    ? clampProgress(rawProgress)
    : 0;

  return {
    status,
    progress,
    message: normalizeOptionalString(item.message) ?? fallbackMessage,
    updatedAt: normalizeOptionalString(item.updatedAt),
  };
}

export function normalizeBackgroundRemovalProgress(
  value: unknown,
): BackgroundRemovalProgress | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as {
    enabled?: unknown;
    status?: unknown;
    steps?: unknown;
    error?: unknown;
    technicalDetails?: unknown;
    updatedAt?: unknown;
  };

  if (
    typeof item.enabled !== "boolean" ||
    !isBackgroundRemovalStatus(item.status)
  ) {
    return null;
  }

  const rawSteps =
    item.steps && typeof item.steps === "object"
      ? (item.steps as Record<string, unknown>)
      : {};

  const steps = item.enabled
    ? {
        preprocessing: normalizeBackgroundRemovalStep(
          rawSteps.preprocessing,
          "Esikäsittely odottaa.",
        ),
        processing: normalizeBackgroundRemovalStep(
          rawSteps.processing,
          "Taustan poistaminen odottaa.",
        ),
        finishing: normalizeBackgroundRemovalStep(
          rawSteps.finishing,
          "Viimeistely odottaa.",
        ),
      }
    : {};

  return {
    enabled: item.enabled,
    status: item.status,
    steps,
    error: normalizeOptionalString(item.error) ?? null,
    technicalDetails: normalizeOptionalString(item.technicalDetails) ?? null,
    updatedAt: normalizeOptionalString(item.updatedAt),
  };
}

export function normalizeRenderProgressJobs(
  jobs: unknown,
): RenderJobProgress[] {
  if (!Array.isArray(jobs)) {
    return [];
  }

  const normalizedJobs: RenderJobProgress[] = [];

  jobs.forEach((job) => {
    if (!job || typeof job !== "object") {
      return;
    }

    const item = job as {
      format?: unknown;
      status?: unknown;
      progress?: unknown;
      message?: unknown;
      error?: unknown;
      technicalDetails?: unknown;
      updatedAt?: unknown;
    };

    if (!isRenderFormat(item.format) || !isRenderJobStatus(item.status)) {
      return;
    }

    const rawProgress =
      typeof item.progress === "number" ? item.progress : Number(item.progress);

    const progress = Number.isFinite(rawProgress)
      ? clampProgress(rawProgress)
      : 0;

    normalizedJobs.push({
      format: item.format,
      status: item.status,
      progress,
      message: normalizeOptionalString(item.message),
      error: normalizeOptionalString(item.error),
      technicalDetails: normalizeOptionalString(item.technicalDetails),
      updatedAt: normalizeOptionalString(item.updatedAt),
    });
  });

  return normalizedJobs;
}

export function normalizeStartedJobs(startedJobs: unknown): RenderFormat[] {
  if (!Array.isArray(startedJobs)) {
    return [];
  }

  return startedJobs.filter(isRenderFormat);
}
