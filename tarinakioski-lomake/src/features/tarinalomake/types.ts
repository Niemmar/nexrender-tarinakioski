export type RenderFormat = "insta" | "hd";

export type StoryMetadata = {
  title: string;
  author: string;
  date: string;
  removeBackground: boolean;
};

export type SubmittedStory = {
  title: string;
  author: string;
  date: string;
  backgroundImage: string;
  storyVideo: string;
  renderFormats: RenderFormat[];
  removeBackground: boolean;
  metadataJson: StoryMetadata;
};

export type ApproveResult = {
  ok?: boolean;
  storyId?: string;
  storyDir?: string;
  outputDir?: string;
  startedJobs?: RenderFormat[];
  error?: string;
};

export type RenderJobStatus =
  | "queued"
  | "preparing"
  | "rendering"
  | "finished"
  | "failed";

export type RenderJobProgress = {
  format: RenderFormat;
  status: RenderJobStatus;
  progress: number;
  message?: string;
  error?: string;
  technicalDetails?: string;
  updatedAt?: string;
};

export type BackgroundRemovalStatus =
  | "skipped"
  | "queued"
  | "running"
  | "finished"
  | "failed";

export type BackgroundRemovalStepStatus =
  | "queued"
  | "running"
  | "finished"
  | "failed";

export type BackgroundRemovalStepName =
  | "preprocessing"
  | "processing"
  | "finishing";

export type BackgroundRemovalStepProgress = {
  status: BackgroundRemovalStepStatus;
  progress: number;
  message?: string;
  updatedAt?: string;
};

export type BackgroundRemovalProgress = {
  enabled: boolean;
  status: BackgroundRemovalStatus;
  steps: Partial<
    Record<BackgroundRemovalStepName, BackgroundRemovalStepProgress>
  >;
  error?: string | null;
  technicalDetails?: string | null;
  updatedAt?: string;
};

export type RenderStatusResponse = {
  ok?: boolean;
  status?: string;
  storyId?: string;
  backgroundRemoval?: unknown;
  jobs?: unknown;
  error?: string;
};
