import type { RenderFormat, RenderJobProgress, RenderJobStatus } from "./types";

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
    return "Renderöidään";
  }

  if (status === "finished") {
    return "Valmis";
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
    };

    if (!isRenderFormat(item.format) || !isRenderJobStatus(item.status)) {
      return;
    }

    const rawProgress =
      typeof item.progress === "number" ? item.progress : Number(item.progress);

    const progress = Number.isFinite(rawProgress)
      ? clampProgress(rawProgress)
      : 0;

    const normalizedJob: RenderJobProgress = {
      format: item.format,
      status: item.status,
      progress,
    };

    if (typeof item.message === "string" && item.message.length > 0) {
      normalizedJob.message = item.message;
    }

    normalizedJobs.push(normalizedJob);
  });

  return normalizedJobs;
}

export function normalizeStartedJobs(startedJobs: unknown): RenderFormat[] {
  if (!Array.isArray(startedJobs)) {
    return [];
  }

  return startedJobs.filter(isRenderFormat);
}
