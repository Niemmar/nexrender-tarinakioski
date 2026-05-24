const fs = require("fs");
const path = require("path");

const inputSrt = process.argv[2];

if (!inputSrt) {
  console.error("Anna SRT-tiedosto");
  process.exit(1);
}

if (!fs.existsSync(inputSrt)) {
  console.error(`SRT-tiedostoa ei löytynyt: ${inputSrt}`);
  process.exit(1);
}

function timeToSeconds(timecode) {
  // Esim. 00:00:07,500
  const [hours, minutes, secondsAndMs] = timecode.split(":");
  const [seconds, milliseconds] = secondsAndMs.split(",");

  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  );
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
    .filter(Boolean);
}

const srtContent = fs.readFileSync(inputSrt, "utf8");
const subtitles = parseSrt(srtContent);

const parsedPath = path.parse(inputSrt);
const outputJson = path.join(
  parsedPath.dir,
  `${parsedPath.name}.subtitles.json`,
);

fs.writeFileSync(outputJson, JSON.stringify(subtitles, null, 2), "utf8");

console.log(`JSON-tekstitys luotu: ${outputJson}`);
console.log(subtitles);
