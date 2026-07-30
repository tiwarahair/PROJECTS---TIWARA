import { useEffect, useRef, useState } from "react";
import {
  analyseSample,
  sampleImage,
  type AiResult,
} from "../../utils/image-analysis";

// TO DO: is this necesarry (ANALYSE_MS)
/** How long the "Analysing your look…" state is held before results appear. */
const ANALYSE_MS = 1800;

export type AIPhase = "upload" | "analysing" | "results";

export interface AIDiscovery {
  phase: AIPhase;
  previewSrc: string | null;
  result: AiResult | null;
  /** Bumped to remount the file input so the same file can be picked twice. */
  uploadKey: number;
  handleFile: (file: File) => void;
  handleImageLoad: (image: HTMLImageElement) => void;
  retry: () => void;
}

export function useAIDiscovery(): AIDiscovery {
  const [phase, setPhase] = useState<AIPhase>("upload");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const analyseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAnalyseTimer = () => {
    if (analyseTimer.current !== null) clearTimeout(analyseTimer.current);
    analyseTimer.current = null;
  };

  // A pending analysis must never outlive the flow that started it, or a retry
  // mid-analysis lands back on stale results.
  useEffect(() => clearAnalyseTimer, []);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const source = event.target?.result;
      if (typeof source === "string") setPreviewSrc(source);
    };
    reader.readAsDataURL(file);
  };

  // Analysis starts once the preview image has actually loaded, so the canvas
  // has something to draw.
  const handleImageLoad = (image: HTMLImageElement) => {
    clearAnalyseTimer();
    setPhase("analysing");
    analyseTimer.current = setTimeout(() => {
      setResult(analyseSample(sampleImage(image)));
      setPhase("results");
    }, ANALYSE_MS);
  };

  const retry = () => {
    clearAnalyseTimer();
    setPhase("upload");
    setPreviewSrc(null);
    setResult(null);
    // Without this the input keeps its old value and re-picking the same file
    // fires no change event, leaving the flow looking dead.
    setUploadKey((current) => current + 1);
  };

  return {
    phase,
    previewSrc,
    result,
    uploadKey,
    handleFile,
    handleImageLoad,
    retry,
  };
}
