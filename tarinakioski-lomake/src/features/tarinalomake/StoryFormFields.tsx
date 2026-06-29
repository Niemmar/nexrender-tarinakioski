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

export function StoryFormFields({
  isHidden,
  titleLength,
  titleMaxLength,
  onTitleLengthChange,
}: StoryFormFieldsProps) {
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
        <p className="text-sm font-medium text-slate-900">Luotavat videot</p>

        <div className="flex items-center gap-2">
          <Checkbox id="renderInsta" name="renderInsta" />
          <Label htmlFor="renderInsta" className="cursor-pointer font-normal">
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
  );
}
