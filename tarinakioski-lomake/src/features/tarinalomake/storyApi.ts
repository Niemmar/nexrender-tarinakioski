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
