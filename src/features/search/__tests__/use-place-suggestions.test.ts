import { renderHook } from "@testing-library/react";
import { useApiLoadingStatus } from "@vis.gl/react-google-maps";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlaceSuggestions } from "../use-place-suggestions";

describe("usePlaceSuggestions", () => {
  afterEach(() => vi.mocked(useApiLoadingStatus).mockReturnValue("FAILED"));

  it("counts as searching while Google is still loading, so it doesn't say nothing matches", () => {
    vi.mocked(useApiLoadingStatus).mockReturnValue("LOADING");

    const { result } = renderHook(() => usePlaceSuggestions("Hulme"));

    expect(result.current.isSearching).toBe(true);
  });

  it("has nothing to wait for when Google failed to load", () => {
    const { result } = renderHook(() => usePlaceSuggestions("Hulme"));

    expect(result.current.isSearching).toBe(false);
  });
});
