import { act, render, screen } from "@testing-library/react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressFinder } from "..";
import type { AddressFinderValue } from "../data";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

const buildPrediction = (
  line1: string,
  secondary: string,
  postcode: string,
) => ({
  placeId: `place-${line1}`,
  text: { text: `${line1}, ${secondary}`, matches: [] },
  mainText: { text: line1, matches: [{ startOffset: 0, endOffset: 5 }] },
  secondaryText: { text: secondary, matches: [] },
  toPlace: () => ({
    fetchFields: vi.fn().mockResolvedValue(undefined),
    addressComponents: [
      { longText: line1.split(" ")[0], types: ["street_number"] },
      { longText: line1.split(" ").slice(1).join(" "), types: ["route"] },
      { longText: "Manchester", types: ["postal_town"] },
      { longText: postcode, types: ["postal_code"] },
      { longText: "Rusholme", types: ["sublocality_level_1"] },
    ],
    location: { toJSON: () => ({ lat: 53.45, lng: -2.22 }) },
  }),
});

let predictions: ReturnType<typeof buildPrediction>[] = [];

const fakePlaces = {
  AutocompleteSessionToken: class {},
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: vi.fn(async () => ({
      suggestions: predictions.map((placePrediction) => ({ placePrediction })),
    })),
  },
};

const BLOSSOM_STREET: AddressFinderValue = {
  line1: "14 Blossom Street",
  line2: "",
  town: "Manchester",
  postcode: "M4 6AJ",
  source: "pick",
};

const renderFinder = (onChange = vi.fn()) => {
  render(<AddressFinder idPrefix="t" onChange={onChange} />);

  return onChange;
};

/** Lets the 200ms search delay pass and Google's (fake) reply arrive. */
const waitForSearch = () => act(() => vi.advanceTimersByTimeAsync(250));

describe("AddressFinder", () => {
  beforeEach(() => {
    user = setupUser();
    vi.useFakeTimers();

    vi.mocked(useMapsLibrary).mockReturnValue(
      fakePlaces as unknown as ReturnType<typeof useMapsLibrary>,
    );

    predictions = [
      buildPrediction("12 Dickenson Road", "Manchester M14 5TQ, UK", "M14 5TQ"),
      buildPrediction("14 Dickenson Road", "Manchester M14 5TQ, UK", "M14 5TQ"),
    ];
  });

  afterEach(() => vi.useRealTimers());

  it("default: empty finder with label, placeholder and manual link", () => {
    renderFinder();

    expect(
      screen.getByRole("combobox", { name: "Address or postcode" }),
    ).toHaveAttribute("placeholder", "Start typing your address or postcode");

    expect(
      screen.getByRole("button", { name: "Enter address manually" }),
    ).toBeInTheDocument();

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("lists Google's UK address suggestions for the query", async () => {
    renderFinder();
    await user.type(screen.getByRole("combobox"), "dickenson");
    await waitForSearch();

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "12 Dickenson RoadManchester M14 5TQ, UK",
      "14 Dickenson RoadManchester M14 5TQ, UK",
    ]);

    expect(
      fakePlaces.AutocompleteSuggestion.fetchAutocompleteSuggestions,
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        input: "dickenson",
        includedRegionCodes: ["gb"],
      }),
    );
  });

  it("shows loading rows while Google is slow to answer", async () => {
    vi.mocked(
      fakePlaces.AutocompleteSuggestion.fetchAutocompleteSuggestions,
    ).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                suggestions: predictions.map((placePrediction) => ({
                  placePrediction,
                })),
              }),
            1000,
          ),
        ),
    );

    const { container } = render(
      <AddressFinder idPrefix="t" onChange={vi.fn()} />,
    );

    await user.type(screen.getByRole("combobox"), "dickenson");
    await act(() => vi.advanceTimersByTimeAsync(600));

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(
      container.querySelector('[aria-busy="true"]'),
    ).not.toBeInTheDocument();

    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("Escape closes the loading rows", async () => {
    vi.mocked(
      fakePlaces.AutocompleteSuggestion.fetchAutocompleteSuggestions,
    ).mockImplementationOnce(() => new Promise(() => {}));

    const { container } = render(
      <AddressFinder idPrefix="t" onChange={vi.fn()} />,
    );

    await user.type(screen.getByRole("combobox"), "dickenson");
    await act(() => vi.advanceTimersByTimeAsync(600));

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(
      container.querySelector('[aria-busy="true"]'),
    ).not.toBeInTheDocument();
  });

  it("no match: offers manual entry", async () => {
    predictions = [];
    renderFinder();
    await user.type(screen.getByRole("combobox"), "99 Nowhere Lane");
    await waitForSearch();

    expect(screen.getByRole("status")).toHaveTextContent(
      "We can’t find that address",
    );

    await user.click(screen.getByRole("button", { name: "Enter it manually" }));

    expect(screen.getByLabelText("Address line 1")).toHaveValue(
      "99 Nowhere Lane",
    );
  });

  it("Google failing to answer shows the manual-entry fallback", async () => {
    fakePlaces.AutocompleteSuggestion.fetchAutocompleteSuggestions.mockRejectedValueOnce(
      new Error("offline"),
    );

    renderFinder();
    await user.type(screen.getByRole("combobox"), "dickenson");
    await waitForSearch();

    expect(screen.getByRole("status")).toHaveTextContent(
      "We can’t find that address",
    );
  });

  it("a pick whose details can't be fetched opens manual entry", async () => {
    const [first] = predictions;

    predictions = [
      {
        ...first!,
        toPlace: () => ({
          ...first!.toPlace(),
          fetchFields: vi.fn().mockRejectedValue(new Error("quota")),
        }),
      },
    ];

    renderFinder();
    await user.type(screen.getByRole("combobox"), "12 dickenson road");
    await waitForSearch();
    await user.click(screen.getAllByRole("option")[0]!);
    await act(() => vi.advanceTimersByTimeAsync(30));

    expect(screen.getByLabelText("Address line 1")).toHaveValue(
      "12 dickenson road",
    );
  });

  it("summary: shows a saved address with Edit", () => {
    render(<AddressFinder idPrefix="t" value={BLOSSOM_STREET} />);

    expect(
      screen.getByRole("button", { name: "Edit address" }),
    ).toBeInTheDocument();

    expect(screen.getByText("14 Blossom Street")).toBeInTheDocument();
    expect(screen.getByText("M4 6AJ")).toBeInTheDocument();
  });

  it("manual: shows the four fields with line 2 optional", () => {
    render(
      <AddressFinder
        idPrefix="t"
        value={{ ...BLOSSOM_STREET, line2: "Flat 3", source: "manual" }}
      />,
    );

    expect(screen.getByLabelText("Address line 2 Optional")).toHaveValue(
      "Flat 3",
    );

    expect(screen.getByLabelText("Town/city")).toHaveValue("Manchester");
    expect(screen.getByLabelText("Postcode")).toHaveValue("M4 6AJ");
  });

  it("errors: asks for an address", () => {
    render(<AddressFinder idPrefix="t" showErrors />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter your address or postcode, or enter it manually",
    );
  });

  it("manual errors: shows each field error", async () => {
    render(<AddressFinder idPrefix="t" showErrors />);

    await user.click(
      screen.getByRole("button", { name: "Enter address manually" }),
    );

    await user.type(screen.getByLabelText("Postcode"), "M4 6");

    expect(
      screen.getAllByRole("alert").map((alert) => alert.textContent),
    ).toEqual([
      "Enter the first line of the address",
      "Enter a town or city",
      "Enter a real UK postcode, like M4 6AJ",
    ]);
  });

  it("keyboard: arrow down then Enter picks a suggestion with its location and moves focus to Edit", async () => {
    const onChange = renderFinder();
    const input = screen.getByRole("combobox");

    await user.type(input, "dickenson");
    await waitForSearch();
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", "t-opt-0");
    await user.keyboard("{Enter}");
    await act(() => vi.advanceTimersByTimeAsync(30));

    expect(onChange).toHaveBeenLastCalledWith({
      line1: "12 Dickenson Road",
      line2: "",
      town: "Manchester",
      postcode: "M14 5TQ",
      source: "pick",
      district: "M14",
      lat: 53.45,
      lng: -2.22,
      area: "Rusholme, M14",
    });

    expect(screen.getByRole("button", { name: "Edit address" })).toHaveFocus();
  });

  it("Escape closes the suggestions and the clear button empties the query", async () => {
    renderFinder();
    const input = screen.getByRole("combobox");

    await user.type(input, "dickenson");
    await waitForSearch();
    await user.type(input, "{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Clear address search" }),
    );

    expect(input).toHaveValue("");
  });

  it("manual entry formats the postcode on blur and can return to search", async () => {
    const onChange = renderFinder();

    await user.click(
      screen.getByRole("button", { name: "Enter address manually" }),
    );

    const postcode = screen.getByLabelText("Postcode");

    await user.type(postcode, "m146aj");
    expect(postcode).toHaveValue("M146AJ");
    await user.tab();
    expect(postcode).toHaveValue("M14 6AJ");

    await user.click(
      screen.getByRole("button", { name: "Search for your address instead" }),
    );

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
