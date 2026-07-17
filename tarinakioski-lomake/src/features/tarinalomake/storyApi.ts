import type { ApproveResult } from "./types";

import { normalizeStartedJobs } from "./utils";

export async function approveStory(formData: FormData) {
  const response = await fetch("/api/stories", {
    method: "POST",
    body: formData,
  });

  let result: ApproveResult = {};

  try {
    result = (await response.json()) as ApproveResult;
  } catch {
    result = {};
  }

  result.startedJobs = normalizeStartedJobs(result.startedJobs);

  if (!response.ok) {
    throw new Error(result.error || "API-kutsu epäonnistui.");
  }

  return result;
}

import type { RenderStatusResponse } from "./types";

export async function cancelStory(
  storyId: string,
): Promise<RenderStatusResponse> {
  const response = await fetch(
    `/api/stories/${encodeURIComponent(storyId)}/cancel`,
    {
      method: "POST",
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Videoiden työstämisen keskeyttäminen epäonnistui.",
    );
  }

  return result;
}
