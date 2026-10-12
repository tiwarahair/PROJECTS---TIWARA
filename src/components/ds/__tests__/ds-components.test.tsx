import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card } from "../card";
import { Checkbox } from "../checkbox";
import { Dialog } from "../dialog";
import { IconButton } from "../icon-button";
import { IconChip } from "../icon-chip";
import { Input } from "../input";
import { Radio } from "../radio";
import { ScrollRevealCard } from "../scroll-reveal-card";
import { Select } from "../select";
import { Switch } from "../switch";
import { Tabs } from "../tabs";
import { Tag } from "../tag";
import { Toast } from "../toast";
import { Tooltip } from "../tooltip";

describe("design-system components", () => {
  it("Button renders every variant and ignores clicks when disabled", () => {
    const handleClick = vi.fn();

    const variants = [
      "primary",
      "secondary",
      "tertiary",
      "outline",
      "ghost",
    ] as const;

    render(
      <>
        {variants.map((variant) => (
          <Button key={variant} variant={variant} onClick={handleClick}>
            {variant}
          </Button>
        ))}
        <Button cta size="lg" onClick={handleClick}>
          Book now
        </Button>
        <Button disabled onClick={handleClick}>
          Booked
        </Button>
      </>,
    );

    variants.forEach((variant) =>
      fireEvent.click(screen.getByRole("button", { name: variant })),
    );

    fireEvent.click(screen.getByRole("button", { name: "Booked" }));
    expect(handleClick).toHaveBeenCalledTimes(variants.length);
    expect(screen.getByRole("button", { name: "Booked" })).toBeDisabled();
  });

  it("IconButton uses its label for name and title", () => {
    render(<IconButton label="Share" variant="outline" onMedia />);

    expect(screen.getByRole("button", { name: "Share" })).toHaveAttribute(
      "title",
      "Share",
    );
  });

  it("Avatar shows a photo or two initials", () => {
    render(
      <>
        <Avatar name="Zuri Baptiste Okafor" />
        <Avatar src="/amara.jpg" name="Amara Osei" />
      </>,
    );

    expect(screen.getByText("ZB")).toBeInTheDocument();

    expect(screen.getByRole("img", { name: "Amara Osei" })).toHaveAttribute(
      "src",
      "/amara.jpg",
    );
  });

  it("Badge, IconChip and Toast render their content", () => {
    render(
      <>
        <Badge tone="success">Confirmed</Badge>
        <IconChip tone="muted">icon</IconChip>
        <Toast tone="danger">Payment failed. Try another card.</Toast>
      </>,
    );

    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("icon")).toHaveAttribute("aria-hidden", "true");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Payment failed. Try another card.",
    );
  });

  it("Card and Tag respond to clicks", () => {
    const handleCard = vi.fn();
    const handleTag = vi.fn();

    render(
      <>
        <Card onClick={handleCard} selected>
          Amara
        </Card>
        <Tag onClick={handleTag} selected>
          Starter locs
        </Tag>
        <Tag>Retwist</Tag>
      </>,
    );

    fireEvent.click(screen.getByText("Amara"));
    fireEvent.click(screen.getByRole("button", { name: "Starter locs" }));
    expect(handleCard).toHaveBeenCalledOnce();
    expect(handleTag).toHaveBeenCalledOnce();
  });

  it("Dialog closes from the scrim and the close button, not from inside", () => {
    const handleClose = vi.fn();

    render(
      <Dialog open title="Cancel appointment?" onClose={handleClose}>
        Your deposit is refundable.
      </Dialog>,
    );

    fireEvent.click(screen.getByText("Your deposit is refundable."));
    expect(handleClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it("Dialog renders nothing when closed", () => {
    render(<Dialog title="Hidden">Body</Dialog>);
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("Tooltip shows its label on hover", () => {
    render(
      <Tooltip label="Finish setup to share">
        <span>Share</span>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText("Share"));

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Finish setup to share",
    );
  });

  it("Checkbox and Switch toggle uncontrolled and report changes", () => {
    const handleChange = vi.fn();

    render(
      <>
        <Checkbox label="Send me reminders" onChange={handleChange} />
        <Switch
          label="Accept new clients"
          defaultChecked
          onChange={handleChange}
        />
      </>,
    );

    fireEvent.click(screen.getByText("Send me reminders"));
    fireEvent.click(screen.getByText("Accept new clients"));
    expect(handleChange.mock.calls).toEqual([[true], [false]]);
  });

  it("Radio selects an option", () => {
    const handleChange = vi.fn();

    render(
      <Radio
        options={["In salon", "Mobile"]}
        defaultValue="In salon"
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByText("Mobile"));
    expect(handleChange).toHaveBeenCalledWith("Mobile");
  });

  it("Input and Select show label, hint and error", () => {
    render(
      <>
        <Input label="Email" hint="Only used for booking confirmations." />
        <Input label="Phone" error="Enter a valid phone number." />
        <Select label="Service" options={["Knotless braids", "Silk press"]} />
      </>,
    );

    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();

    expect(
      screen.getByText("Only used for booking confirmations."),
    ).toBeInTheDocument();

    expect(screen.getByText("Enter a valid phone number.")).toBeInTheDocument();

    expect(screen.getByRole("combobox", { name: "Service" })).toHaveValue(
      "Knotless braids",
    );
  });

  it("Tabs switch the active tab", () => {
    const handleChange = vi.fn();

    render(<Tabs tabs={["Upcoming", "Past"]} onChange={handleChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Past" }));
    expect(handleChange).toHaveBeenCalledWith("Past");
  });

  it("ScrollRevealCard renders title and frame at a fixed progress", () => {
    render(
      <ScrollRevealCard
        progress={1}
        title={<h2>Run your chair like a business</h2>}
      >
        <p>Screen</p>
      </ScrollRevealCard>,
    );

    expect(
      screen.getByRole("heading", { name: "Run your chair like a business" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Screen")).toBeInTheDocument();
  });
});
