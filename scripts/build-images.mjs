// `yarn images`: AVIF, WebP and JPEG copies of the bundled photos at three widths, for <picture> srcset.
// Needs ImageMagick 7 (`magick`) with AVIF support. Outputs are committed: the build server doesn't run this.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

const ASSETS = "assets";
const OUTPUT = join(ASSETS, "generated");

const SETS = [
  { folder: "site", widths: [640, 1080, 1536], skip: ["old-hero.jpg"] },
  { folder: "demo", widths: [400, 800, 1200], skip: [] },
];

// AVIF keeps full colour detail (4:4:4): 4:2:0 softens hair and edges
const FORMATS = [
  {
    extension: "avif",
    options: [
      "-quality",
      "65",
      "-define",
      "heic:speed=6",
      "-define",
      "heic:chroma=444",
    ],
  },
  { extension: "webp", options: ["-quality", "82"] },
  {
    extension: "jpg",
    options: [
      "-quality",
      "85",
      "-interlace",
      "Plane",
      "-sampling-factor",
      "4:2:0",
    ],
  },
];

// drops metadata but keeps the colour profile: wide-colour (Display P3) photos shift colour without it
const COMMON_OPTIONS = ["-auto-orient", "+profile", "!icc,*"];

// tiny copies shown blurred while the full photo loads; Vite inlines them into the CSS
const PLACEHOLDERS = ["site/hero.jpg"];

// changing these options regenerates every copy
const SETTINGS_FILE = join(OUTPUT, "settings.json");
const settings = JSON.stringify({ COMMON_OPTIONS, FORMATS });

const isSameSettings =
  existsSync(SETTINGS_FILE) && readFileSync(SETTINGS_FILE, "utf8") === settings;

const listPhotos = (folder) =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);

    if (entry.isDirectory()) return listPhotos(path);

    return /\.(jpe?g)$/i.test(entry.name) ? [path] : [];
  });

const getSize = (path) => {
  const [width, height] = execFileSync("magick", [
    "identify",
    "-format",
    "%w %h",
    `${path}[0]`,
  ])
    .toString()
    .split(" ")
    .map(Number);

  return { width, height };
};

const isFresh = (output, source) =>
  isSameSettings &&
  existsSync(output) &&
  statSync(output).mtimeMs >= statSync(source).mtimeMs;

const manifest = {};
let written = 0;

for (const { folder, widths, skip } of SETS) {
  for (const source of listPhotos(join(ASSETS, folder))) {
    if (skip.some((name) => source.endsWith(name))) continue;

    const assetPath = relative(ASSETS, source);
    const { width, height } = getSize(source);

    const fittingWidths = [
      ...new Set(widths.map((wanted) => Math.min(wanted, width))),
    ];

    const base = join(OUTPUT, assetPath.replace(/\.(jpe?g)$/i, ""));

    mkdirSync(dirname(base), { recursive: true });

    for (const targetWidth of fittingWidths) {
      for (const { extension, options } of FORMATS) {
        const output = `${base}-${targetWidth}.${extension}`;

        if (isFresh(output, source)) continue;

        execFileSync("magick", [
          source,
          ...COMMON_OPTIONS,
          "-resize",
          `${targetWidth}x>`,
          ...options,
          output,
        ]);

        written++;
      }
    }

    const placeholder = `${base}-placeholder.webp`;

    if (PLACEHOLDERS.includes(assetPath) && !isFresh(placeholder, source)) {
      execFileSync("magick", [
        source,
        "-auto-orient",
        "-strip",
        "-resize",
        "24x",
        "-quality",
        "55",
        placeholder,
      ]);

      written++;
    }

    manifest[assetPath] = { width, height, widths: fittingWidths };
  }
}

writeFileSync(
  join(OUTPUT, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

writeFileSync(SETTINGS_FILE, settings);
console.log(`${Object.keys(manifest).length} photos, ${written} files written`);
