import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

import { config } from "./config.js";
import { runBackgroundRemoval } from "./services/backgroundRemoval.js";

const app = express();
const port = 3001;

const allowedRenderFormats = ["insta", "hd"];
const renderStatusByStoryId = new Map();

const activeProcessesByStoryId = new Map();
const cancelledStoryIds = new Set();

const terminalStatuses = new Set([
  "finished",
  "failed",
  "cancelled",
  "skipped",
]);

function isStoryCancelled(storyId) {
  return cancelledStoryIds.has(storyId);
}

function registerStoryProcess(storyId, childProcess) {
  let processes = activeProcessesByStoryId.get(storyId);

  if (!processes) {
    processes = new Set();
    activeProcessesByStoryId.set(storyId, processes);
  }

  processes.add(childProcess);

  const unregisterProcess = () => {
    const currentProcesses = activeProcessesByStoryId.get(storyId);

    if (!currentProcesses) {
      return;
    }

    currentProcesses.delete(childProcess);

    if (currentProcesses.size === 0) {
      activeProcessesByStoryId.delete(storyId);
    }
  };

  childProcess.once("close", unregisterProcess);
  childProcess.once("error", unregisterProcess);
}

function killProcessTree(childProcess) {
  return new Promise((resolve) => {
    if (!childProcess?.pid || childProcess.exitCode !== null) {
      resolve();
      return;
    }

    if (process.platform === "win32") {
      const taskkillProcess = spawn(
        "taskkill",
        ["/PID", String(childProcess.pid), "/T", "/F"],
        {
          windowsHide: true,
        },
      );

      taskkillProcess.once("close", () => {
        resolve();
      });

      taskkillProcess.once("error", () => {
        try {
          childProcess.kill();
        } catch {
          // Prosessi on saattanut jo päättyä.
        }

        resolve();
      });

      return;
    }

    try {
      childProcess.kill("SIGTERM");
    } catch {
      // Prosessi on saattanut jo päättyä.
    }

    resolve();
  });
}

function canCancelStory(status) {
  if (status.cancelled) {
    return false;
  }

  const backgroundRemovalCanBeCancelled =
    status.backgroundRemoval?.enabled &&
    !terminalStatuses.has(status.backgroundRemoval.status);

  const renderCanBeCancelled = Object.values(status.jobs ?? {}).some(
    (job) => !terminalStatuses.has(job.status),
  );

  return backgroundRemovalCanBeCancelled || renderCanBeCancelled;
}

function markStoryCancelled(storyId) {
  const current = renderStatusByStoryId.get(storyId);

  if (!current) {
    return;
  }

  const now = new Date().toISOString();

  if (current.backgroundRemoval?.enabled) {
    const cancelledSteps = {};

    for (const [stepName, step] of Object.entries(
      current.backgroundRemoval.steps ?? {},
    )) {
      cancelledSteps[stepName] = {
        ...step,
        status: "cancelled",
        message: "Keskeytetty.",
        updatedAt: now,
      };
    }

    current.backgroundRemoval = {
      ...current.backgroundRemoval,
      status: "cancelled",
      steps: cancelledSteps,
      error: null,
      technicalDetails: null,
      updatedAt: now,
    };
  }

  for (const job of Object.values(current.jobs ?? {})) {
    Object.assign(job, {
      status: "cancelled",
      message: "Videon työstäminen keskeytettiin.",
      error: null,
      technicalDetails: null,
      updatedAt: now,
    });
  }

  current.cancelled = true;
  current.updatedAt = now;

  renderStatusByStoryId.set(storyId, current);
}

function createBackgroundRemovalStatus(enabled) {
  const now = new Date().toISOString();

  if (!enabled) {
    return {
      enabled: false,
      status: "skipped",
      steps: {},
      error: null,
      technicalDetails: null,
      updatedAt: now,
    };
  }

  return {
    enabled: true,
    status: "queued",
    steps: {
      preprocessing: {
        status: "queued",
        progress: 0,
        message: "Esikäsittely odottaa.",
        updatedAt: now,
      },
      processing: {
        status: "queued",
        progress: 0,
        message: "Taustan poistaminen odottaa.",
        updatedAt: now,
      },
      finishing: {
        status: "queued",
        progress: 0,
        message: "Viimeistely odottaa.",
        updatedAt: now,
      },
    },
    error: null,
    technicalDetails: null,
    updatedAt: now,
  };
}

function initializeRenderStatus(storyId, formats, removeBackground) {
  cancelledStoryIds.delete(storyId);

  const jobs = {};
  const now = new Date().toISOString();

  formats.forEach((format) => {
    jobs[format] = {
      format,
      status: "queued",
      progress: 0,
      message: removeBackground
        ? "Odottaa taustanpoiston valmistumista."
        : "Odottaa lopullisen videon luomista.",
      updatedAt: now,
    };
  });

  renderStatusByStoryId.set(storyId, {
    storyId,
    backgroundRemoval: createBackgroundRemovalStatus(removeBackground),
    jobs,
    cancelled: false,
    updatedAt: now,
  });
}

function updateBackgroundRemovalStatus(storyId, patch) {
  if (isStoryCancelled(storyId)) {
    return;
  }

  const current = renderStatusByStoryId.get(storyId);

  if (!current?.backgroundRemoval) {
    return;
  }

  const now = new Date().toISOString();
  const previous = current.backgroundRemoval;
  const updatedSteps = {
    ...previous.steps,
  };

  Object.entries(patch.steps ?? {}).forEach(([stepName, stepPatch]) => {
    updatedSteps[stepName] = {
      ...(updatedSteps[stepName] ?? {}),
      ...stepPatch,
      updatedAt: now,
    };
  });

  current.backgroundRemoval = {
    ...previous,
    ...patch,
    steps: updatedSteps,
    updatedAt: now,
  };

  current.updatedAt = now;

  renderStatusByStoryId.set(storyId, current);
}

function markBackgroundRemovalFailed(storyId, message, technicalDetails = "") {
  const current = renderStatusByStoryId.get(storyId);
  const steps = current?.backgroundRemoval?.steps ?? {};

  let failedStep = "preprocessing";

  if (steps.finishing?.status === "running") {
    failedStep = "finishing";
  } else if (steps.processing?.status === "running") {
    failedStep = "processing";
  }

  updateBackgroundRemovalStatus(storyId, {
    status: "failed",
    error: message,
    technicalDetails,
    steps: {
      [failedStep]: {
        status: "failed",
        message,
      },
    },
  });
}

function updateRenderStatus(storyId, format, patch) {
  if (isStoryCancelled(storyId)) {
    return;
  }

  const current = renderStatusByStoryId.get(storyId) ?? {
    storyId,
    jobs: {},
  };

  const previous = current.jobs[format] ?? {
    format,
    status: "queued",
    progress: 0,
    message: "",
  };

  current.jobs[format] = {
    ...previous,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  current.updatedAt = new Date().toISOString();

  renderStatusByStoryId.set(storyId, current);
}

function parseNexrenderProgress(text) {
  const match = text.match(/rendering progress\s+(\d+(?:\.\d+)?)%/i);

  if (!match) {
    return null;
  }

  const progress = Number(match[1]);

  if (Number.isNaN(progress)) {
    return null;
  }

  return Math.max(0, Math.min(100, progress));
}

function getRenderStatusResponse(storyId) {
  const status = renderStatusByStoryId.get(storyId);

  if (!status) {
    return null;
  }

  return {
    storyId,
    backgroundRemoval: status.backgroundRemoval,
    jobs: Object.values(status.jobs),
    cancelled: Boolean(status.cancelled),
    canCancel: canCancelStory(status),
    updatedAt: status.updatedAt,
  };
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDir(config.uploadsDir);
ensureDir(config.inputRootDir);
ensureDir(config.outputRootDir);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, config.uploadsDir);
  },
  filename: (req, file, callback) => {
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${safeOriginalName}`;

    callback(null, uniqueName);
  },
});

const allowedFileExtensions = {
  backgroundImage: [".jpg", ".jpeg", ".png"],
  storyVideo: [".mp4", ".mov"],
};

const upload = multer({
  storage,

  limits: {
    fileSize: 15 * 1024 * 1024 * 1024, // 15 GiB / tiedosto
    files: 2,
    fields: 10,
    parts: 12,
  },

  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = allowedFileExtensions[file.fieldname];

    if (!allowed || !allowed.includes(extension)) {
      const message =
        file.fieldname === "backgroundImage"
          ? "Taustakuvan tulee olla JPG- tai PNG-tiedosto."
          : "Videon tulee olla MP4- tai MOV-tiedosto.";

      return callback(new Error(message));
    }

    callback(null, true);
  },
});

function uploadStoryFiles(req, res, next) {
  upload.fields([
    { name: "backgroundImage", maxCount: 1 },
    { name: "storyVideo", maxCount: 1 },
  ])(req, res, (error) => {
    if (!error) {
      const backgroundImage = req.files?.backgroundImage?.[0];

      const maxImageSize = 50 * 1024 * 1024; // 50 MiB

      if (backgroundImage && backgroundImage.size > maxImageSize) {
        cleanupUploadedFiles(req.files);

        return res.status(413).json({
          ok: false,
          status: "error",
          error: "Taustakuva on liian suuri. Enimmäiskoko on 50 Mt.",
        });
      }

      return next();
    }

    if (error instanceof multer.MulterError) {
      const isTooLarge = error.code === "LIMIT_FILE_SIZE";

      return res.status(isTooLarge ? 413 : 400).json({
        ok: false,
        status: "error",
        error: isTooLarge
          ? "Tiedosto on liian suuri. Enimmäiskoko on 15 GB."
          : "Tiedostojen lähetys epäonnistui: liian monta tiedostoa tai lomakekenttää.",
      });
    }

    return res.status(400).json({
      ok: false,
      status: "error",
      error: error.message,
    });
  });
}

app.use(express.json());

function getNextStoryId() {
  const entries = fs.readdirSync(config.inputRootDir, {
    withFileTypes: true,
  });

  const numericIds = entries
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map((entry) => Number(entry.name))
    .filter((value) => !Number.isNaN(value));

  const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

  return String(nextId).padStart(3, "0");
}

function createStoryDir() {
  let storyId = getNextStoryId();

  while (true) {
    const storyDir = path.join(config.inputRootDir, storyId);

    try {
      fs.mkdirSync(storyDir);
      return {
        storyId,
        storyDir,
      };
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      const nextNumber = Number(storyId) + 1;
      storyId = String(nextNumber).padStart(3, "0");
    }
  }
}

function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

function parseRenderFormats(rawValue) {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue.filter((format) => allowedRenderFormats.includes(format));
  }

  const value = String(rawValue).trim();

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.filter((format) => allowedRenderFormats.includes(format));
    }

    if (allowedRenderFormats.includes(parsed)) {
      return [parsed];
    }
  } catch {
    // Jatketaan varamuotoihin.
  }

  const cleanedValue = value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/["']/g, "");

  return cleanedValue
    .split(",")
    .map((format) => format.trim())
    .filter((format) => allowedRenderFormats.includes(format));
}

function getJobFilePath(storyId, format) {
  const outputDir = path.join(config.outputRootDir, storyId);

  const candidates = [
    path.join(outputDir, `job-auto-${format}.json`),
    path.join(outputDir, "job-auto.json"),
  ];

  const existingJobFile = candidates.find((candidate) =>
    fs.existsSync(candidate),
  );

  if (!existingJobFile) {
    throw new Error(
      `Nexrender-jobia ei löytynyt kansiosta ${outputDir}. Etsittiin: ${candidates.join(", ")}`,
    );
  }

  return existingJobFile;
}

function getNexrenderCommand() {
  if (path.isAbsolute(config.nexrenderCommand)) {
    return config.nexrenderCommand;
  }

  if (process.platform === "win32") {
    return path.join(
      config.projectRootDir,
      "node_modules",
      ".bin",
      "nexrender-cli.cmd",
    );
  }

  return path.join(
    config.projectRootDir,
    "node_modules",
    ".bin",
    "nexrender-cli",
  );
}

function cleanupUploadedFiles(files) {
  const uploadedFiles = [
    ...(files?.backgroundImage ?? []),
    ...(files?.storyVideo ?? []),
  ];

  uploadedFiles.forEach((file) => {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Väliaikaistiedoston poisto epäonnistui: ${file.path}`);
        console.error(error);
      }
    }
  });
}

function parseBooleanFormValue(rawValue) {
  return rawValue === true || rawValue === "true" || rawValue === "1";
}

function updateRenderStatuses(storyId, formats, patch) {
  formats.forEach((format) => {
    updateRenderStatus(storyId, format, patch);
  });
}

function startStoryPipeline({
  storyId,
  renderFormats,
  removeBackground,
  colorVideoPath,
  maskVideoPath,
}) {
  (async () => {
    try {
      if (isStoryCancelled(storyId)) {
        return;
      }

      if (removeBackground) {
        updateBackgroundRemovalStatus(storyId, {
          status: "running",
          error: null,
          technicalDetails: null,
          steps: {
            preprocessing: {
              status: "running",
              progress: 0,
              message: "Esikäsittely käynnissä.",
            },
          },
        });

        await runBackgroundRemoval({
          inputPath: colorVideoPath,
          outputPath: maskVideoPath,
          config,

          onSpawn: (backgroundRemovalProcess) => {
            registerStoryProcess(storyId, backgroundRemovalProcess);
          },

          onProgress: ({ step, progress }) => {
            if (isStoryCancelled(storyId)) {
              return;
            }

            if (step === "preprocessing") {
              updateBackgroundRemovalStatus(storyId, {
                status: "running",
                steps: {
                  preprocessing: {
                    status: "running",
                    progress,
                    message: `Esikäsittely käynnissä ${progress} %.`,
                  },
                },
              });

              return;
            }

            if (step === "processing") {
              updateBackgroundRemovalStatus(storyId, {
                status: "running",
                steps: {
                  preprocessing: {
                    status: "finished",
                    progress: 100,
                    message: "Esikäsittely valmis.",
                  },
                  processing: {
                    status: "running",
                    progress,
                    message: `Poistetaan taustaa videosta ${progress} %.`,
                  },
                },
              });

              return;
            }

            if (step === "smoothing") {
              updateBackgroundRemovalStatus(storyId, {
                status: "running",
                steps: {
                  preprocessing: {
                    status: "finished",
                    progress: 100,
                    message: "Esikäsittely valmis.",
                  },
                  processing: {
                    status: "finished",
                    progress: 100,
                    message: "Taustan poistaminen valmis.",
                  },
                  finishing: {
                    status: "running",
                    progress,
                    message: `Viimeistely käynnissä ${progress} %.`,
                  },
                },
              });
            }
          },
        });

        /*
         * Jos käyttäjä keskeytti taustanpoiston,
         * älä merkitse sitä valmiiksi äläkä käynnistä
         * renderöintiä.
         */
        if (isStoryCancelled(storyId)) {
          return;
        }

        updateBackgroundRemovalStatus(storyId, {
          status: "finished",
          error: null,
          technicalDetails: null,
          steps: {
            preprocessing: {
              status: "finished",
              progress: 100,
              message: "Esikäsittely valmis.",
            },
            processing: {
              status: "finished",
              progress: 100,
              message: "Taustan poistaminen valmis.",
            },
            finishing: {
              status: "finished",
              progress: 100,
              message: "Viimeistely valmis.",
            },
          },
        });

        updateRenderStatuses(storyId, renderFormats, {
          status: "queued",
          progress: 0,
          message: "Odottaa lopullisen videon luomista.",
        });
      }

      /*
       * Tarkistetaan vielä ennen renderöintien
       * käynnistämistä.
       */
      if (isStoryCancelled(storyId)) {
        return;
      }

      if (renderFormats.includes("insta")) {
        startRenderProcess(config.renderScripts.insta, storyId, "insta");
      }

      if (renderFormats.includes("hd")) {
        startRenderProcess(config.renderScripts.hd, storyId, "hd");
      }
    } catch (error) {
      /*
       * Prosessin tappaminen voi aiheuttaa virheen.
       * Keskeytettyä työtä ei merkitä epäonnistuneeksi.
       */
      if (isStoryCancelled(storyId)) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Videon taustan poistaminen epäonnistui.";

      const technicalDetails =
        error && typeof error === "object" && "technicalDetails" in error
          ? String(error.technicalDetails ?? "")
          : error instanceof Error
            ? error.stack || error.message
            : String(error);

      console.error("Taustanpoisto tai renderöintiputki epäonnistui:", error);

      if (removeBackground) {
        markBackgroundRemovalFailed(storyId, message, technicalDetails);

        updateRenderStatuses(storyId, renderFormats, {
          status: "failed",
          progress: 0,
          message:
            "Lopullisen videon luominen ei käynnistynyt, koska taustanpoisto epäonnistui.",
          error: message,
          technicalDetails,
        });

        return;
      }

      updateRenderStatuses(storyId, renderFormats, {
        status: "failed",
        progress: 0,
        message: "Lopullisen videon luominen ei käynnistynyt.",
        error: message,
        technicalDetails,
      });
    }
  })();
}

function startRenderProcess(scriptName, storyId, format) {
  if (isStoryCancelled(storyId)) {
    return;
  }

  updateRenderStatus(storyId, format, {
    status: "preparing",
    progress: 0,
    message: "Valmistellaan renderöintiä.",
  });

  const prepareProcess = spawn("node", [scriptName, storyId], {
    cwd: config.projectRootDir,
  });

  registerStoryProcess(storyId, prepareProcess);

  prepareProcess.stdout.on("data", (data) => {
    console.log(`[${scriptName} stdout] ${data.toString().trim()}`);
  });

  prepareProcess.stderr.on("data", (data) => {
    console.error(`[${scriptName} stderr] ${data.toString().trim()}`);
  });

  prepareProcess.on("close", (code) => {
    if (isStoryCancelled(storyId)) {
      return;
    }

    console.log(`[${scriptName}] päättyi koodilla ${code}`);

    if (code !== 0) {
      updateRenderStatus(storyId, format, {
        status: "failed",
        progress: 0,
        message: "Renderöinnin valmistelu epäonnistui.",
      });

      console.error(`[${scriptName}] epäonnistui, Nexrenderiä ei käynnistetä.`);
      return;
    }

    let jobFilePath;

    try {
      jobFilePath = getJobFilePath(storyId, format);
    } catch (error) {
      updateRenderStatus(storyId, format, {
        status: "failed",
        progress: 0,
        message: "Nexrender-jobitiedostoa ei löytynyt.",
      });

      console.error(error);
      return;
    }

    updateRenderStatus(storyId, format, {
      status: "rendering",
      progress: 0,
      message: "Renderöinti käynnissä.",
    });

    console.log(`Käynnistetään Nexrender: ${jobFilePath}`);

    const nexrenderArgs = [
      "--file",
      jobFilePath,
      "--binary",
      config.aerenderPath,
    ];

    const nexrenderCommand = getNexrenderCommand();

    const nexrenderProcess =
      process.platform === "win32"
        ? spawn(
            "cmd.exe",
            ["/d", "/s", "/c", nexrenderCommand, ...nexrenderArgs],
            {
              cwd: config.projectRootDir,
            },
          )
        : spawn(nexrenderCommand, nexrenderArgs, {
            cwd: config.projectRootDir,
          });

    registerStoryProcess(storyId, nexrenderProcess);

    nexrenderProcess.stdout.on("data", (data) => {
      if (isStoryCancelled(storyId)) {
        return;
      }

      const text = data.toString().trim();

      console.log(`[nexrender ${format} stdout] ${text}`);

      const progress = parseNexrenderProgress(text);

      if (progress !== null) {
        updateRenderStatus(storyId, format, {
          status: "rendering",
          progress,
          message: `Renderöinti käynnissä: ${Math.round(progress)} %.`,
        });
      }
    });

    nexrenderProcess.stderr.on("data", (data) => {
      console.error(`[nexrender ${format} stderr] ${data.toString().trim()}`);
    });

    nexrenderProcess.on("close", (renderCode) => {
      if (isStoryCancelled(storyId)) {
        return;
      }

      console.log(`[nexrender ${format}] päättyi koodilla ${renderCode}`);

      if (renderCode === 0) {
        updateRenderStatus(storyId, format, {
          status: "finished",
          progress: 100,
          message: "Renderöinti valmis.",
        });
      } else {
        updateRenderStatus(storyId, format, {
          status: "failed",
          message: "Renderöinti epäonnistui.",
        });
      }
    });

    nexrenderProcess.on("error", (error) => {
      if (isStoryCancelled(storyId)) {
        return;
      }
      updateRenderStatus(storyId, format, {
        status: "failed",
        message: "Nexrenderin käynnistys epäonnistui.",
      });

      console.error(`[nexrender ${format}] käynnistys epäonnistui:`, error);
    });
  });

  prepareProcess.on("error", (error) => {
    if (isStoryCancelled(storyId)) {
      return;
    }

    updateRenderStatus(storyId, format, {
      status: "failed",
      progress: 0,
      message: "Valmisteluskriptin käynnistys epäonnistui.",
    });

    console.error(`[${scriptName}] käynnistys epäonnistui:`, error);
  });
}

app.post("/api/stories", uploadStoryFiles, (req, res) => {
  let files;

  try {
    files = req.files;

    const backgroundImageFile = files?.backgroundImage?.[0];
    const storyVideoFile = files?.storyVideo?.[0];

    if (!backgroundImageFile || !storyVideoFile) {
      cleanupUploadedFiles(files);

      return res.status(400).json({
        ok: false,
        status: "error",
        error: "Taustakuva tai video puuttuu.",
      });
    }

    const title = String(req.body.title ?? "").trim();
    const author = String(req.body.author ?? "").trim();
    const date = String(req.body.date ?? "").trim();

    if (title.length > 50) {
      cleanupUploadedFiles(files);

      return res.status(400).json({
        ok: false,
        status: "error",
        error: "Tarinan otsikko saa olla enintään 50 merkkiä.",
      });
    }

    if (!title || !author || !date) {
      cleanupUploadedFiles(files);

      return res.status(400).json({
        ok: false,
        status: "error",
        error: "Tarinan otsikko, kertojan nimi tai päivämäärä puuttuu.",
      });
    }

    const renderFormats = parseRenderFormats(req.body.renderFormats);

    if (renderFormats.length === 0) {
      cleanupUploadedFiles(files);

      return res.status(400).json({
        ok: false,
        status: "error",
        error: "Valitse ainakin yksi luotava video.",
      });
    }

    const { storyId, storyDir } = createStoryDir();

    const removeBackground = parseBooleanFormValue(req.body.removeBackground);

    const imageExtension =
      getFileExtension(backgroundImageFile.originalname) || ".jpg";
    const videoExtension =
      getFileExtension(storyVideoFile.originalname) || ".mov";

    const finalImagePath = path.join(storyDir, `background${imageExtension}`);

    const colorVideoPath = path.join(storyDir, `video${videoExtension}`);

    const maskVideoPath = removeBackground
      ? path.join(storyDir, "video-mask.mov")
      : null;
    fs.renameSync(backgroundImageFile.path, finalImagePath);

    fs.renameSync(storyVideoFile.path, colorVideoPath);

    const metadata = {
      id: storyId,
      title,
      author,
      date,
      removeBackground,
      videoFile: path.basename(colorVideoPath),
      maskVideoFile: maskVideoPath ? path.basename(maskVideoPath) : undefined,
    };

    const metadataPath = path.join(storyDir, "metadata.json");

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

    const outputDir = path.join(config.outputRootDir, storyId);

    initializeRenderStatus(storyId, renderFormats, removeBackground);

    const startedJobs = [...renderFormats];

    startStoryPipeline({
      storyId,
      renderFormats,
      removeBackground,
      colorVideoPath,
      maskVideoPath,
    });

    console.log("Tallennettu uusi tarina ja käynnistetyt renderöinnit:");
    console.log({
      id: storyId,
      title,
      author,
      date,
      renderFormats,
      startedJobs,
      storyDir,
      finalImagePath,
      colorVideoPath,
      maskVideoPath,
      metadataPath,
    });

    return res.status(201).json({
      ok: true,
      status: "ok",
      message: "Tarina tallennettu ja renderöinnit käynnistetty.",
      storyId,
      storyDir,
      outputDir,
      renderFormats,
      startedJobs,
      metadata,
    });
  } catch (error) {
    cleanupUploadedFiles(files);

    console.error(
      "Virhe tarinan tallennuksessa tai renderöinnin käynnistyksessä:",
      error,
    );

    return res.status(500).json({
      ok: false,
      status: "error",
      error: "Tarinan tallennus tai renderöinnin käynnistys epäonnistui.",
    });
  }
});

app.post("/api/stories/:storyId/cancel", async (req, res) => {
  const { storyId } = req.params;
  const currentStatus = renderStatusByStoryId.get(storyId);

  if (!currentStatus) {
    return res.status(404).json({
      ok: false,
      status: "error",
      error: "Keskeytettävää työtä ei löytynyt.",
    });
  }

  if (!canCancelStory(currentStatus)) {
    return res.json({
      ok: true,
      status: "ok",
      message: currentStatus.cancelled
        ? "Työ on jo keskeytetty."
        : "Videoiden työstäminen on jo päättynyt.",
      ...getRenderStatusResponse(storyId),
    });
  }

  /*
   * Merkitään työ ensin keskeytetyksi.
   * Tämän jälkeen prosessien sulkeutuminen
   * ei muuta tilaa epäonnistuneeksi.
   */
  cancelledStoryIds.add(storyId);
  markStoryCancelled(storyId);

  const activeProcesses = [...(activeProcessesByStoryId.get(storyId) ?? [])];

  await Promise.allSettled(
    activeProcesses.map((childProcess) => killProcessTree(childProcess)),
  );

  activeProcessesByStoryId.delete(storyId);

  return res.json({
    ok: true,
    status: "ok",
    message: "Taustanpoisto ja videoiden työstäminen keskeytettiin.",
    ...getRenderStatusResponse(storyId),
  });
});

app.get("/api/stories/:storyId/status", (req, res) => {
  const progress = getRenderStatusResponse(req.params.storyId);

  if (!progress) {
    return res.status(404).json({
      ok: false,
      status: "error",
      error: "Renderöinnin etenemistietoja ei löytynyt.",
    });
  }

  return res.json({
    ok: true,
    status: "ok",
    ...progress,
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "tarinakioski",
  });
});

const frontendDistDir = path.join(
  config.projectRootDir,
  "tarinakioski-lomake",
  "dist",
);

app.use(express.static(frontendDistDir));

app.listen(port, "127.0.0.1", () => {
  console.log(`Tarinakioski käynnissä: http://127.0.0.1:${port}`);
});
