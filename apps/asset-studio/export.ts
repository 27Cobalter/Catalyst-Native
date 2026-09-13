import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { type FormatKey, formats, slides } from "./content";

const root = fileURLToPath(new URL(".", import.meta.url));
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : process.platform === "win32"
      ? "chrome.exe"
      : "google-chrome");

function isFormatKey(value: string): value is FormatKey {
  return value in formats;
}

const requestedFormats = process.argv.slice(2);
const formatKeys = requestedFormats.length > 0 ? requestedFormats : ["app-store"];
const requestedSlides = new Set(
  (process.env.STORE_SHOTS_SLIDES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const slideEntries = slides
  .map((slide, index) => [index, slide] as const)
  .filter(([, slide]) => requestedSlides.size === 0 || requestedSlides.has(slide.slug));

for (const key of formatKeys) {
  if (!isFormatKey(key)) {
    console.error(`Unknown format: ${key}. Choose one of: ${Object.keys(formats).join(", ")}`);
    process.exit(1);
  }
}

if (slideEntries.length === 0) {
  console.error(`No matching slides. Choose from: ${slides.map((slide) => slide.slug).join(", ")}`);
  process.exit(1);
}

for (const formatKey of formatKeys as FormatKey[]) {
  const format = formats[formatKey];
  const outputDir = join(root, "output", formatKey);
  mkdirSync(outputDir, { recursive: true });

  for (const [index, slide] of slideEntries) {
    const outputPath = join(outputDir, `${String(index + 1).padStart(2, "0")}-${slide.slug}.png`);
    const url = new URL(pathToFileURL(join(root, "dist", "index.html")));
    const profileDir = mkdtempSync(join(tmpdir(), "catalyst-store-shots-"));
    url.searchParams.set("capture", "1");
    url.searchParams.set("format", formatKey);
    url.searchParams.set("slide", String(index));

    try {
      const result = spawnSync(
        chrome,
        [
          "--headless=new",
          "--allow-file-access-from-files",
          "--disable-background-networking",
          "--disable-component-update",
          "--disable-default-apps",
          "--disable-extensions",
          "--disable-gpu",
          "--disable-sync",
          "--hide-scrollbars",
          "--metrics-recording-only",
          "--no-default-browser-check",
          "--no-first-run",
          "--run-all-compositor-stages-before-draw",
          "--virtual-time-budget=1500",
          "--force-device-scale-factor=1",
          `--user-data-dir=${profileDir}`,
          `--window-size=${format.width},${format.height}`,
          `--screenshot=${outputPath}`,
          url.href,
        ],
        { encoding: "utf8", timeout: 30_000 },
      );

      if (result.status !== 0) {
        console.error(result.error ?? (result.stderr || result.stdout));
        process.exitCode = 1;
        break;
      }

      console.log(`${formatKey}: ${basename(outputPath)} (${format.width}x${format.height})`);
    } finally {
      rmSync(profileDir, { recursive: true, force: true });
    }
  }
}
