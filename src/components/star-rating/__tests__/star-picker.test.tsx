import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { setupUser } from "../../../test/setup-user";
import { StarPicker } from "../star-picker";

const Picker = () => {
  const [value, setValue] = useState(0);

  return <StarPicker value={value} onChange={setValue} />;
};

describe("StarPicker", () => {
  it("is one tab stop, and arrow keys change the rating", async () => {
    const user = setupUser();

    render(<Picker />);
    await user.tab();

    expect(screen.getByRole("radio", { name: "1 star, Poor" })).toHaveFocus();

    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");

    const four = screen.getByRole("radio", { name: "4 stars, Very good" });

    expect(four).toHaveFocus();
    expect(four).toHaveAttribute("aria-checked", "true");

    expect(
      screen.getAllByRole("radio").filter(({ tabIndex }) => tabIndex === 0),
    ).toHaveLength(1);
  });
});
