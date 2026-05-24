const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffprobePath = require("ffprobe-static").path;

ffmpeg.setFfprobePath(ffprobePath);

const inputJobPath = "job-full-test.json";
const outputJobPath = "job-auto.json";
const fps = 25;
const introSeconds = 3;

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

async function main() {
  const job = JSON.parse(fs.readFileSync(inputJobPath, "utf8"));

  const videoAsset = job.assets.find((asset) => asset.type === "video");

  if (!videoAsset) {
    throw new Error("Jobista ei löytynyt video-assetia.");
  }

  const videoPath = videoAsset.src.replace("file:///", "");

  const duration = await getVideoDuration(videoPath); // Videon kesto sekunteina
  const frameEnd = Math.ceil((duration + introSeconds) * fps); // Lasketaan framet introsekuntien jälkeen

  job.template.frameStart = 0; // Aloitetaan framesta 0
  job.template.frameEnd = frameEnd; // Asetetaan frameEnd laskettuun arvoon

  fs.writeFileSync(outputJobPath, JSON.stringify(job, null, 2)); // Tallennetaan uusi job-tiedosto

  console.log(`Videon kesto: ${duration.toFixed(2)} s`); // Tulostetaan videon kesto
  console.log(`Renderöidään framet 0-${frameEnd}`); // Tulostetaan renderöitävät framet
  console.log(`Luotu tiedosto: ${outputJobPath}`); // Tulostetaan luotu tiedosto
}

main().catch((err) => {
  console.error("Virhe:", err.message);
});
