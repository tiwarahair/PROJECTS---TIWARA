import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

const getModuleFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return getModuleFiles(path);

    return entry.name.endsWith(".module.css") ? [path] : [];
  });

const getLeakingSelectors = (css: string): string[] => {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const leaks: string[] = [];
  let keyframeDepth = 0;

  for (const match of withoutComments.matchAll(/([^{};]*)([{}])/g)) {
    const [, rawSelector = "", brace] = match;
    const selector = rawSelector.trim();

    if (brace === "}") {
      if (keyframeDepth) keyframeDepth--;

      continue;
    }

    if (keyframeDepth) {
      keyframeDepth++;
      continue;
    }

    if (selector.startsWith("@keyframes")) {
      keyframeDepth = 1;
      continue;
    }

    if (!selector || selector.startsWith("@")) continue;

    for (const part of selector.split(",")) {
      const first = part.trim().split(/\s+|>|~|\+/)[0] ?? "";

      const scoped =
        first.startsWith(":global(html.") || /^[a-z0-9_-]*\./i.test(first);

      if (!scoped) leaks.push(part.trim());
    }
  }

  return leaks;
};

describe("CSS modules", () => {
  it("scope every selector to a module class or the page's html class", () => {
    const leaks = getModuleFiles(SRC).flatMap((file) =>
      getLeakingSelectors(readFileSync(file, "utf8")).map(
        (selector) => `${relative(SRC, file)}: ${selector}`,
      ),
    );

    expect(leaks).toEqual([]);
  });
});
