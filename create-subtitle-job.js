const fs = require("fs");
const path = require("path");

const inputVideo = process.argv[2];

if (!inputVideo) {
  console.error("Anna videotiedosto");
  process.exit(1);
}

if (!fs.existsSync(inputVideo)) {
  console.error(`Videotiedostoa ei löytynyt: ${inputVideo}`);
  process.exit(1);
}

const videoName = path.parse(inputVideo).name;
const subtitlesPath = path.join("subtitles", `${videoName}.subtitles.json`);

if (!fs.existsSync(subtitlesPath)) {
  console.error(`Tekstitys-JSONia ei löytynyt: ${subtitlesPath}`);
  console.error(`Aja ensin: node transcribe-video.js ${inputVideo}`);
  process.exit(1);
}

const subtitles = JSON.parse(fs.readFileSync(subtitlesPath, "utf8"));
const subtitleOffsetSeconds = 4;

function createSubtitleExpression(subtitles) {
  const json = JSON.stringify(subtitles);

  return `
var data = ${json};

function wrapText(text, maxChars) {
  var words = text.split(" ");
  var lines = [];
  var currentLine = "";

  for (var i = 0; i < words.length; i++) {
    if ((currentLine + " " + words[i]).length > maxChars && currentLine !== "") {
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

var subtitleTime = time - ${subtitleOffsetSeconds};
var currentText = "";

for (var i = 0; i < data.length; i++) {
  if (subtitleTime >= data[i].start && subtitleTime < data[i].end) {
    currentText = wrapText(data[i].text, 38);
    break;
  }
}

currentText;
`.trim();
}

const job = {
  template: {
    src: "file:///C:/nexrender-tarinakioski/templates/tarinakioski_template_v3.aep",
    composition: "MAIN",
  },
  assets: [
    {
      src: `file:///C:/nexrender-tarinakioski/${inputVideo.replace(/\\/g, "/")}`,
      type: "video",
      layerName: "VIDEO_PLACEHOLDER",
    },
    {
      src: "file:///C:/nexrender-tarinakioski/assets/patsaat.jpg",
      type: "image",
      layerName: "BACKGROUND_PHOTO",
    },
    {
      type: "data",
      layerName: "STORY_TITLE",
      property: "Source Text",
      value: "Minun tarinani",
    },
    {
      type: "data",
      layerName: "STORY_AUTHOR",
      property: "Source Text",
      value: "Käkisalmi-museo",
    },
    {
      type: "data",
      layerName: "SUBTITLES",
      property: "Source Text",
      expression: createSubtitleExpression(subtitles),
    },
  ],
  actions: {
    postrender: [
      {
        module: "@nexrender/action-copy",
        input: "result.mp4",
        output: `C:/nexrender-tarinakioski/output/${videoName}-with-subtitles.mp4`,
      },
    ],
  },
};

const outputJobPath = `job-${videoName}-subtitles.json`;

fs.writeFileSync(outputJobPath, JSON.stringify(job, null, 2), "utf8");

console.log(`Nexrender-job luotu: ${outputJobPath}`);
console.log(`Tekstitysblokkeja: ${subtitles.length}`);
