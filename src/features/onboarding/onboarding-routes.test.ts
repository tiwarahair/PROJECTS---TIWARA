import { describe, expect, it } from "vitest";
import {
  getRouteForPath,
  getScreenPath,
  isScreenOnRoute,
} from "./onboarding-routes";

describe("onboarding routes", () => {
  it("maps paths to routes", () => {
    expect(getRouteForPath("/login")).toBe("login");
    expect(getRouteForPath("/signup")).toBe("signup");
    expect(getRouteForPath("/join")).toBe("join");
    expect(getRouteForPath("/onboarding")).toBeNull();
  });

  it("knows which routes show each screen, and where a screen opens from elsewhere", () => {
    expect(isScreenOnRoute("verify", "join")).toBe(true);
    expect(isScreenOnRoute("cust-email", "signup")).toBe(true);
    expect(isScreenOnRoute("welcome", "login")).toBe(false);
    expect(isScreenOnRoute("pro-password", "login")).toBe(true);
    expect(getScreenPath("cust-create")).toBe("/signup");
    expect(getScreenPath("w3")).toBe("/join");
    expect(getScreenPath("pro-2fa")).toBe("/login");
  });
});
