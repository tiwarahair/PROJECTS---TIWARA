import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sessionChanged } from "../../../stores/session-slice";
import { renderWithStore } from "../../../test/render-with-store";
import { StudioRoute } from "../studio-route";

describe("StudioRoute", () => {
  it("sends signed-out visitors to the stylist log in", () => {
    const { store } = renderWithStore(<StudioRoute />, "/studio");

    act(() => {
      store.dispatch(sessionChanged(null));
    });

    expect(screen.getByTestId("location")).toHaveTextContent("/login?flow=pro");
  });

  it("sends signed-in customers to the stylist landing", () => {
    renderWithStore(<StudioRoute />, "/studio", { signedIn: true });

    expect(screen.getByTestId("location")).toHaveTextContent("/join");
  });

  it("dev boards open the demo Studio without signing in", () => {
    renderWithStore(<StudioRoute />, "/studio?board=true");

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/studio?board=true",
    );
  });
});
