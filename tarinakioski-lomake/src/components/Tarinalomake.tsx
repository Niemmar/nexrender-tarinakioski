import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useRenderProgress } from "@/features/tarinalomake/useRenderProgress";

import type {
  ApproveResult,
  RenderFormat,
  StoryMetadata,
  SubmittedStory,
} from "@/features/tarinalomake/types";

import {
  getRenderFormatLabel,
  getRenderJobStatusLabel,
  getStartedJobsText,
  getTodayDate,
  isImageFile,
  isRenderFormat,
  isVideoFile,
  normalizeStartedJobs,
} from "@/features/tarinalomake/utils";

export default function Tarinalomake() {
  const formRef = useRef<HTMLFormElement>(null);

  const [submittedStory, setSubmittedStory] = useState<SubmittedStory | null>(
    null,
  );

  const [isApproving, setIsApproving] = useState(false);
  const [approveResult, setApproveResult] = useState<ApproveResult | null>(
    null,
  );
  const [approveError, setApproveError] = useState("");

  const { renderProgress, progressError } = useRenderProgress(
    approveResult?.storyId,
    approveResult?.startedJobs,
  );

  function resetApproveState() {
    setApproveResult(null);
    setApproveError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    resetApproveState();

    const formData = new FormData(event.currentTarget);

    const imageFile = formData.get("backgroundImage");
    const videoFile = formData.get("storyVideo");

    if (!(imageFile instanceof File) || !imageFile.name) {
      alert("Valitse taustakuva.");
      return;
    }

    if (!isImageFile(imageFile)) {
      alert("Taustakuvan pitää olla kuvatiedosto.");
      return;
    }

    if (!(videoFile instanceof File) || !videoFile.name) {
      alert("Valitse video.");
      return;
    }

    if (!isVideoFile(videoFile)) {
      alert("Videon pitää olla videotiedosto.");
      return;
    }

    const renderInsta = formData.get("renderInsta") === "on";
    const renderHd = formData.get("renderHd") === "on";

    if (!renderInsta && !renderHd) {
      alert(
        "Valitse ainakin yksi luotava video: Instagram-video tai HD-video.",
      );
      return;
    }

    const author = String(formData.get("authorName") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const date = String(formData.get("date") ?? "").trim();

    const renderFormats: RenderFormat[] = [
      renderInsta ? "insta" : null,
      renderHd ? "hd" : null,
    ].filter(isRenderFormat);

    const metadataJson: StoryMetadata = {
      title,
      author,
      date,
    };

    const storyData: SubmittedStory = {
      title,
      author,
      date,
      backgroundImage: imageFile.name,
      storyVideo: videoFile.name,
      renderFormats,
      metadataJson,
    };

    setSubmittedStory(storyData);

    console.log("Lomakkeen koko data:", storyData);
    console.log("Luotava metadata.json:", storyData.metadataJson);
    console.log("Renderöintivalinnat:", storyData.renderFormats);
  }

  function handleEdit() {
    setSubmittedStory(null);
    resetApproveState();
  }

  async function handleApprove() {
    if (isApproving || approveResult) {
      return;
    }

    if (!submittedStory || !formRef.current) {
      return;
    }

    setIsApproving(true);
    resetApproveState();

    const formData = new FormData(formRef.current);

    formData.set("title", submittedStory.title);
    formData.set("author", submittedStory.author);
    formData.set("date", submittedStory.date);
    formData.set("renderFormats", JSON.stringify(submittedStory.renderFormats));
    formData.set("metadataJson", JSON.stringify(submittedStory.metadataJson));

    console.log("Lähetetään tiedot ja tiedostot API:lle:", submittedStory);

    try {
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

      console.log("API:n vastaus:", result);

      setApproveResult(result);
    } catch (error: unknown) {
      console.error("Virhe tietojen lähettämisessä:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Tietojen lähettäminen epäonnistui. Tarkista, että API on käynnissä.";

      setApproveError(message);
    } finally {
      setIsApproving(false);
    }
  }

  function handleClear() {
    formRef.current?.reset();
    setSubmittedStory(null);
    resetApproveState();
    setIsApproving(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl space-y-6 rounded-xl bg-white p-6 shadow-md"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Uusi tarina</h1>
          <p className="mt-2 text-sm text-slate-600">
            Syötä tarinan perustiedot ja valitse, mitkä videot luodaan.
          </p>
        </div>

        <div className={submittedStory ? "hidden" : "space-y-4"}>
          <div className="space-y-2">
            <Label htmlFor="authorName">Nimi</Label>
            <Input
              id="authorName"
              name="authorName"
              type="text"
              placeholder="Tarinan kertojan nimi"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Tarinan otsikko</Label>
            <Input
              id="title"
              name="title"
              type="text"
              placeholder="Anna tarinalle otsikko"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Päivämäärä</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={getTodayDate()}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="backgroundImage">Lataa taustakuva</Label>
              <Input
                id="backgroundImage"
                name="backgroundImage"
                type="file"
                accept="image/*"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storyVideo">Lataa video</Label>
              <Input
                id="storyVideo"
                name="storyVideo"
                type="file"
                accept="video/*"
                required
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium text-slate-900">
              Luotavat videot
            </p>

            <div className="flex items-center gap-2">
              <Checkbox id="renderInsta" name="renderInsta" />
              <Label
                htmlFor="renderInsta"
                className="cursor-pointer font-normal"
              >
                Luo Instagram-video
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="renderHd" name="renderHd" />
              <Label htmlFor="renderHd" className="cursor-pointer font-normal">
                Luo HD-video
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Seuraava
          </Button>
        </div>

        {submittedStory && (
          <section className="rounded-lg border bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Tarkista tiedot
            </h2>

            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div>
                <dt className="font-medium">Nimi</dt>
                <dd>{submittedStory.author}</dd>
              </div>

              <div>
                <dt className="font-medium">Tarinan otsikko</dt>
                <dd>{submittedStory.title}</dd>
              </div>

              <div>
                <dt className="font-medium">Päivämäärä</dt>
                <dd>{submittedStory.date}</dd>
              </div>

              <div>
                <dt className="font-medium">Kuva</dt>
                <dd>{submittedStory.backgroundImage}</dd>
              </div>

              <div>
                <dt className="font-medium">Video</dt>
                <dd>{submittedStory.storyVideo}</dd>
              </div>

              <div>
                <dt className="font-medium">Luotavat videot</dt>
                <dd>
                  {submittedStory.renderFormats
                    .map((format) => getRenderFormatLabel(format))
                    .join(", ")}
                </dd>
              </div>
            </dl>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Button
                type="button"
                onClick={handleApprove}
                disabled={isApproving || Boolean(approveResult)}
                className="bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isApproving
                  ? "Videoita luodaan..."
                  : approveResult
                    ? "Hyväksytty"
                    : "Hyväksy ja luo videot"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleEdit}
                disabled={isApproving}
              >
                Muokkaa tietoja
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={isApproving}
              >
                Tyhjennä
              </Button>
            </div>

            {isApproving && (
              <div className="mt-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                Tallennetaan tarinaa ja käynnistetään renderöintiä. Tämä voi
                kestää hetken. Älä sulje ikkunaa.
              </div>
            )}

            {approveResult && (
              <div className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                <p className="font-semibold">
                  Tarina tallennettu onnistuneesti.
                </p>

                <p>
                  Tarinan numero:{" "}
                  <strong>{approveResult.storyId || "ei tunnusta"}</strong>
                </p>

                <p>
                  Käynnistetyt renderöinnit:{" "}
                  <strong>
                    {getStartedJobsText(approveResult.startedJobs)}
                  </strong>
                </p>
              </div>
            )}

            {renderProgress.length > 0 && (
              <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-semibold">Renderöinnin eteneminen</p>

                <div className="mt-3 space-y-3">
                  {renderProgress.map((job) => {
                    const progress = Math.round(job.progress ?? 0);

                    return (
                      <div key={job.format}>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="font-medium">
                            {getRenderFormatLabel(job.format)}
                          </span>

                          <span>
                            {getRenderJobStatusLabel(job.status)} {progress} %
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {job.message && (
                          <p className="mt-1 text-xs text-blue-800">
                            {job.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {progressError && (
              <div className="mt-3 rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
                Renderöinnin etenemistietoa ei saatu haettua: {progressError}
              </div>
            )}

            {approveError && (
              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <p className="font-semibold">
                  Tietojen lähettäminen epäonnistui.
                </p>
                <p>{approveError}</p>
              </div>
            )}
          </section>
        )}
      </form>
    </main>
  );
}
