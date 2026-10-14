import { Calendar, Clock, CreditCard, Info, UserX } from "lucide-react";
import { describe, expect, it } from "vitest";
import policyIcons from "../../../data/policy-icons.json";
import { getPolicyLineIcon } from "../payment-policy-logic";

describe("getPolicyLineIcon", () => {
  it("matches each policy line's icon to its lucide icon", () => {
    expect(getPolicyLineIcon(policyIcons.payment)).toBe(CreditCard);
    expect(getPolicyLineIcon(policyIcons.calendar)).toBe(Calendar);
    expect(getPolicyLineIcon(policyIcons.late)).toBe(Clock);
    expect(getPolicyLineIcon(policyIcons.noShow)).toBe(UserX);
  });

  it("falls back to an info icon for an unknown line", () => {
    expect(getPolicyLineIcon("M0 0")).toBe(Info);
  });
});
