import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RenderFormat = "insta" | "hd";

type StoryMetadata = {
  title: string;
  author: string;
  date: string;
};

type SubmittedStory = {
  title: string;
  author: string;
  date: string;
  backgroundImage: string;
  storyVideo: string;
  renderFormats: RenderFormat[];
  metadataJson: StoryMetadata;
};

function getTodayDate() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - timezoneOffset * 60 * 1000);

  return localDate.toISOString().split("T")[0];
}

function getRenderFormatLabel(format: RenderFormat) {
  if (format === "insta") {
    return "Instagram-video";
  }

  return "HD-video";
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

export default function Tarinalomake() {
  const formRef = useRef<HTMLFormElement>(null);
  const [submittedStory, setSubmittedStory] = useState<SubmittedStory | null>(
    null,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    const author = String(formData.get("authorName") ?? "");
    const title = String(formData.get("title") ?? "");
    const date = String(formData.get("date") ?? "");

    const renderFormats: RenderFormat[] = [
      renderInsta ? "insta" : null,
      renderHd ? "hd" : null,
    ].filter(Boolean) as RenderFormat[];

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
  }

  async function handleApprove() {
    if (!submittedStory || !formRef.current) {
      return;
    }

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

      if (!response.ok) {
        throw new Error("API-kutsu epäonnistui.");
      }

      const result = await response.json();

      console.log("API:n vastaus:", result);

      const startedJobsText =
        result.startedJobs?.length > 0
          ? result.startedJobs.join(", ")
          : "ei renderöintejä";

      alert(
        `Tarina tallennettu tunnuksella ${result.storyId}. Käynnistetyt renderöinnit: ${startedJobsText}.`,
      );
    } catch (error) {
      console.error("Virhe tietojen lähettämisessä:", error);
      alert(
        "Tietojen lähettäminen epäonnistui. Tarkista, että API on käynnissä.",
      );
    }
  }

  function handleClear() {
    formRef.current?.reset();
    setSubmittedStory(null);
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
              <Button type="button" onClick={handleApprove}>
                Hyväksy ja luo videot
              </Button>

              <Button type="button" variant="outline" onClick={handleEdit}>
                Muokkaa tietoja
              </Button>

              <Button type="button" variant="outline" onClick={handleClear}>
                Tyhjennä
              </Button>
            </div>
          </section>
        )}
      </form>
    </main>
  );
}
