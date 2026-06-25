import path from "path";
import { fileURLToPath } from "url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const lomakeDir = path.resolve(serverDir, "..");
const projectRootDir = path.resolve(lomakeDir, "..");

export const config = {
  projectRootDir,
  uploadsDir: path.join(lomakeDir, "uploads"),
  inputRootDir: path.join(projectRootDir, "input"),
  outputRootDir: path.join(projectRootDir, "output"),

  aerenderPath:
    "C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\aerender.exe",

  nexrenderCommand: "nexrender-cli",

  renderScripts: {
    insta: "prepare-story-insta-render.js",
    hd: "prepare-story-hd-render.js",
  },
};
