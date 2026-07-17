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

type RenderStatusApiResponse = Partial<RenderStatusResponse> & {
  error?: string;
};

function createQueuedJobs(
  formats: RenderFormat[] | undefined,
): RenderJobProgress[] {
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
    progress.status === "skipped" ||
    progress.status === "cancelled"
  );
}

function areRenderJobsFinished(jobs: RenderJobProgress[]) {
  if (jobs.length === 0) {
    return true;
  }

  return jobs.every(
    (job) =>
      job.status === "finished" ||
      job.status === "failed" ||
      job.status === "cancelled",
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

  const [canCancel, setCanCancel] = useState(false);

  const [wasCancelled, setWasCancelled] = useState(false);

  useEffect(() => {
    if (!storyId) {
      setRenderProgress([]);
      setBackgroundRemovalProgress(null);
      setProgressError("");
      setCanCancel(false);
      setWasCancelled(false);
      return;
    }

    /*
     * storyId on tarkistettu yllä string-arvoksi.
     * Käytetään sisäisessä async-funktiossa tätä
     * paikallista vakiota, jotta TypeScript tietää
     * varmasti arvon olevan string.
     */
    const currentStoryId = storyId;

    setRenderProgress(createQueuedJobs(startedJobs));

    setBackgroundRemovalProgress(
      createQueuedBackgroundRemoval(removeBackground),
    );

    setProgressError("");
    setCanCancel(true);
    setWasCancelled(false);

    let intervalId: number | undefined;
    let effectDisposed = false;

    function stopPolling() {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    }

    async function fetchProgress() {
      try {
        const response = await fetch(
          `/api/stories/${encodeURIComponent(currentStoryId)}/status`,
        );

        let result: RenderStatusApiResponse = {};

        try {
          result = (await response.json()) as RenderStatusApiResponse;
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

        if (effectDisposed) {
          return;
        }

        const cancelled = result.cancelled === true;

        setRenderProgress(jobs);

        setBackgroundRemovalProgress(backgroundRemoval);

        setProgressError("");

        setCanCancel(result.canCancel === true);

        setWasCancelled(cancelled);

        const allRenderJobsDone = areRenderJobsFinished(jobs);

        const backgroundRemovalDone =
          isBackgroundRemovalFinished(backgroundRemoval);

        if (cancelled || (allRenderJobsDone && backgroundRemovalDone)) {
          setCanCancel(false);
          stopPolling();
        }
      } catch (error: unknown) {
        if (effectDisposed) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Videon käsittelyn etenemistiedon haku epäonnistui.";

        setProgressError(message);
      }
    }

    intervalId = window.setInterval(() => {
      void fetchProgress();
    }, 2000);

    void fetchProgress();

    return () => {
      effectDisposed = true;
      stopPolling();
    };
  }, [storyId, startedJobs, removeBackground]);

  return {
    renderProgress,
    backgroundRemovalProgress,
    progressError,
    canCancel,
    wasCancelled,
  };
}
