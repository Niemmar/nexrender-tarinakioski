import fs from "fs";
import { spawn } from "child_process";

export function runBackgroundRemoval({ inputPath, outputPath, config }) {
  return new Promise((resolve, reject) => {
    const { toolDir, pythonPath, scriptPath } = config.backgroundRemoval;

    if (!fs.existsSync(pythonPath)) {
      reject(
        new Error(`Taustanpoiston Pythonia ei löytynyt polusta: ${pythonPath}`),
      );
      return;
    }

    if (!fs.existsSync(scriptPath)) {
      reject(
        new Error(`Taustanpoistoskriptiä ei löytynyt polusta: ${scriptPath}`),
      );
      return;
    }

    if (!fs.existsSync(inputPath)) {
      reject(
        new Error(
          `Taustanpoiston lähtövideota ei löytynyt polusta: ${inputPath}`,
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

    backgroundRemovalProcess.stdout.on("data", (data) => {
      console.log(`[taustanpoisto stdout] ${data.toString().trim()}`);
    });

    backgroundRemovalProcess.stderr.on("data", (data) => {
      console.error(`[taustanpoisto stderr] ${data.toString().trim()}`);
    });

    backgroundRemovalProcess.on("close", (code) => {
      console.log(`[taustanpoisto] päättyi koodilla ${code}`);

      if (code !== 0) {
        reject(new Error("Taustanpoisto epäonnistui."));
        return;
      }

      if (!fs.existsSync(outputPath)) {
        reject(
          new Error(
            `Taustanpoisto päättyi ilman virhekoodia, mutta tulostiedostoa ei löytynyt: ${outputPath}`,
          ),
        );
        return;
      }

      resolve(outputPath);
    });

    backgroundRemovalProcess.on("error", (error) => {
      reject(error);
    });
  });
}
