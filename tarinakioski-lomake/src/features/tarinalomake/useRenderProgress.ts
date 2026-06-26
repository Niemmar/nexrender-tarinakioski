import { useEffect, useState } from "react";

import type {
  RenderFormat,
  RenderJobProgress,
  RenderStatusResponse,
} from "./types";

import { normalizeRenderProgressJobs } from "./utils";

function createQueuedJobs(formats: RenderFormat[] | undefined) {
  if (!formats || formats.length === 0) {
    return [];
  }

  return formats.map((format) => ({
    format,
    status: "queued" as const,
    progress: 0,
    message: "Renderöinti jonossa.",
  }));
}

export function useRenderProgress(
  storyId: string | undefined,
  startedJobs: RenderFormat[] | undefined,
) {
  const [renderProgress, setRenderProgress] = useState<RenderJobProgress[]>([]);
  const [progressError, setProgressError] = useState("");

  useEffect(() => {
    if (!storyId) {
      setRenderProgress([]);
      setProgressError("");
      return;
    }

    setRenderProgress(createQueuedJobs(startedJobs));
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
            result.error || "Renderöinnin etenemistiedon haku epäonnistui.",
          );
        }

        const jobs = normalizeRenderProgressJobs(result.jobs);

        if (isCancelled) {
          return;
        }

        setRenderProgress(jobs);
        setProgressError("");

        const allDone =
          jobs.length > 0 &&
          jobs.every(
            (job) => job.status === "finished" || job.status === "failed",
          );

        if (allDone && intervalId) {
          window.clearInterval(intervalId);
        }
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Renderöinnin etenemistiedon haku epäonnistui.";

        setProgressError(message);
      }
    }

    fetchProgress();
    intervalId = window.setInterval(fetchProgress, 2000);

    return () => {
      isCancelled = true;

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [storyId, startedJobs]);

  return {
    renderProgress,
    progressError,
  };
}
