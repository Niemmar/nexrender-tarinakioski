import fs from "fs";
import { spawn } from "child_process";

function calculateProgress(currentFrame, totalFrames) {
  if (
    !Number.isFinite(currentFrame) ||
    !Number.isFinite(totalFrames) ||
    totalFrames <= 0
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.min(100, Math.floor((currentFrame / totalFrames) * 100)),
  );
}

function createBackgroundRemovalError(message, technicalDetails = "") {
  const error = new Error(message);
  error.technicalDetails = technicalDetails;

  return error;
}

export function runBackgroundRemoval({
  inputPath,
  outputPath,
  config,
  onProgress,
}) {
  return new Promise((resolve, reject) => {
    const { toolDir, pythonPath, scriptPath } = config.backgroundRemoval;

    if (!fs.existsSync(pythonPath)) {
      reject(
        createBackgroundRemovalError(
          "Taustanpoiston Pythonia ei löytynyt.",
          `Pythonia ei löytynyt polusta: ${pythonPath}`,
        ),
      );
      return;
    }

    if (!fs.existsSync(scriptPath)) {
      reject(
        createBackgroundRemovalError(
          "Taustanpoistoskriptiä ei löytynyt.",
          `Skriptiä ei löytynyt polusta: ${scriptPath}`,
        ),
      );
      return;
    }

    if (!fs.existsSync(inputPath)) {
      reject(
        createBackgroundRemovalError(
          "Taustanpoiston lähtövideota ei löytynyt.",
          `Lähtövideota ei löytynyt polusta: ${inputPath}`,
        ),
      );
      return;
    }

    const args = ["-u", scriptPath, inputPath, "-o", outputPath];

    console.log("Käynnistetään taustanpoisto:");
    console.log({
      toolDir,
      pythonPath,
      scriptPath,
      inputPath,
      outputPath,
    });

    const backgroundRemovalProcess = spawn(pythonPath, args, {
      cwd: toolDir,
      windowsHide: true,
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";

    const recentErrorLines = [];

    const lastReportedProgress = {
      processing: -1,
      smoothing: -1,
    };

    function emitProgress(step, currentFrame, totalFrames) {
      const progress = calculateProgress(currentFrame, totalFrames);

      if (progress === null || lastReportedProgress[step] === progress) {
        return;
      }

      lastReportedProgress[step] = progress;

      onProgress?.({
        step,
        currentFrame,
        totalFrames,
        progress,
      });
    }

    function handleOutputLine(rawLine, source) {
      const line = rawLine.trim();

      if (!line) {
        return;
      }

      if (source === "stdout") {
        console.log(`[taustanpoisto stdout] ${line}`);
      } else {
        console.error(`[taustanpoisto stderr] ${line}`);
      }

      const processingMatch = line.match(
        /Processing frame\s+(\d+)\s*\/\s*(\d+)/i,
      );

      if (processingMatch) {
        emitProgress(
          "processing",
          Number(processingMatch[1]),
          Number(processingMatch[2]),
        );
        return;
      }

      const smoothingMatch = line.match(/Smoothed frame\s+(\d+)\s*\/\s*(\d+)/i);

      if (smoothingMatch) {
        emitProgress(
          "smoothing",
          Number(smoothingMatch[1]),
          Number(smoothingMatch[2]),
        );
        return;
      }

      if (source === "stderr") {
        recentErrorLines.push(line);

        if (recentErrorLines.length > 20) {
          recentErrorLines.shift();
        }
      }
    }

    function handleOutputChunk(data, source) {
      const text = data.toString();

      if (source === "stdout") {
        stdoutBuffer += text;

        const lines = stdoutBuffer.split(/\r\n|\n|\r/);
        stdoutBuffer = lines.pop() ?? "";

        lines.forEach((line) => handleOutputLine(line, source));
        return;
      }

      stderrBuffer += text;

      const lines = stderrBuffer.split(/\r\n|\n|\r/);
      stderrBuffer = lines.pop() ?? "";

      lines.forEach((line) => handleOutputLine(line, source));
    }

    function flushOutputBuffers() {
      if (stdoutBuffer.trim()) {
        handleOutputLine(stdoutBuffer, "stdout");
      }

      if (stderrBuffer.trim()) {
        handleOutputLine(stderrBuffer, "stderr");
      }

      stdoutBuffer = "";
      stderrBuffer = "";
    }

    backgroundRemovalProcess.stdout.on("data", (data) => {
      handleOutputChunk(data, "stdout");
    });

    backgroundRemovalProcess.stderr.on("data", (data) => {
      handleOutputChunk(data, "stderr");
    });

    backgroundRemovalProcess.on("close", (code) => {
      flushOutputBuffers();

      console.log(`[taustanpoisto] päättyi koodilla ${code}`);

      if (code !== 0) {
        const technicalDetails =
          recentErrorLines.join("\n") ||
          `Python-prosessi päättyi koodilla ${code}.`;

        reject(
          createBackgroundRemovalError(
            "Taustan poistaminen videosta epäonnistui.",
            technicalDetails,
          ),
        );
        return;
      }

      if (!fs.existsSync(outputPath)) {
        reject(
          createBackgroundRemovalError(
            "Taustattoman videon viimeistely epäonnistui.",
            `Prosessi päättyi ilman virhekoodia, mutta tiedostoa ei löytynyt: ${outputPath}`,
          ),
        );
        return;
      }

      resolve(outputPath);
    });

    backgroundRemovalProcess.on("error", (error) => {
      reject(
        createBackgroundRemovalError(
          "Taustanpoistoprosessin käynnistäminen epäonnistui.",
          error instanceof Error ? error.message : String(error),
        ),
      );
    });
  });
}
