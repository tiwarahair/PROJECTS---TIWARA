import { describe, expect, it } from "vitest";
import { recommendationsFor, resultTitleFor } from "../other/hair-quiz";

const ids = (answers: Parameters<typeof recommendationsFor>[0]) =>
  recommendationsFor(answers).map((rec) => rec.id);

describe("recommendationsFor", () => {
  it("falls back to moisture + definition when nothing matches", () => {
    expect(ids({})).toEqual(["moisture", "definition"]);
    expect(ids({ density: "medium", scalp: "balanced", goals: [] })).toEqual([
      "moisture",
      "definition",
    ]);
  });

  it("maps each goal to its routine", () => {
    expect(ids({ goals: ["moisture"] })).toEqual(["moisture"]);
    expect(ids({ goals: ["growth"] })).toEqual(["growth"]);
    expect(ids({ goals: ["damage"] })).toEqual(["growth"]);
    expect(ids({ goals: ["scalp"] })).toEqual(["scalp"]);
    expect(ids({ goals: ["definition"] })).toEqual(["definition"]);
    expect(ids({ goals: ["shine"] })).toEqual(["definition"]);
  });

  it("adds the scalp routine for an oily or dry scalp even without the goal", () => {
    expect(ids({ scalp: "oily" })).toEqual(["scalp"]);
    expect(ids({ scalp: "dry" })).toEqual(["scalp"]);
    // Balanced and sensitive scalps do not trigger it.
    expect(ids({ scalp: "balanced", goals: ["moisture"] })).toEqual([
      "moisture",
    ]);
    expect(ids({ scalp: "sensitive", goals: ["moisture"] })).toEqual([
      "moisture",
    ]);
  });

  it("treats coarse hair as needing moisture as well as its own routine", () => {
    expect(ids({ density: "coarse" })).toEqual(["moisture", "coarse"]);
  });

  it("adds the fine-hair routine for fine density", () => {
    expect(ids({ density: "fine", goals: ["moisture"] })).toEqual([
      "moisture",
      "fine",
    ]);
  });

  it("never repeats a routine when several rules overlap", () => {
    const result = ids({
      density: "coarse",
      scalp: "dry",
      goals: ["moisture", "growth", "damage", "scalp", "definition", "shine"],
    });
    expect(new Set(result).size).toBe(result.length);
  });

  it("returns routines in display order", () => {
    expect(
      ids({
        density: "fine",
        scalp: "oily",
        goals: ["definition", "growth", "moisture"],
      }),
    ).toEqual(["moisture", "growth", "scalp", "definition", "fine"]);
  });
});

describe("resultTitleFor", () => {
  it("includes the upper-cased curl type when one was chosen", () => {
    expect(resultTitleFor({ type: "4c" })).toBe(
      "Your Type 4C personalised routine",
    );
  });

  it("omits the type when the user skipped or was unsure", () => {
    expect(resultTitleFor({})).toBe("Your personalised routine");
  });
});
