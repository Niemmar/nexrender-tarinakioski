const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");
const ffprobePath = require("ffprobe-static").path;

ffmpeg.setFfprobePath(ffprobePath);

const inputJobPath = process.argv[2];
const outputJobPath = process.argv[3];
const inputVideoPath = process.argv[4];

const fps = 25;
const introSeconds = 4;
const subtitleOffsetSeconds = 4;

if (!inputJobPath || !outputJobPath || !inputVideoPath) {
  console.error("Käyttö:");
  console.error(
    "node prepare-story-render.js <inputJobPath> <outputJobPath> <inputVideoPath>",
  );
  console.error("");
  console.error("Esimerkki:");
  console.error(
    "node prepare-story-render.js job-subt-test.json job-auto-subtitles.json assets/tarina.mp4",
  );
  process.exit(1);
}

if (!fs.existsSync(inputJobPath)) {
  console.error(`Virhe: job-tiedostoa ei löytynyt: ${inputJobPath}`);
  process.exit(1);
}

if (!fs.existsSync(inputVideoPath)) {
  console.error(`Virhe: videotiedostoa ei löytynyt: ${inputVideoPath}`);
  process.exit(1);
}

const videoInfo = path.parse(inputVideoPath);
const outputDir = videoInfo.dir || ".";
const srtPath = path.join(outputDir, `${videoInfo.name}.srt`);
const subtitlesJsonPath = path.join(outputDir, "subtitles.json");

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

function runWhisper(videoPath, targetDir) {
  console.log("Ajetaan paikallinen Whisper...");

  execFileSync(
    "python",
    [
      "-m",
      "whisper",
      videoPath,
      "--language",
      "Finnish",
      "--model",
      "small",
      "--output_format",
      "srt",
      "--output_dir",
      targetDir,
    ],
    {
      stdio: "inherit",
    },
  );

  if (!fs.existsSync(srtPath)) {
    throw new Error(`Whisper ei luonut odotettua SRT-tiedostoa: ${srtPath}`);
  }

  console.log(`Whisper loi tiedoston: ${srtPath}`);
}

function timecodeToSeconds(timecode) {
  const match = timecode.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

  if (!match) {
    throw new Error(`Virheellinen aikakoodi: ${timecode}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function parseSrt(srtContent) {
  return srtContent
    .replace(/\r/g, "")
    .trim()
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split("\n").filter(Boolean);
      const timeLine = lines.find((line) => line.includes("-->"));

      if (!timeLine) {
        return null;
      }

      const [startRaw, endRaw] = timeLine
        .split("-->")
        .map((part) => part.trim());

      const textLines = lines.slice(lines.indexOf(timeLine) + 1);

      return {
        start: Number(timecodeToSeconds(startRaw).toFixed(2)),
        end: Number(timecodeToSeconds(endRaw).toFixed(2)),
        text: textLines.join(" ").replace(/\s+/g, " ").trim(),
      };
    })
    .filter((caption) => caption && caption.text);
}

function splitCaptionByLength(caption, maxChars) {
  if (caption.text.length <= maxChars) {
    return [caption];
  }

  const words = caption.text.split(" ");
  const chunks = [];
  let currentChunk = "";

  for (const word of words) {
    const testChunk = currentChunk ? `${currentChunk} ${word}` : word;

    if (testChunk.length > maxChars && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = word;
    } else {
      currentChunk = testChunk;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  const duration = caption.end - caption.start;
  const chunkDuration = duration / chunks.length;

  return chunks.map((text, index) => ({
    start: Number((caption.start + index * chunkDuration).toFixed(2)),
    end: Number((caption.start + (index + 1) * chunkDuration).toFixed(2)),
    text,
  }));
}

function createSubtitlesJson(inputSrtPath, outputJsonPath) {
  console.log("Muunnetaan SRT subtitles.json-muotoon...");

  const srtContent = fs.readFileSync(inputSrtPath, "utf8");

  const captions = parseSrt(srtContent)
    .flatMap((caption) => splitCaptionByLength(caption, 42))
    .map((caption) => ({
      ...caption,
      start: Number((caption.start + subtitleOffsetSeconds).toFixed(2)),
      end: Number((caption.end + subtitleOffsetSeconds).toFixed(2)),
    }));

  fs.writeFileSync(
    outputJsonPath,
    JSON.stringify({ captions }, null, 2),
    "utf8",
  );

  console.log(`Tekstitysrivejä: ${captions.length}`);
  console.log(`Luotu tiedosto: ${outputJsonPath}`);

  return captions;
}

function createSubtitleExpression(captions) {
  const dataString = JSON.stringify(captions);

  return `
var data = ${dataString};

function wrapText(text, maxChars) {
  var words = text.split(" ");
  var lines = [];
  var currentLine = "";

  for (var i = 0; i < words.length; i++) {
    if ((currentLine + " " + words[i]).length > maxChars) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = currentLine === "" ? words[i] : currentLine + " " + words[i];
    }
  }

  if (currentLine !== "") {
    lines.push(currentLine);
  }

  return lines.join("\\r");
}

var currentText = "";

for (var i = 0; i < data.length; i++) {
  if (time >= data[i].start && time <= data[i].end) {
    currentText = wrapText(data[i].text, 38);
    break;
  }
}

currentText;
`.trim();
}

async function createRenderJob(captions) {
  console.log("Luodaan automaattinen Nexrender-jobi...");

  const job = JSON.parse(fs.readFileSync(inputJobPath, "utf8"));

  const videoAsset = job.assets.find((asset) => asset.type === "video");

  if (!videoAsset) {
    throw new Error("Jobista ei löytynyt video-assetia.");
  }

  videoAsset.src = `file:///${path.resolve(inputVideoPath).replace(/\\/g, "/")}`;

  const duration = await getVideoDuration(inputVideoPath);
  const frameEnd = Math.ceil((duration + introSeconds) * fps);

  job.template.frameStart = 0;
  job.template.frameEnd = frameEnd;

  const subtitleAsset = job.assets.find(
    (asset) => asset.type === "data" && asset.layerName === "SUBTITLES",
  );

  if (!subtitleAsset) {
    throw new Error("Jobista ei löytynyt SUBTITLES-data-assetia.");
  }

  subtitleAsset.property = "Source Text";
  subtitleAsset.expression = createSubtitleExpression(captions);

  fs.writeFileSync(outputJobPath, JSON.stringify(job, null, 2), "utf8");

  console.log(`Videon kesto: ${duration.toFixed(2)} s`);
  console.log(`Renderöidään framet 0-${frameEnd}`);
  console.log(`Luotu jobi: ${outputJobPath}`);
}

async function main() {
  runWhisper(inputVideoPath, outputDir);
  const captions = createSubtitlesJson(srtPath, subtitlesJsonPath);
  await createRenderJob(captions);

  console.log("");
  console.log("Valmis. Voit renderöidä komennolla:");
  console.log(
    `nexrender-cli --file ${outputJobPath} --binary "C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\aerender.exe"`,
  );
}

main().catch((err) => {
  console.error("Virhe:", err.message);
  process.exit(1);
});
