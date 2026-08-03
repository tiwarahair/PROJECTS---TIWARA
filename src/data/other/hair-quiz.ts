export type QuizKey = "type" | "density" | "scalp" | "goals" | "wash";

export interface QuizOption {
  value: string;
  label: string;
  /** Secondary line under the label. */
  hint?: string;
  /** The "Not sure" option spans the full grid row. */
  fullWidth?: boolean;
}

export interface QuizSlide {
  key: QuizKey;
  eyebrow: string;
  question: string;
  /** Extra note rendered small and dimmed next to the question. */
  questionNote?: string;
  layout: "list" | "grid" | "multi";
  options: readonly QuizOption[];
}

export interface QuizRecommendation {
  id: string;
  title: string;
  body: string;
}

export const QUIZ_SLIDES: readonly QuizSlide[] = [
  {
    key: "type",
    eyebrow: "Question 1 of 5",
    question: "What's your curl pattern?",
    layout: "grid",
    options: [
      { value: "3a", label: "3a", hint: "Loose, springy curls" },
      { value: "3b", label: "3b", hint: "Tight, voluminous curls" },
      { value: "3c", label: "3c", hint: "Coily corkscrew curls" },
      { value: "4a", label: "4a", hint: "Soft, tightly coiled" },
      { value: "4b", label: "4b", hint: "Z-shaped, dense coils" },
      { value: "4c", label: "4c", hint: "Tight, kinky coils" },
      { value: "unsure", label: "Not sure", fullWidth: true },
    ],
  },
  {
    key: "density",
    eyebrow: "Question 2 of 5",
    question: "How would you describe your hair density?",
    layout: "list",
    options: [
      { value: "fine", label: "Fine", hint: "Strands are thin and delicate" },
      { value: "medium", label: "Medium", hint: "Average strand thickness" },
      { value: "coarse", label: "Coarse", hint: "Thick, strong strands" },
    ],
  },
  {
    key: "scalp",
    eyebrow: "Question 3 of 5",
    question: "How's your scalp usually?",
    layout: "list",
    options: [
      { value: "balanced", label: "Balanced", hint: "No major concerns" },
      { value: "oily", label: "Oily", hint: "Gets greasy between washes" },
      { value: "dry", label: "Dry", hint: "Tight, itchy or flaky" },
      {
        value: "sensitive",
        label: "Sensitive",
        hint: "Reacts to products easily",
      },
    ],
  },
  {
    key: "goals",
    eyebrow: "Question 4 of 5",
    question: "What are your main hair goals?",
    questionNote: "(pick all that apply)",
    layout: "multi",
    options: [
      { value: "moisture", label: "Moisture & hydration" },
      { value: "growth", label: "Growth & length retention" },
      { value: "scalp", label: "Scalp health" },
      { value: "definition", label: "Curl definition" },
      { value: "shine", label: "Shine & vibrancy" },
      { value: "damage", label: "Repair & strengthen" },
    ],
  },
  {
    key: "wash",
    eyebrow: "Question 5 of 5",
    question: "How often do you wash your hair?",
    layout: "list",
    options: [
      { value: "weekly", label: "Weekly" },
      { value: "biweekly", label: "Every 2 weeks" },
      { value: "monthly", label: "Monthly" },
      { value: "rarely", label: "Rarely / unsure" },
    ],
  },
];

export const QUIZ_TOTAL = QUIZ_SLIDES.length;

export const RECOMMENDATIONS: Record<string, QuizRecommendation> = {
  moisture: {
    id: "moisture",
    title: "Deep Moisture Routine",
    body: "Use a sulphate-free shampoo weekly, follow with a rich deep conditioning mask (leave on for 20–30 min under a heat cap). Seal with a lightweight oil (jojoba or argan) on damp hair.",
  },
  growth: {
    id: "growth",
    title: "Growth & Retention Protocol",
    body: "Monthly protein treatment to strengthen strands, followed by moisture to balance. Protective styling between appointments reduces breakage. Scalp massage with castor oil twice weekly stimulates growth.",
  },
  scalp: {
    id: "scalp",
    title: "Scalp Health Reset",
    body: "Switch to a scalp-balancing shampoo with tea tree or peppermint. Apply a lightweight scalp serum between washes. Avoid heavy butters directly on the scalp.",
  },
  definition: {
    id: "definition",
    title: "Curl Definition & Shine",
    body: "Apply a leave-in conditioner on soaking-wet hair, layer a curl cream on top, then seal with a small amount of oil. Diffuse or air-dry — no raking when dry to preserve clumps.",
  },
  fine: {
    id: "fine",
    title: "Fine Hair Care",
    body: "Avoid heavy butters that weigh hair down. Use lightweight water-based leave-ins and liquid oils. Protein treatments every 4–6 weeks add structure and body.",
  },
  coarse: {
    id: "coarse",
    title: "Coarse Hair Nourishment",
    body: "Thicker hair needs richer products — shea or mango butter work well as sealants. Layer: water → leave-in → cream → oil (L.O.C. or L.C.O. method). Deep condition every wash day.",
  },
};

export interface QuizAnswers {
  type?: string;
  density?: string;
  scalp?: string;
  goals?: string[];
  wash?: string;
}

/**
 * Rules are evaluated in order and the order of the output is the order they
 * appear on screen. With no matches at all the user still gets a sensible
 * default pair.
 */
export function recommendationsFor(answers: QuizAnswers): QuizRecommendation[] {
  const goals = answers.goals ?? [];
  const picked: QuizRecommendation[] = [];

  if (goals.includes("moisture") || answers.density === "coarse") {
    picked.push(RECOMMENDATIONS.moisture!);
  }
  if (goals.includes("growth") || goals.includes("damage")) {
    picked.push(RECOMMENDATIONS.growth!);
  }
  if (
    goals.includes("scalp") ||
    answers.scalp === "oily" ||
    answers.scalp === "dry"
  ) {
    picked.push(RECOMMENDATIONS.scalp!);
  }
  if (goals.includes("definition") || goals.includes("shine")) {
    picked.push(RECOMMENDATIONS.definition!);
  }
  if (answers.density === "fine") picked.push(RECOMMENDATIONS.fine!);
  if (answers.density === "coarse") picked.push(RECOMMENDATIONS.coarse!);

  if (picked.length === 0) {
    return [RECOMMENDATIONS.moisture!, RECOMMENDATIONS.definition!];
  }
  return picked;
}

export function resultTitleFor(answers: QuizAnswers): string {
  const type = answers.type ? `Type ${answers.type.toUpperCase()} ` : "";
  return `Your ${type}personalised routine`;
}
