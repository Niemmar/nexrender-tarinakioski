export type RenderFormat = "insta" | "hd";

export type StoryMetadata = {
  title: string;
  author: string;
  date: string;
};

export type SubmittedStory = {
  title: string;
  author: string;
  date: string;
  backgroundImage: string;
  storyVideo: string;
  renderFormats: RenderFormat[];
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
};

export type RenderStatusResponse = {
  ok?: boolean;
  status?: string;
  storyId?: string;
  jobs?: unknown;
  error?: string;
};
