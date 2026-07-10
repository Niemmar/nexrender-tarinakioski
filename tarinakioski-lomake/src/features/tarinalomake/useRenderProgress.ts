import { useEffect, useState } from "react";

import type {
  BackgroundRemovalProgress,
  RenderFormat,
  RenderJobProgress,
  RenderStatusResponse,
} from "./types";

import {
  normalizeBackgroundRemovalProgress,
  normalizeRenderProgressJobs,
} from "./utils";

function createQueuedJobs(formats: RenderFormat[] | undefined) {
  if (!formats || formats.length === 0) {
    return [];
  }

  return formats.map((format) => ({
    format,
    status: "queued" as const,
    progress: 0,
    message: "Odottaa lopullisen videon luomista.",
  }));
}

function createQueuedBackgroundRemoval(
  enabled: boolean | undefined,
): BackgroundRemovalProgress | null {
  if (!enabled) {
    return null;
  }

  return {
    enabled: true,
    status: "queued",
    steps: {
      preprocessing: {
        status: "queued",
        progress: 0,
        message: "Esikäsittely odottaa.",
      },
      processing: {
        status: "queued",
        progress: 0,
        message: "Taustan poistaminen odottaa.",
      },
      finishing: {
        status: "queued",
        progress: 0,
        message: "Viimeistely odottaa.",
      },
    },
    error: null,
    technicalDetails: null,
  };
}

function isBackgroundRemovalFinished(
  progress: BackgroundRemovalProgress | null,
) {
  if (!progress || !progress.enabled) {
    return true;
  }

  return (
    progress.status === "finished" ||
    progress.status === "failed" ||
    progress.status === "skipped"
  );
}

export function useRenderProgress(
  storyId: string | undefined,
  startedJobs: RenderFormat[] | undefined,
  removeBackground: boolean | undefined,
) {
  const [renderProgress, setRenderProgress] = useState<RenderJobProgress[]>([]);
  const [backgroundRemovalProgress, setBackgroundRemovalProgress] =
    useState<BackgroundRemovalProgress | null>(null);
  const [progressError, setProgressError] = useState("");

  useEffect(() => {
    if (!storyId) {
      setRenderProgress([]);
      setBackgroundRemovalProgress(null);
      setProgressError("");
      return;
    }

    setRenderProgress(createQueuedJobs(startedJobs));
    setBackgroundRemovalProgress(
      createQueuedBackgroundRemoval(removeBackground),
    );
    setProgressError("");

    let intervalId: number | undefined;
    let isCancelled = false;

    async function fetchProgress() {
      try {
        const response = await fetch(`/api/stories/${storyId}/status`);

        let result: RenderStatusResponse = {};

        try {
          result = (await response.json()) as RenderStatusResponse;
        } catch {
          result = {};
        }

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Videon käsittelyn etenemistiedon haku epäonnistui.",
          );
        }

        const jobs = normalizeRenderProgressJobs(result.jobs);
        const backgroundRemoval = normalizeBackgroundRemovalProgress(
          result.backgroundRemoval,
        );

        if (isCancelled) {
          return;
        }

        setRenderProgress(jobs);
        setBackgroundRemovalProgress(backgroundRemoval);
        setProgressError("");

        const allRenderJobsDone =
          jobs.length > 0 &&
          jobs.every(
            (job) => job.status === "finished" || job.status === "failed",
          );

        const backgroundRemovalDone =
          isBackgroundRemovalFinished(backgroundRemoval);

        if (allRenderJobsDone && backgroundRemovalDone && intervalId) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Videon käsittelyn etenemistiedon haku epäonnistui.";

        setProgressError(message);
      }
    }

    intervalId = window.setInterval(fetchProgress, 2000);
    void fetchProgress();

    return () => {
      isCancelled = true;

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [storyId, startedJobs, removeBackground]);

  return {
    renderProgress,
    backgroundRemovalProgress,
    progressError,
  };
}
