import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

import { config } from "./config.js";

const app = express();
const port = 3001;

const allowedRenderFormats = ["insta", "hd"];
const renderStatusByStoryId = new Map();

function initializeRenderStatus(storyId, formats) {
  const jobs = {};

  formats.forEach((format) => {
    jobs[format] = {
      format,
      status: "queued",
      progress: 0,
      message: "Odottaa renderöintiä.",
      updatedAt: new Date().toISOString(),
    };
  });

  renderStatusByStoryId.set(storyId, {
    storyId,
    jobs,
    updatedAt: new Date().toISOString(),
  });
}

function updateRenderStatus(storyId, format, patch) {
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
    jobs: Object.values(status.jobs),
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

const upload = multer({
  storage,
});

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

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((format) => allowedRenderFormats.includes(format));
  } catch {
    return [];
  }
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

function startRenderProcess(scriptName, storyId, format) {
  updateRenderStatus(storyId, format, {
    status: "preparing",
    progress: 0,
    message: "Valmistellaan renderöintiä.",
  });

  const prepareProcess = spawn("node", [scriptName, storyId], {
    cwd: config.projectRootDir,
  });

  prepareProcess.stdout.on("data", (data) => {
    console.log(`[${scriptName} stdout] ${data.toString().trim()}`);
  });

  prepareProcess.stderr.on("data", (data) => {
    console.error(`[${scriptName} stderr] ${data.toString().trim()}`);
  });

  prepareProcess.on("close", (code) => {
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

    nexrenderProcess.stdout.on("data", (data) => {
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
      updateRenderStatus(storyId, format, {
        status: "failed",
        message: "Nexrenderin käynnistys epäonnistui.",
      });

      console.error(`[nexrender ${format}] käynnistys epäonnistui:`, error);
    });
  });

  prepareProcess.on("error", (error) => {
    updateRenderStatus(storyId, format, {
      status: "failed",
      progress: 0,
      message: "Valmisteluskriptin käynnistys epäonnistui.",
    });

    console.error(`[${scriptName}] käynnistys epäonnistui:`, error);
  });
}

app.post(
  "/api/stories",
  upload.fields([
    { name: "backgroundImage", maxCount: 1 },
    { name: "storyVideo", maxCount: 1 },
  ]),
  (req, res) => {
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

      const imageExtension =
        getFileExtension(backgroundImageFile.originalname) || ".jpg";
      const videoExtension =
        getFileExtension(storyVideoFile.originalname) || ".mov";

      const finalImagePath = path.join(storyDir, `background${imageExtension}`);
      const finalVideoPath = path.join(storyDir, `video${videoExtension}`);

      fs.renameSync(backgroundImageFile.path, finalImagePath);
      fs.renameSync(storyVideoFile.path, finalVideoPath);

      const metadata = {
        id: storyId,
        title,
        author,
        date,
      };

      const metadataPath = path.join(storyDir, "metadata.json");

      fs.writeFileSync(
        metadataPath,
        JSON.stringify(metadata, null, 2),
        "utf-8",
      );

      initializeRenderStatus(storyId, renderFormats);

      const startedJobs = [];

      if (renderFormats.includes("insta")) {
        startRenderProcess(config.renderScripts.insta, storyId, "insta");
        startedJobs.push("insta");
      }

      if (renderFormats.includes("hd")) {
        startRenderProcess(config.renderScripts.hd, storyId, "hd");
        startedJobs.push("hd");
      }

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
        finalVideoPath,
        metadataPath,
      });

      return res.status(201).json({
        ok: true,
        status: "ok",
        message: "Tarina tallennettu ja renderöinnit käynnistetty.",
        storyId,
        storyDir,
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
  },
);

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

app.listen(port, () => {
  console.log(`Tarinakioski API käynnissä: http://localhost:${port}`);
});
