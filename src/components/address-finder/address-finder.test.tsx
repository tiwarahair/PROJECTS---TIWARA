import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressFinder } from "./address-finder";
import type { AddressFixture } from "./use-address-finder";

const renderFinder = (fixture: AddressFixture = "", onChange = vi.fn()) => {
  render(<AddressFinder fixture={fixture} idPrefix="t" onChange={onChange} />);

  return onChange;
};

describe("AddressFinder", () => {
  beforeEach(() => vi.useFakeTimers());
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

  it("typing: highlights matches for the query", () => {
    renderFinder("typing");
    const options = screen.getAllByRole("option");

    expect(options[0]).toHaveTextContent("14 Blossom Street");

    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("postcode: lists addresses in the postcode district", () => {
    renderFinder("postcode");

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "12 Dickenson RoadManchester, M14 5TQ",
      "14 Dickenson Road, Flat 2Manchester, M14 5TQ",
      "27 Heald PlaceManchester, M14 5TL",
      "118 Wilmslow Road, Unit 4Manchester, M14 5AJ",
    ]);
  });

  it("typo: still finds Blossom Street", () => {
    renderFinder("typo");

    expect(screen.getAllByRole("option")[0]).toHaveTextContent(
      "14 Blossom Street",
    );
  });

  it("nomatch: offers manual entry", () => {
    renderFinder("nomatch");

    expect(screen.getByRole("status")).toHaveTextContent(
      "We can’t find that address",
    );

    fireEvent.click(screen.getByRole("button", { name: "Enter it manually" }));

    expect(screen.getByLabelText("Address line 1")).toHaveValue(
      "99 Nowhere Lane",
    );
  });

  it("summary: shows the picked address and reports it once", () => {
    const onChange = renderFinder("summary");

    expect(
      screen.getByRole("button", { name: "Edit address" }),
    ).toBeInTheDocument();

    expect(screen.getByText("14 Blossom Street")).toBeInTheDocument();
    expect(screen.getByText("M4 6AJ")).toBeInTheDocument();

    expect(onChange).toHaveBeenCalledWith({
      line1: "14 Blossom Street",
      line2: "",
      town: "Manchester",
      postcode: "M4 6AJ",
      source: "pick",
      district: "M4",
      lat: 53.484,
      lng: -2.227,
    });
  });

  it("manual: shows the four fields with line 2 optional", () => {
    renderFinder("manual");

    expect(screen.getByLabelText("Address line 2 Optional")).toHaveValue(
      "Flat 3",
    );

    expect(screen.getByLabelText("Town/city")).toHaveValue("Manchester");
    expect(screen.getByLabelText("Postcode")).toHaveValue("M4 6AJ");
  });

  it("errors: asks for an address", () => {
    renderFinder("errors");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter your address or postcode, or enter it manually",
    );
  });

  it("manual-errors: shows each field error", () => {
    renderFinder("manual-errors");

    expect(
      screen.getAllByRole("alert").map((alert) => alert.textContent),
    ).toEqual([
      "Enter the first line of the address",
      "Enter a town or city",
      "Enter a real UK postcode, like M4 6AJ",
    ]);
  });

  it("keyboard: arrow down then Enter picks a suggestion and moves focus to Edit", () => {
    const onChange = renderFinder();
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "dickenson" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "t-opt-0");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ line1: "12 Dickenson Road", source: "pick" }),
    );

    act(() => vi.advanceTimersByTime(30));
    expect(screen.getByRole("button", { name: "Edit address" })).toHaveFocus();
  });

  it("Escape closes the suggestions and the clear button empties the query", () => {
    renderFinder("typing");
    const input = screen.getByRole("combobox");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Clear address search" }),
    );

    expect(input).toHaveValue("");
  });

  it("manual entry formats the postcode on blur and can return to search", () => {
    const onChange = renderFinder();

    fireEvent.click(
      screen.getByRole("button", { name: "Enter address manually" }),
    );

    const postcode = screen.getByLabelText("Postcode");

    fireEvent.change(postcode, { target: { value: "m146aj" } });
    expect(postcode).toHaveValue("M146AJ");
    fireEvent.blur(postcode);
    expect(postcode).toHaveValue("M14 6AJ");

    fireEvent.click(
      screen.getByRole("button", { name: "Search for your address instead" }),
    );

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
