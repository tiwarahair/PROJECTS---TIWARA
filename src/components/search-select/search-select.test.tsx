import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchSelect } from "./search-select";

const TYPES = [
  {
    label: "Knotless braids",
    group: "Braids & Twists",
    keywords: ["knotless"],
  },
  { label: "Box braids", group: "Braids & Twists" },
  { label: "Silk press", group: "Natural Hair", keywords: ["press"] },
];

describe("SearchSelect", () => {
  it("shows the placeholder, or the value in sentence case", () => {
    const { rerender } = render(
      <SearchSelect
        options={["deep conditioning"]}
        placeholder="No category"
      />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("No category");
    rerender(
      <SearchSelect
        options={["deep conditioning"]}
        value="deep conditioning"
      />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("Deep conditioning");
  });

  it("opens a grouped list and filters by label or keyword", () => {
    render(<SearchSelect options={TYPES} />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.getByText("Braids & Twists")).toBeInTheDocument();
    expect(screen.getByText("Natural Hair")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "press" },
    });
    expect(
      screen.getByRole("button", { name: "Silk press" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Box braids" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("keeps action rows visible and reports the picked label", () => {
    const handleChange = vi.fn();
    render(
      <SearchSelect
        options={[
          "Signature braids",
          { label: "+ New category", action: true },
        ]}
        onChange={handleChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "zzz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ New category" }));
    expect(handleChange).toHaveBeenCalledWith("+ New category");
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", () => {
    render(<SearchSelect options={TYPES} />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("does not open when disabled", () => {
    render(<SearchSelect options={TYPES} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });
});
