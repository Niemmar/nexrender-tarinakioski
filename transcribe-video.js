const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const inputVideo = process.argv[2];

if (!inputVideo) {
  console.error("Anna mp4-videotiedosto");
  process.exit(1);
}

if (!fs.existsSync(inputVideo)) {
  console.error(`Videotiedostoa ei löytynyt: ${inputVideo}`);
  process.exit(1);
}

const outputDir = "subtitles";
const model = "small";
const language = "Finnish";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const whisperExe = path.join(
  __dirname,
  ".venv-whisper",
  "Scripts",
  "whisper.exe",
);

const args = [
  inputVideo,
  "--language",
  language,
  "--model",
  model,
  "--output_dir",
  outputDir,
  "--output_format",
  "srt",
];

function timeToSeconds(timecode) {
  const [hours, minutes, secondsAndMs] = timecode.split(":");
  const [seconds, milliseconds] = secondsAndMs.split(",");

  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  );
}

function splitTextIntoChunks(text, maxChars) {
  const words = text.split(" ");
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

  return chunks;
}

function splitLongSubtitle(subtitle, maxChars = 42) {
  if (subtitle.text.length <= maxChars) {
    return [subtitle];
  }

  const chunks = splitTextIntoChunks(subtitle.text, maxChars);
  const totalDuration = subtitle.end - subtitle.start;
  const chunkDuration = totalDuration / chunks.length;

  return chunks.map((chunk, index) => ({
    start: Number((subtitle.start + chunkDuration * index).toFixed(2)),
    end: Number((subtitle.start + chunkDuration * (index + 1)).toFixed(2)),
    text: chunk,
  }));
}

function parseSrt(content) {
  const blocks = content.replace(/\r/g, "").trim().split(/\n\n+/);

  return blocks
    .map((block) => {
      const lines = block.split("\n");

      const timeLine = lines.find((line) => line.includes("-->"));
      if (!timeLine) return null;

      const [startRaw, endRaw] = timeLine
        .split("-->")
        .map((part) => part.trim());

      const textLines = lines.slice(lines.indexOf(timeLine) + 1);
      const text = textLines.join(" ").trim();

      return {
        start: timeToSeconds(startRaw),
        end: timeToSeconds(endRaw),
        text,
      };
    })
    .filter(Boolean)
    .flatMap((subtitle) => splitLongSubtitle(subtitle, 42));
}

function createSubtitleJson(videoPath) {
  const videoName = path.parse(videoPath).name;
  const srtPath = path.join(outputDir, `${videoName}.srt`);
  const jsonPath = path.join(outputDir, `${videoName}.subtitles.json`);
  const fixedJsonPath = path.join(outputDir, "subtitles-data.json");

  if (!fs.existsSync(srtPath)) {
    throw new Error(`SRT-tiedostoa ei löytynyt: ${srtPath}`);
  }

  const srtContent = fs.readFileSync(srtPath, "utf8");
  const subtitles = parseSrt(srtContent);

  fs.writeFileSync(jsonPath, JSON.stringify(subtitles, null, 2), "utf8");
  fs.writeFileSync(fixedJsonPath, JSON.stringify(subtitles, null, 2), "utf8");

  console.log(`JSON-tekstitys luotu: ${jsonPath}`);
  console.log(`Vakio-JSON päivitetty: ${fixedJsonPath}`);
  console.log(subtitles);
}

console.log("Käynnistetään Whisper...");
console.log(`${whisperExe} ${args.join(" ")}`);

const whisper = spawn(whisperExe, args, {
  stdio: "inherit",
  shell: false,
});

whisper.on("close", (code) => {
  if (code !== 0) {
    console.error(`Whisper epäonnistui. Exit code: ${code}`);
    process.exit(code);
  }

  try {
    createSubtitleJson(inputVideo);
    console.log("Tekstitys valmis.");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
});
