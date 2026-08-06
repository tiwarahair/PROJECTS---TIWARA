import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { App } from "./app";
import {
  installFakeIntersectionObserver,
  renderWithRouter,
  type FakeIntersectionObserver,
} from "./test/helpers";

let observer: FakeIntersectionObserver;
// jsdom has no layout, so scrollIntoView is absent until a test supplies one.
const noScroll = () => {};

beforeEach(() => {
  observer = installFakeIntersectionObserver();
  Element.prototype.scrollIntoView = noScroll;
  window.scrollTo = noScroll;
});
afterEach(() => observer.restore());

/** Pages mount only when active, so presence is the test. */
const present = (domId: string) => document.getElementById(domId) !== null;
/** Overlays are always mounted; `.open` is what shows them. */
const isOpen = (domId: string) =>
  document.getElementById(domId)?.classList.contains("open") ?? false;

describe("pages", () => {
  it.each([
    ["/search", "searchPage"],
    ["/shop", "shopPage"],
    ["/about-us", "aboutPage"],
    ["/for-stylists", "stylistsPage"],
    ["/tiwaras-house", "profilePage"],
  ])("renders %s", (route, domId) => {
    renderWithRouter(<App />, route);
    expect(present(domId)).toBe(true);
  });

  it("renders the landing page on /", () => {
    renderWithRouter(<App />, "/");

    expect(document.getElementById("mainNav")).not.toBeNull();
    expect(present("shopPage")).toBe(false);
    expect(present("searchPage")).toBe(false);
  });

  // The point of the change: a page replaces what came before rather than
  // sliding over a still-mounted stack.
  it("replaces the landing page rather than covering it", () => {
    renderWithRouter(<App />, "/shop");

    expect(present("shopPage")).toBe(true);
    expect(present("searchPage")).toBe(false);
    expect(present("aboutPage")).toBe(false);
    expect(document.querySelector(".hero")).toBeNull();
  });

  it("does not slide, and does not lock body scroll", () => {
    renderWithRouter(<App />, "/shop");

    expect(document.getElementById("shopPage")?.className).toBe("pg-overlay");
    expect(document.body.style.overflow).toBe("");
  });

  it("puts the site header on every page", () => {
    for (const route of ["/search", "/shop", "/about-us", "/for-stylists"]) {
      const { unmount } = renderWithRouter(<App />, route);
      const nav = document.getElementById("mainNav");
      expect(nav, route).not.toBeNull();
      // Cream-on-transparent would be invisible against a cream page.
      expect(nav?.classList.contains("scrolled"), route).toBe(true);
      unmount();
    }
  });

  it("has no close button anywhere", () => {
    for (const route of ["/search", "/shop", "/about-us", "/tiwaras-house"]) {
      const { unmount } = renderWithRouter(<App />, route);
      expect(document.querySelector(".pg-close"), route).toBeNull();
      expect(document.querySelector(".sr-back"), route).toBeNull();
      expect(document.querySelector(".prof-back"), route).toBeNull();
      unmount();
    }
  });

  it("filters the results from the query string", () => {
    renderWithRouter(<App />, "/search?style=locs");

    // Tiwara's House and NaturallyNia are the two tagged for locs.
    expect(screen.getByText("2 stylists")).toBeInTheDocument();
    expect(
      document.querySelector<HTMLSelectElement>(".sr-filter-select")?.value,
    ).toBe("locs");
  });
});

describe("the stylist profile page", () => {
  it("renders the slug's stylist", () => {
    renderWithRouter(<App />, "/naturally-nia");

    expect(document.querySelector(".prof-name")?.textContent).toBe(
      "NaturallyNia",
    );
  });

  // A stylist's page is their storefront: no site nav, no top bar. The
  // powered-by wordmark is the only way back to the platform.
  it("has no site header and no top bar", () => {
    renderWithRouter(<App />, "/naturally-nia");

    expect(document.getElementById("mainNav")).toBeNull();
    expect(document.querySelector(".prof-nav")).toBeNull();
    expect(document.querySelector(".prof-book-top")).toBeNull();
  });

  it("links home from the powered-by wordmark", () => {
    renderWithRouter(<App />, "/naturally-nia");

    const mark = document.querySelector(".prof-powered-mark");
    expect(mark?.getAttribute("href")).toBe("/");
    expect(document.querySelector(".prof-powered")?.textContent).toContain(
      "Powered by",
    );
  });

  it("keeps the booking CTA", () => {
    renderWithRouter(<App />, "/naturally-nia");
    expect(document.querySelector(".prof-cta-btn")).not.toBeNull();
  });
});

describe("overlays", () => {
  it.each([
    ["/hair-quiz", "hairQuizPage"],
    ["/style-discovery", "aiDiscovery"],
    ["/book/style", "bookingPage"],
  ])("opens %s and locks body scroll", (route, domId) => {
    renderWithRouter(<App />, route);

    expect(isOpen(domId)).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("stays mounted but closed on a page route", () => {
    renderWithRouter(<App />, "/shop");

    expect(present("bookingPage")).toBe(true);
    expect(isOpen("bookingPage")).toBe(false);
  });

  it("falls back to the landing page when deep-linked", () => {
    renderWithRouter(<App />, "/book/style");

    // Nothing to slide over on a cold link, so the landing sits behind.
    expect(document.querySelector(".hero")).not.toBeNull();
  });
});

describe("an overlay slides over the page it was opened from", () => {
  it("keeps the shop behind a booking started there", () => {
    const { navigate } = renderWithRouter(<App />, "/shop");
    navigate("/book/style?service=braids");

    expect(isOpen("bookingPage")).toBe(true);
    expect(present("shopPage")).toBe(true);
    // Not the landing — that was the bug this replaced.
    expect(document.querySelector(".hero")).toBeNull();
  });

  it("keeps search behind, still filtered", () => {
    const { navigate } = renderWithRouter(<App />, "/search?style=locs");
    navigate("/book/style?service=braids");

    expect(present("searchPage")).toBe(true);
    // Without the frozen location this reads the booking URL and resets to 4.
    expect(screen.getByText("2 stylists")).toBeInTheDocument();
  });

  it("drops the backdrop again once the overlay is left", () => {
    const { navigate } = renderWithRouter(<App />, "/shop");
    navigate("/book/style");
    navigate("/about-us");

    expect(present("aboutPage")).toBe(true);
    expect(present("shopPage")).toBe(false);
    expect(isOpen("bookingPage")).toBe(false);
  });
});

describe("leaving a booking", () => {
  const stepPanel = (title: string) =>
    [...document.querySelectorAll(".bp-step-panel.active .bp-step-title")].some(
      (node) => node.textContent === title,
    );

  // Each step pushes a history entry so back-swipe is wizard-back. That made
  // navigate(-1) land on the previous step instead of leaving.
  it("leaves the flow from the confirmation screen, not back to review", () => {
    const { navigate } = renderWithRouter(<App />, "/shop");
    navigate("/book/style?service=braids");
    navigate("/book/review?service=braids");
    navigate("/book/confirmation?service=braids");

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(isOpen("bookingPage")).toBe(false);
    expect(present("shopPage")).toBe(true);
    expect(stepPanel("Review & pay")).toBe(false);
  });

  it("exits from the header Back rather than stepping back one panel", () => {
    const { navigate } = renderWithRouter(<App />, "/search?style=locs");
    navigate("/book/style?service=locs");
    navigate("/book/customise?service=locs");

    fireEvent.click(document.querySelector(".bp-back")!);

    expect(isOpen("bookingPage")).toBe(false);
    expect(present("searchPage")).toBe(true);
  });

  it("goes home when the booking was deep-linked", () => {
    renderWithRouter(<App />, "/book/confirmation");

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(isOpen("bookingPage")).toBe(false);
    expect(document.querySelector(".hero")).not.toBeNull();
  });
});

describe("landing hash anchors", () => {
  // Not verifiable in a real browser pane: scrollIntoView is a no-op and
  // requestAnimationFrame never fires while the tab is backgrounded.
  it("scrolls to the hash target, after the scroll lock is released", async () => {
    const scrolled: Array<{ id: string; overflow: string }> = [];
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
      scrolled.push({ id: this.id, overflow: document.body.style.overflow });
    };

    renderWithRouter(<App />, "/#services");

    // `overflow: ""` is the assertion that matters: scrolling before the lock
    // is released silently does nothing.
    await waitFor(() =>
      expect(scrolled).toEqual([{ id: "services", overflow: "" }]),
    );
  });

  it("does nothing without a hash", async () => {
    const scrolled: string[] = [];
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
      scrolled.push(this.id);
    };

    renderWithRouter(<App />, "/");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(scrolled).toEqual([]);
  });
});

describe("the booking step in the URL", () => {
  const activeStep = () =>
    document.querySelector(".bp-step-panel.active .bp-step-title")?.textContent;

  // Surfaces are not rendered inside a <Route>, so there is no route match and
  // useParams() would read nothing here — the step must come from the path.
  it.each([
    ["/book/service", "Choose your service"],
    ["/book/style?service=braids", "Choose your style"],
    ["/book/when-where?service=braids", "When & where?"],
    ["/book/customise?service=braids", "Customise your look"],
    ["/book/date-time?service=braids", "Choose a date & time"],
  ])("shows the panel named by %s", (route, title) => {
    renderWithRouter(<App />, route);
    expect(activeStep()).toBe(title);
  });

  // Every later step describes a service, so without one there is nothing to
  // show and the flow starts at the question instead.
  it("falls back to the service step when the URL names no service", () => {
    renderWithRouter(<App />, "/book/customise");
    expect(activeStep()).toBe("Choose your service");
  });

  // Amara does wigs, natural hair and treatments — never braids.
  it("falls back when the URL names a service the stylist does not offer", () => {
    renderWithRouter(
      <App />,
      "/book/style?service=braids&stylist=amara-beauty",
    );
    expect(activeStep()).toBe("Choose your service");
  });

  it("shows seven dots when a stylist is already chosen", () => {
    renderWithRouter(
      <App />,
      "/book/style?service=braids&stylist=tiwaras-house",
    );
    expect(document.querySelectorAll(".bp-step-dot")).toHaveLength(7);
  });

  it("shows nine dots otherwise", () => {
    renderWithRouter(<App />, "/book/style?service=braids");
    expect(document.querySelectorAll(".bp-step-dot")).toHaveLength(9);
  });

  // Treatments have no length, size or colour to pick, so that step goes.
  it("drops the customise dot for a service with nothing to customise", () => {
    renderWithRouter(<App />, "/book/style?service=treatments");
    expect(document.querySelectorAll(".bp-step-dot")).toHaveLength(8);
  });

  // The style step auto-advances, so Back is its only nav control — and it is
  // the only way to reach the service step from inside the flow.
  it("steps back from the style step to the service step", () => {
    renderWithRouter(<App />, "/book/style?service=braids");

    const panel = document.querySelector(".bp-step-panel.active")!;
    fireEvent.click(panel.querySelector(".bp-btn-back")!);

    expect(activeStep()).toBe("Choose your service");
  });

  it("marks the dot for the step the URL points at", () => {
    renderWithRouter(<App />, "/book/date-time?service=braids");

    const dots = [...document.querySelectorAll(".bp-step-dot")];
    expect(dots.findIndex((dot) => dot.classList.contains("active"))).toBe(5);
    expect(dots.filter((dot) => dot.classList.contains("done"))).toHaveLength(
      5,
    );
  });
});

describe("unknown paths", () => {
  it("shows the 404 page for a mistyped stylist slug", () => {
    renderWithRouter(<App />, "/tiwaras-hous");

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(present("profilePage")).toBe(false);
  });

  it("shows the 404 page for a path that matches nothing", () => {
    renderWithRouter(<App />, "/nonsense");
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("treats a reserved slug as not found rather than a stylist", () => {
    renderWithRouter(<App />, "/privacy");
    expect(screen.getByText("404")).toBeInTheDocument();
  });
});
