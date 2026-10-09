// Loads the untouched prototype scripts (design-import/, gitignored) so tests can diff the port against them.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

export const PROTOTYPE_DIR = join(
  process.cwd(),
  "design-import/handoff folder/project/design_handoff_tiwaras_house/prototype",
);

export const hasPrototype = existsSync(join(PROTOTYPE_DIR, "data.js"));

/** Runs prototype data.js in a sandbox and returns window.TIWARA (untyped: it is the reference implementation). */
export const loadPrototypeData = (search = ""): Record<string, unknown> => {
  const source = readFileSync(join(PROTOTYPE_DIR, "data.js"), "utf8");
  // Share this realm's Date so fake timers (vi.setSystemTime) apply to the prototype too.
  const sandbox = {
    window: {} as Record<string, unknown>,
    location: { search },
    Date,
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.TIWARA as Record<string, unknown>;
};

/** Normalises values across realms (vm Dates/arrays) so toEqual compares plain data. */
export const toPlain = <T>(value: T): unknown =>
  JSON.parse(JSON.stringify(value));
