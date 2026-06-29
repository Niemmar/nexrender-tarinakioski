import type { RenderFormat, StoryMetadata, SubmittedStory } from "./types";

import { isImageFile, isRenderFormat, isVideoFile } from "./utils";

type CreateSubmittedStoryOptions = {
  titleMaxLength: number;
};

export function createSubmittedStoryFromFormData(
  formData: FormData,
  options: CreateSubmittedStoryOptions,
): SubmittedStory {
  const imageFile = formData.get("backgroundImage");
  const videoFile = formData.get("storyVideo");

  if (!(imageFile instanceof File) || !imageFile.name) {
    throw new Error("Valitse taustakuva.");
  }

  if (!isImageFile(imageFile)) {
    throw new Error("Taustakuvan pitää olla kuvatiedosto.");
  }

  if (!(videoFile instanceof File) || !videoFile.name) {
    throw new Error("Valitse video.");
  }

  if (!isVideoFile(videoFile)) {
    throw new Error("Videon pitää olla videotiedosto.");
  }

  const renderInsta = formData.get("renderInsta") === "on";
  const renderHd = formData.get("renderHd") === "on";

  if (!renderInsta && !renderHd) {
    throw new Error(
      "Valitse ainakin yksi luotava video: Instagram-video tai HD-video.",
    );
  }

  const author = String(formData.get("authorName") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();

  if (title.length > options.titleMaxLength) {
    throw new Error(
      `Tarinan otsikko saa olla enintään ${options.titleMaxLength} merkkiä.`,
    );
  }

  const renderFormats: RenderFormat[] = [
    renderInsta ? "insta" : null,
    renderHd ? "hd" : null,
  ].filter(isRenderFormat);

  const metadataJson: StoryMetadata = {
    title,
    author,
    date,
  };

  return {
    title,
    author,
    date,
    backgroundImage: imageFile.name,
    storyVideo: videoFile.name,
    renderFormats,
    metadataJson,
  };
}
