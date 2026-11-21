import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getTodayDate } from "./utils";

type StoryFormFieldsProps = {
  isHidden: boolean;
  titleLength: number;
  titleMaxLength: number;
  onTitleLengthChange: (length: number) => void;
};

type RenderFormat = "insta" | "hd";

export function StoryFormFields({
  isHidden,
  titleLength,
  titleMaxLength,
  onTitleLengthChange,
}: StoryFormFieldsProps) {
  const [selectedRenderFormat, setSelectedRenderFormat] =
    useState<RenderFormat | null>(null);

  const [renderFormatWarning, setRenderFormatWarning] = useState(false);

  function handleRenderFormatChange(
    format: RenderFormat,
    checked: boolean | "indeterminate",
  ) {
    if (
      checked === true &&
      selectedRenderFormat !== null &&
      selectedRenderFormat !== format
    ) {
      setRenderFormatWarning(true);
      return;
    }

    setSelectedRenderFormat(checked === true ? format : null);
    setRenderFormatWarning(false);
  }

  return (
    <div className={isHidden ? "hidden" : "space-y-4"}>
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
          maxLength={titleMaxLength}
          onChange={(event) =>
            onTitleLengthChange(event.currentTarget.value.length)
          }
          required
        />

        {titleLength >= titleMaxLength && (
          <p className="text-xs font-medium text-red-600">
            Otsikon pituus enintään {titleMaxLength} merkkiä.
          </p>
        )}
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
            className="cursor-pointer file:hidden"
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
            className="cursor-pointer file:hidden"
            required
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium text-slate-900">
          Videon esikäsittely
        </p>

        <div className="flex items-start gap-2">
          <Checkbox id="removeBackground" name="removeBackground" />
          <div className="space-y-1">
            <Label
              htmlFor="removeBackground"
              className="cursor-pointer font-normal"
            >
              Poista tausta henkilövideosta
            </Label>
            <p className="text-xs text-slate-500">
              Käytä tätä, jos lataat tavallisen videon, jossa tausta näkyy.
              Valmiiksi taustatonta MOV-videota ei tarvitse käsitellä uudelleen.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium text-slate-900">Luotava video</p>

        <div className="flex items-center gap-2">
          <Checkbox
            id="renderInsta"
            name="renderInsta"
            checked={selectedRenderFormat === "insta"}
            onCheckedChange={(checked) =>
              handleRenderFormatChange("insta", checked)
            }
          />
          <Label htmlFor="renderInsta" className="cursor-pointer font-normal">
            Luo Instagram-video (pysty 1080 × 1350 px)
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="renderHd"
            name="renderHd"
            checked={selectedRenderFormat === "hd"}
            onCheckedChange={(checked) =>
              handleRenderFormatChange("hd", checked)
            }
          />
          <Label htmlFor="renderHd" className="cursor-pointer font-normal">
            Luo HD-video (vaaka 1920 × 1080 px)
          </Label>
        </div>

        {renderFormatWarning && (
          <p role="alert" className="text-sm font-medium text-red-600">
            Voit luoda vain yhden videon kerrallaan. Poista ensin aiempi
            valinta.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full">
        Seuraava
      </Button>
    </div>
  );
}
