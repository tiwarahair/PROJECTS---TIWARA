import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchSelect } from "..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

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

  it("opens a grouped list and filters by label or keyword", async () => {
    render(<SearchSelect options={TYPES} />);
    await user.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.getByText("Braids & Twists")).toBeInTheDocument();
    expect(screen.getByText("Natural Hair")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search"), "press");

    expect(
      screen.getByRole("button", { name: "Silk press" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Box braids" }),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search"));
    await user.type(screen.getByPlaceholderText("Search"), "zzz");

    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("keeps action rows visible and reports the picked label", async () => {
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

    await user.click(screen.getByRole("button", { name: "Select" }));

    await user.type(screen.getByPlaceholderText("Search"), "zzz");

    await user.click(screen.getByRole("button", { name: "+ New category" }));
    expect(handleChange).toHaveBeenCalledWith("+ New category");
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", async () => {
    render(<SearchSelect options={TYPES} />);
    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(document.body);
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("does not open when disabled", async () => {
    render(<SearchSelect options={TYPES} disabled />);
    await user.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });
});
