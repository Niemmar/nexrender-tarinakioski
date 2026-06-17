const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffprobePath = require("ffprobe-static").path;

ffmpeg.setFfprobePath(ffprobePath);

const fps = 25;

const introSeconds = 7;
// Varsinaisen videon maksimikesto.
// Alkutekstit tulevat tämän päälle, koska video alkaa vasta 7 s kohdalla.
const maxVideoSeconds = 4 * 60;
const maxTotalSeconds = introSeconds + maxVideoSeconds;

const storyId = process.argv[2];

if (!storyId) {
  console.error("Käyttö:");
  console.error("node prepare-story-hd-render.js <storyId>");
  console.error("");
  console.error("Esimerkki:");
  console.error("node prepare-story-hd-render.js 001");
  process.exit(1);
}

const templatePath = "templates/tarinakioski_template_v6.aep";
const jobTemplatePath = "job-template-hd.json";

const storyInputDir = path.join("input", storyId);
const storyOutputDir = path.join("output", storyId);

const inputVideoPath = path.join(storyInputDir, "video.mov");
const metadataPath = path.join(storyInputDir, "metadata.json");

const outputJobPath = path.join(storyOutputDir, "job-auto-hd.json");

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

function requireDirectory(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    console.error(`Virhe: ${description} puuttuu: ${dirPath}`);
    process.exit(1);
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readMetadata(filePath, expectedStoryId) {
  if (!fs.existsSync(filePath)) {
    console.warn(
      "metadata.json puuttuu. STORY_TITLE ja STORY_AUTHOR jätetään tyhjiksi.",
    );

    return {
      id: expectedStoryId,
      title: "",
      author: "",
      renderFormats: [],
    };
  }

  const metadata = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (metadata.id && metadata.id !== expectedStoryId) {
    throw new Error(
      `metadata.json id on "${metadata.id}", mutta komentona annettu storyId on "${expectedStoryId}".`,
    );
  }

  const renderFormats = Array.isArray(metadata.renderFormats)
    ? metadata.renderFormats
    : [];

  if (renderFormats.length > 0 && !renderFormats.includes("hd")) {
    console.warn(
      'Varoitus: metadata.json ei sisällä renderFormats-listassa arvoa "hd", mutta HD-jobi luodaan silti.',
    );
  }

  return {
    id: metadata.id || expectedStoryId,
    title: metadata.title || "",
    author: metadata.author || "",
    renderFormats,
  };
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
        "Nimeä se esimerkiksi background.jpg, background.png tai background.webp.",
    );
    process.exit(1);
  }

  return path.join(dirPath, backgroundFile);
}

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const duration = metadata?.format?.duration;

      if (!duration) {
        return reject(new Error("Videotiedoston kestoa ei saatu luettua."));
      }

      resolve(duration);
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

function createFinalVideoFileName(metadata, storyId) {
  const idPart = sanitizeFileName(metadata.id || storyId);
  const authorPart = sanitizeFileName(metadata.author);
  const titlePart = sanitizeFileName(metadata.title);

  const nameParts = [idPart, authorPart, titlePart].filter(Boolean);

  return `${nameParts.join("_")}_hd.mp4`;
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
  const renderedVideoSeconds = Math.min(videoDuration, maxVideoSeconds);
  const renderTotalSeconds = introSeconds + renderedVideoSeconds;

  const videoWillBeTrimmed = videoDuration > maxVideoSeconds;

  const frameEnd = secondsToInclusiveFrameEnd(renderTotalSeconds);

  job.template.frameStart = 0;
  job.template.frameEnd = frameEnd;

  fs.writeFileSync(outputJobPath, JSON.stringify(job, null, 2), "utf8");

  console.log(`Videotiedoston kesto: ${videoDuration.toFixed(2)} s`);
  console.log(`Videon maksimikesto: ${maxVideoSeconds.toFixed(2)} s`);
  console.log(`Kokonaisrenderi: ${renderTotalSeconds.toFixed(2)} s`);

  if (videoWillBeTrimmed) {
    console.log(
      `Videota lyhennetään renderissä: ${renderedVideoSeconds.toFixed(2)} s / ${videoDuration.toFixed(2)} s`,
    );
  } else {
    console.log("Koko video mahtuu mukaan.");
  }

  console.log(`Renderöidään framet 0-${frameEnd}`);
  console.log(`Luotu jobi: ${outputJobPath}`);
}

async function main() {
  requireFile(jobTemplatePath, "Nexrender-templatejob");
  requireFile(templatePath, "After Effects -template");
  requireDirectory(storyInputDir, "tarinan input-kansio");
  requireFile(inputVideoPath, "video.mov");

  const backgroundPath = findBackgroundPath(storyInputDir);

  ensureDir(storyOutputDir);

  const metadata = readMetadata(metadataPath, storyId);

  const finalVideoFileName = createFinalVideoFileName(metadata, storyId);
  const finalVideoPath = path.join(storyOutputDir, finalVideoFileName);

  await createRenderJob(metadata, backgroundPath, finalVideoPath);

  console.log("");
  console.log("Valittu versio: HD");
  console.log(`Story ID: ${metadata.id}`);
  console.log(`Template: ${templatePath}`);
  console.log(`Taustakuva: ${backgroundPath}`);

  if (!metadata.title) {
    console.log("STORY_TITLE: tyhjä");
  } else {
    console.log(`STORY_TITLE: ${metadata.title}`);
  }

  if (!metadata.author) {
    console.log("STORY_AUTHOR: tyhjä");
  } else {
    console.log(`STORY_AUTHOR: ${metadata.author}`);
  }

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
