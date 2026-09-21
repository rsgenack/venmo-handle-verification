import { execFileSync, spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "docs/assets");
const demoUrl = "http://127.0.0.1:4173";

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium",
].filter(Boolean);

async function firstExecutable(candidates) {
  for (const candidate of candidates) {
    if (!candidate.includes("/")) return candidate;

    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next common browser location.
    }
  }

  throw new Error("Chrome or Chromium was not found. Set CHROME_PATH and retry.");
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }

  throw new Error(`Demo server did not start at ${url}.`);
}

function capture(chrome, name, url, width, height) {
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=${width},${height}`,
      "--force-device-scale-factor=1",
      "--virtual-time-budget=5000",
      `--screenshot=${resolve(output, name)}`,
      url,
    ],
    { stdio: "ignore" },
  );
}

await mkdir(output, { recursive: true });

const chrome = await firstExecutable(chromeCandidates);
const server = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"],
  { cwd: root, stdio: "ignore" },
);

try {
  await waitForServer(demoUrl);

  capture(chrome, "demo-input.png", demoUrl, 1280, 800);
  capture(chrome, "demo-modal.png", `${demoUrl}?stage=modal`, 1280, 800);
  capture(chrome, "demo-confirmed.png", `${demoUrl}?stage=verified`, 1280, 800);
  // Headless Chrome on macOS enforces a 500 px minimum layout viewport.
  capture(chrome, "demo-modal-mobile.png", `${demoUrl}?stage=modal`, 500, 844);

  try {
    execFileSync(
      "magick",
      [
        "-delay",
        "130",
        resolve(output, "demo-input.png"),
        "-delay",
        "260",
        resolve(output, "demo-modal.png"),
        "-delay",
        "160",
        resolve(output, "demo-confirmed.png"),
        "-resize",
        "960x",
        "-layers",
        "Optimize",
        "-loop",
        "0",
        resolve(output, "verification-flow.gif"),
      ],
      { stdio: "ignore" },
    );
  } catch {
    console.warn("ImageMagick was not found; PNG screenshots were still created.");
  }

  console.log(`README assets written to ${output}`);
} finally {
  server.kill("SIGTERM");
}
