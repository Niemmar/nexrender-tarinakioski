import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

import { config } from "./config.js";

const app = express();
const port = 3001;

if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

if (!fs.existsSync(config.inputRootDir)) {
  fs.mkdirSync(config.inputRootDir, { recursive: true });
}

if (!fs.existsSync(config.outputRootDir)) {
  fs.mkdirSync(config.outputRootDir, { recursive: true });
}

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

function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
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
  if (
    process.platform === "win32" &&
    config.nexrenderCommand === "nexrender-cli"
  ) {
    return "nexrender-cli.cmd";
  }

  return config.nexrenderCommand;
}

function startRenderProcess(scriptName, storyId, format) {
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
      console.error(`[${scriptName}] epäonnistui, Nexrenderiä ei käynnistetä.`);
      return;
    }

    let jobFilePath;

    try {
      jobFilePath = getJobFilePath(storyId, format);
    } catch (error) {
      console.error(error);
      return;
    }

    console.log(`Käynnistetään Nexrender: ${jobFilePath}`);

    const nexrenderArgs = [
      "--file",
      jobFilePath,
      "--binary",
      config.aerenderPath,
    ];

    const nexrenderProcess =
      process.platform === "win32"
        ? spawn(
            "cmd.exe",
            ["/d", "/s", "/c", config.nexrenderCommand, ...nexrenderArgs],
            {
              cwd: config.projectRootDir,
            },
          )
        : spawn(config.nexrenderCommand, nexrenderArgs, {
            cwd: config.projectRootDir,
          });

    nexrenderProcess.stdout.on("data", (data) => {
      console.log(`[nexrender ${format} stdout] ${data.toString().trim()}`);
    });

    nexrenderProcess.stderr.on("data", (data) => {
      console.error(`[nexrender ${format} stderr] ${data.toString().trim()}`);
    });

    nexrenderProcess.on("close", (renderCode) => {
      console.log(`[nexrender ${format}] päättyi koodilla ${renderCode}`);
    });

    nexrenderProcess.on("error", (error) => {
      console.error(`[nexrender ${format}] käynnistys epäonnistui:`, error);
    });
  });

  prepareProcess.on("error", (error) => {
    console.error(`[${scriptName}] käynnistys epäonnistui:`, error);
  });
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Tarinakioskin paikallinen API toimii.",
  });
});

app.post(
  "/api/stories",
  upload.fields([
    { name: "backgroundImage", maxCount: 1 },
    { name: "storyVideo", maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const files = req.files;

      const backgroundImageFile = files?.backgroundImage?.[0];
      const storyVideoFile = files?.storyVideo?.[0];

      if (!backgroundImageFile || !storyVideoFile) {
        return res.status(400).json({
          status: "error",
          message: "Taustakuva tai video puuttuu.",
        });
      }

      const title = req.body.title ?? "";
      const author = req.body.author ?? "";
      const date = req.body.date ?? "";

      let renderFormats = [];

      try {
        renderFormats = req.body.renderFormats
          ? JSON.parse(req.body.renderFormats)
          : [];
      } catch {
        renderFormats = [];
      }

      const storyId = getNextStoryId();
      const storyDir = path.join(config.inputRootDir, storyId);

      fs.mkdirSync(storyDir, { recursive: true });

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

      res.json({
        status: "ok",
        message: "Tarina tallennettu ja renderöinnit käynnistetty.",
        storyId,
        storyDir,
        renderFormats,
        startedJobs,
        metadata,
      });
    } catch (error) {
      console.error(
        "Virhe tarinan tallennuksessa tai renderöinnin käynnistyksessä:",
        error,
      );

      res.status(500).json({
        status: "error",
        message: "Tarinan tallennus tai renderöinnin käynnistys epäonnistui.",
      });
    }
  },
);

app.listen(port, () => {
  console.log(`Tarinakioski API käynnissä: http://localhost:${port}`);
});
