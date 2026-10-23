import { render, screen, waitFor } from "@testing-library/react";
import { ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { setupUser } from "../../test/setup-user";
import { ActionMenuButton } from "../action-menu";
import { CountTabs } from "../count-tabs";
import { SortMenu } from "../sort-menu";

const TABS = [
  { id: "open" as const, label: "Open", count: 3 },
  { id: "decided" as const, label: "Decided", count: 1 },
];

const Tabs = () => {
  const [active, setActive] = useState<"open" | "decided">("open");

  return (
    <CountTabs
      label="Reports"
      idPrefix="test"
      tabs={TABS}
      active={active}
      onChange={setActive}
    />
  );
};

const SORTS = [
  ["oldest", "Oldest first"],
  ["newest", "Newest first"],
] as const;

const Sort = ({ onPick }: { onPick: (key: string) => void }) => {
  const [isOpen, setOpen] = useState(false);

  return (
    <SortMenu
      label="Sort"
      ariaLabel="Sort reports"
      options={SORTS}
      value="oldest"
      isOpen={isOpen}
      onToggle={() => setOpen(!isOpen)}
      onClose={() => setOpen(false)}
      onPick={(key) => {
        onPick(key);
        setOpen(false);
      }}
    />
  );
};

describe("shared menus", () => {
  it("moves between count tabs with the arrow keys", async () => {
    const user = setupUser();

    render(<Tabs />);

    expect(screen.getByRole("tab", { name: /^Open/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    screen.getByRole("tab", { name: /^Open/ }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: /^Decided/ })).toHaveFocus();

    expect(screen.getByRole("tab", { name: /^Decided/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the sort pill's choice and picks another", async () => {
    const user = setupUser();
    const onPick = vi.fn();

    render(<Sort onPick={onPick} />);

    await user.click(
      screen.getByRole("button", { name: "Sort: Oldest first" }),
    );

    await user.click(screen.getByRole("option", { name: "Newest first" }));

    expect(onPick).toHaveBeenCalledWith("newest");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("runs an action menu item and closes", async () => {
    const user = setupUser();
    const onDecide = vi.fn();

    render(
      <ActionMenuButton
        label="More actions"
        title="Tola’s review"
        subtitle="About Crowned by Kemi"
        isVertical
        items={[{ label: "Decide", icon: ClipboardCheck, run: onDecide }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Decide" }));

    await waitFor(() => expect(onDecide).toHaveBeenCalled());

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
  });

  it("closes only the action menu on Escape", async () => {
    const user = setupUser();
    const onKey = vi.fn();

    window.addEventListener("keydown", onKey);

    render(
      <ActionMenuButton
        label="More actions"
        title="Tola’s review"
        subtitle="About Crowned by Kemi"
        items={[{ label: "Decide", icon: ClipboardCheck, run: vi.fn() }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );

    expect(onKey).not.toHaveBeenCalled();
    window.removeEventListener("keydown", onKey);
  });

  it("keeps an action menu open when it's reopened while closing", async () => {
    const user = setupUser();

    render(
      <ActionMenuButton
        label="More actions"
        title="Tola’s review"
        subtitle="About Crowned by Kemi"
        items={[{ label: "Decide", icon: ClipboardCheck, run: vi.fn() }]}
      />,
    );

    const button = screen.getByRole("button", { name: "More actions" });

    await user.click(button);
    await user.keyboard("{Escape}");
    await user.click(button);
    await new Promise((resolve) => window.setTimeout(resolve, 300));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
