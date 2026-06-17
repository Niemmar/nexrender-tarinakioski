const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffprobePath = require("ffprobe-static").path;

ffmpeg.setFfprobePath(ffprobePath);

const fps = 25;

const introSeconds = 7;
const maxTotalSeconds = 4 * 60;

const storyId = process.argv[2];

if (!storyId) {
  console.error("Käyttö:");
  console.error("node prepare-story-render-insta.js <storyId>");
  console.error("");
  console.error("Esimerkki:");
  console.error("node prepare-story-render-insta.js story-001-insta");
  process.exit(1);
}

const templatePath = "templates/tarinakioski_template_insta_v2.aep";
const jobTemplatePath = "job-template-insta-v2.json";

const storyInputDir = path.join("input", storyId);
const storyOutputDir = path.join("output", storyId);

const inputVideoPath = path.join(storyInputDir, "video.mov");
const metadataPath = path.join(storyInputDir, "metadata.json");

const outputJobPath = path.join(storyOutputDir, "job-auto-insta.json");

function sanitizeFileName(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function requireFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`Virhe: ${description} puuttuu: ${filePath}`);
    process.exit(1);
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readMetadata(filePath) {
  const metadata = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!metadata.title) {
    throw new Error("metadata.json-tiedostosta puuttuu kenttä: title");
  }

  if (!metadata.author) {
    throw new Error("metadata.json-tiedostosta puuttuu kenttä: author");
  }

  return metadata;
}

function findBackgroundPath(dirPath) {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const files = fs.readdirSync(dirPath);

  const backgroundFile = files.find((file) => {
    const parsed = path.parse(file);
    return (
      parsed.name.toLowerCase() === "background" &&
      allowedExtensions.includes(parsed.ext.toLowerCase())
    );
  });

  if (!backgroundFile) {
    console.error(
      `Virhe: taustakuva puuttuu kansiosta ${dirPath}. ` +
        "Nimeä se esimerkiksi background.jpg tai background.png.",
    );
    process.exit(1);
  }

  return path.join(dirPath, backgroundFile);
}

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

function fileUrl(filePath) {
  return `file:///${path.resolve(filePath).replace(/\\/g, "/")}`;
}

function setTemplateSource(job, selectedTemplatePath) {
  job.template.src = fileUrl(selectedTemplatePath);
  job.template.composition = "MAIN";
}

function setLayerText(job, layerName, text) {
  const asset = job.assets.find(
    (asset) => asset.type === "data" && asset.layerName === layerName,
  );

  if (!asset) {
    throw new Error(`Jobista ei löytynyt data-assetia layerille: ${layerName}`);
  }

  asset.property = "Source Text";
  asset.value = text;
}

function setLayerSource(job, layerName, filePath) {
  const asset = job.assets.find((asset) => asset.layerName === layerName);

  if (!asset) {
    throw new Error(`Jobista ei löytynyt assetia layerille: ${layerName}`);
  }

  asset.src = fileUrl(filePath);
}

function setFinalOutputPath(job, filePath) {
  if (!job.actions || !Array.isArray(job.actions.postrender)) {
    throw new Error("Jobista ei löytynyt actions.postrender-kohtaa.");
  }

  const copyAction = job.actions.postrender.find(
    (action) => action.module === "@nexrender/action-copy",
  );

  if (!copyAction) {
    throw new Error("Jobista ei löytynyt @nexrender/action-copy-toimintoa.");
  }

  copyAction.input = "result.mp4";
  copyAction.output = path.resolve(filePath).replace(/\\/g, "/");
}

function secondsToInclusiveFrameEnd(seconds) {
  // FrameStart on 0. Jos halutaan enintään 240 s eli 4 min 25 fps -renderi,
  // frameEnd on 5999 eli yhteensä 6000 frameä.
  return Math.max(0, Math.ceil(seconds * fps) - 1);
}

async function createRenderJob(metadata, backgroundPath, finalVideoPath) {
  console.log("Luodaan automaattinen Nexrender-jobi...");

  const job = JSON.parse(fs.readFileSync(jobTemplatePath, "utf8"));

  setTemplateSource(job, templatePath);

  setLayerSource(job, "VIDEO_PLACEHOLDER", inputVideoPath);
  setLayerSource(job, "BACKGROUND_PHOTO", backgroundPath);

  setLayerText(job, "STORY_TITLE", metadata.title);
  setLayerText(job, "STORY_AUTHOR", metadata.author);

  setFinalOutputPath(job, finalVideoPath);

  const videoDuration = await getVideoDuration(inputVideoPath);

  // Kokonaismaksimi on 4 min. Siihen sisältyy 7 s alkutekstit.
  // Jos video on tätä pidempi, lopusta leikataan renderöinnissä pois.
  const wantedTotalSeconds = introSeconds + videoDuration;
  const renderTotalSeconds = Math.min(wantedTotalSeconds, maxTotalSeconds);
  const visibleVideoSeconds = Math.max(0, renderTotalSeconds - introSeconds);

  const frameEnd = secondsToInclusiveFrameEnd(renderTotalSeconds);

  job.template.frameStart = 0;
  job.template.frameEnd = frameEnd;

  fs.writeFileSync(outputJobPath, JSON.stringify(job, null, 2), "utf8");

  console.log(`Videotiedoston kesto: ${videoDuration.toFixed(2)} s`);
  console.log(`Alkutekstit: ${introSeconds.toFixed(2)} s`);
  console.log(
    `Kokonaisrenderi: ${renderTotalSeconds.toFixed(2)} s / max ${maxTotalSeconds} s`,
  );
  console.log(`Videosta renderiin mahtuu: ${visibleVideoSeconds.toFixed(2)} s`);
  console.log(`Renderöidään framet 0-${frameEnd}`);
  console.log(`Luotu jobi: ${outputJobPath}`);
}

async function main() {
  requireFile(jobTemplatePath, "Nexrender-templatejob");
  requireFile(inputVideoPath, "video.mov");
  requireFile(metadataPath, "metadata.json");
  requireFile(templatePath, "After Effects -template");

  const backgroundPath = findBackgroundPath(storyInputDir);

  ensureDir(storyOutputDir);

  const metadata = readMetadata(metadataPath);

  const finalVideoFileName = `${sanitizeFileName(metadata.author)}_${sanitizeFileName(metadata.title)}.mp4`;
  const finalVideoPath = path.join(storyOutputDir, finalVideoFileName);

  await createRenderJob(metadata, backgroundPath, finalVideoPath);

  console.log("");
  console.log("Valittu versio: insta v2");
  console.log(`Template: ${templatePath}`);
  console.log(`Taustakuva: ${backgroundPath}`);
  console.log(`Valmis video muodostuu tiedostoon: ${finalVideoPath}`);
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
