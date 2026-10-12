// Loads the untouched reference scripts (design-import/, gitignored) so tests can diff our helpers against them.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import nodeVm from "node:vm";

export const PROTOTYPE_DIR = join(
  process.cwd(),
  "design-import/handoff folder/project/design_handoff_tiwaras_house/prototype",
);

export const hasPrototype = existsSync(join(PROTOTYPE_DIR, "data.js"));

/** Runs the reference data.js in a sandbox and returns its exported helpers and data (untyped). */
export const loadPrototypeData = (search = ""): Record<string, unknown> => {
  const source = readFileSync(join(PROTOTYPE_DIR, "data.js"), "utf8");

  // Share this realm's Date so fake timers (vi.setSystemTime) apply to the reference too.
  const sandbox = {
    window: {} as Record<string, unknown>,
    location: { search },
    Date,
  };

  nodeVm.runInNewContext(source, sandbox);

  return sandbox.window.TIWARA as Record<string, unknown>;
};

/** Normalises values across realms (vm Dates/arrays) so toEqual compares plain data. */
export const toPlain = <T>(value: T): unknown =>
  JSON.parse(JSON.stringify(value));

/** Deep-renames the reference implementation's short keys to our names (e.g. [["q", "question"]]) so parity checks compare like with like. */
export const renameKeys = (
  value: unknown,
  names: [string, string][],
): unknown => {
  const lookup = new Map(names);

  const rename = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(rename);

    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item).map(([key, entry]) => [
          lookup.get(key) ?? key,
          rename(entry),
        ]),
      );

    return item;
  };

  return rename(value);
};

// where each image file lives in assets/ (by file name), e.g. "w160524.jpg" → "demo/stylists/w160524.jpg"
const ASSET_PATHS = new Map(
  Object.keys(import.meta.glob("../../assets/**/*.{jpg,jpeg,png,webp}")).map(
    (modulePath) => {
      const relativePath = modulePath.replace("../../assets/", "");

      return [relativePath.split("/").pop(), relativePath];
    },
  ),
);

/** Deep-maps the reference implementation's flat "img/<file>" paths to where each file lives in assets/. */
export const toAssetPaths = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(toAssetPaths);

  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toAssetPaths(entry)]),
    );

  if (typeof value === "string" && value.startsWith("img/"))
    return ASSET_PATHS.get(value.slice("img/".length)) ?? value;

  return value;
};
