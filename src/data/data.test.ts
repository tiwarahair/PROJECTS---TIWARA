import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hasPrototype, loadPrototypeData, toPlain } from "../test/prototype";
import * as data from "./index";
import {
  findService,
  formatDuration,
  getCustomisationSummary,
  getFromPrice,
  getFromWithFee,
  getMenu,
  getServiceOptions,
  getSpec,
  hasStep2,
  matchTypes,
  slugify,
} from "../utils/services";
import { miles, nextAvailable, slotsFor } from "../utils/availability";
import { bookingFee, money, policyLines } from "../utils/pricing";
import {
  formatPostcode,
  getAddressLines,
  getAddressOneLine,
  getDistrict,
  getPostcodeGeo,
  hasFlatNumber,
  isAddressValid,
  isPostcodeValid,
  searchAddresses,
} from "../utils/address";
import { checkPassword, getPasswordView } from "../utils/password";
import type { Policy } from "../types/policy";

// The prototype's helpers are the reference implementation, so they stay untyped here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic reference object from vm
type Reference = any;

describe.skipIf(!hasPrototype)("data layer matches prototype data.js", () => {
  let proto: Reference;
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T09:15:00"));
    proto = loadPrototypeData();
  });
  afterAll(() => vi.useRealTimers());

  it("datasets are identical", () => {
    expect(data.stylists).toEqual(toPlain(proto.stylists));
    expect(data.reviews).toEqual(toPlain(proto.reviews));
    expect(data.faqs).toEqual(toPlain(proto.faqs));
    expect(data.chatMessages).toEqual(toPlain(proto.chat));
    expect(data.brandAssets).toEqual(toPlain(proto.assets));
    expect(data.serviceGroups).toEqual(toPlain(proto.serviceGroups));
    expect(data.serviceTypes).toEqual(toPlain(proto.serviceTypes));
    expect(data.platformCustomisations).toEqual(
      toPlain(proto.platformCustomisations),
    );
    expect(data.hairColours).toEqual(toPlain(proto.colours));
    expect(data.defaultAddons).toEqual(toPlain(proto.defaultAddons));
    expect(data.categoryColours).toEqual(toPlain(proto.categoryColours));
    expect(data.searchLocations).toEqual(toPlain(proto.locations));
    expect(data.postcodes).toEqual(toPlain(proto.postcodes));
    expect(data.demoAddresses).toEqual(toPlain(proto.addresses));
    expect(data.policyIcons).toEqual(toPlain(proto.policyIcons));
    expect(data.policyDefaults).toEqual(toPlain(proto.policyDefaults));
    expect(data.businessLabels).toEqual(toPlain(proto.services.businessLabel));
    expect(data.seedAddresses).toEqual(toPlain(proto.account.seedAddresses));
  });

  it("service helpers return identical output for every stylist and service", () => {
    data.stylists.forEach((stylist, index) => {
      const protoStylist = proto.stylists[index];
      expect(toPlain(getMenu(stylist))).toEqual(
        toPlain(proto.services.menu(protoStylist)),
      );
      stylist.services.forEach((service, serviceIndex) => {
        const protoService = protoStylist.services[serviceIndex];
        expect(toPlain(getServiceOptions(service))).toEqual(
          toPlain(proto.services.custOf(protoService)),
        );
        expect(hasStep2(service)).toBe(proto.services.hasStep2(protoService));
        expect(getFromPrice(service)).toBe(
          proto.services.fromPrice(protoService),
        );
        expect(getFromWithFee(service)).toBe(
          proto.services.fromWithFee(protoService),
        );
        expect(getCustomisationSummary(service)).toBe(
          proto.services.custSummary(protoService),
        );
        expect(findService(stylist, service.id)?.id).toBe(
          proto.services.findService(protoStylist, service.id)?.id,
        );
        expect(findService(stylist, service.name.toUpperCase())?.id).toBe(
          proto.services.findService(protoStylist, service.name.toUpperCase())
            ?.id,
        );
      });
    });
  });

  it("catalogue helpers match", () => {
    const names = [
      ...data.serviceTypes.map(({ name }) => name),
      "Something new",
      "Bespoke updo",
    ];
    names.forEach((name) => {
      expect(getSpec(name)).toEqual(toPlain(proto.services.spec(name)));
      expect(slugify(name)).toBe(proto.services.slugify(name));
    });
    [0, 10, 14, 15, 44.6, 45, 59, 60, 61, 90, 120, 135, 240, 245].forEach(
      (minutes) =>
        expect(formatDuration(minutes)).toBe(proto.services.dur(minutes)),
    );
    [
      "",
      "  ",
      "knot",
      "sew",
      "retwist",
      "press",
      "PONY",
      "box braids",
      "relaxer",
      "zzz",
      "loc",
    ].forEach((query) =>
      expect(toPlain(matchTypes(query))).toEqual(
        toPlain(proto.services.matchTypes(query)),
      ),
    );
  });

  it("availability matches over two weeks", () => {
    data.stylists.forEach((stylist, index) => {
      const protoStylist = proto.stylists[index];
      for (let offset = 0; offset < 14; offset++) {
        const day = new Date(2026, 9, 9 + offset);
        [30, 60, 120, 240, 300].forEach((mins) =>
          expect(slotsFor(stylist, day, mins)).toEqual(
            toPlain(proto.services.slotsFor(protoStylist, day, mins)),
          ),
        );
      }
      [60, 240, 600].forEach((mins) =>
        expect(toPlain(nextAvailable(stylist, mins))).toEqual(
          toPlain(proto.services.nextAvailable(protoStylist, mins)),
        ),
      );
      expect(toPlain(nextAvailable(stylist, 600, "2026-10-12", 3))).toEqual(
        toPlain(
          proto.services.nextAvailable(protoStylist, 600, "2026-10-12", 3),
        ),
      );
    });
    expect(miles(53.4808, -2.2426, 53.4166, -2.231)).toBe(
      proto.services.miles(53.4808, -2.2426, 53.4166, -2.231),
    );
  });

  it("fees, money and policy lines match", () => {
    [0, 1, 9.99, 30, 45, 45.5, 56.33, 100, 133.335, 250].forEach((amount) => {
      expect(bookingFee(amount)).toBe(proto.bookingFee(amount));
      expect(money(amount)).toBe(proto.money(amount));
    });
    const variants: Partial<Policy>[] = [
      {},
      { mode: "full" },
      { mode: "card" },
      { mode: "none" },
      { refundable: false },
      { freeWindowHrs: 0 },
      { freeWindowHrs: 1 },
      { graceMins: 15 },
      {
        late: { on: true, kind: "pct", pct: 10 },
        noShow: { on: true, kind: "pct", pct: 20 },
      },
      {
        late: { on: true, kind: "pct", pct: 50 },
        noShow: { on: true, kind: "pct", pct: 100 },
      },
      {
        late: { on: true, kind: "keep", pct: 50 },
        noShow: { on: true, kind: "keep", pct: 50 },
      },
      {
        refundable: false,
        late: { on: true, kind: "pct", pct: 10 },
        noShow: { on: true, kind: "pct", pct: 150 },
      },
      {
        mode: "full",
        late: { on: true, kind: "pct", pct: 50 },
        noShow: { on: true, kind: "pct", pct: 100 },
        graceMins: 10,
      },
      {
        mode: "card",
        late: { on: true, kind: "pct", pct: 25 },
        noShow: { on: true, kind: "pct", pct: 50 },
      },
      { extras: [{ text: "  Bring your own hair  " }, { text: " " }] },
    ];
    const policies: Policy[] = [
      ...data.stylists.map(({ policies }) => policies),
      ...variants.map((variant) => ({ ...data.policyDefaults, ...variant })),
    ];
    policies.forEach((policy) =>
      [20, 45, 120, 133.33].forEach((price) =>
        expect(toPlain(policyLines(policy, price, "Amara"))).toEqual(
          toPlain(proto.policyLines(policy, price, "Amara")),
        ),
      ),
    );
  });

  it("address finder and postcode helpers match", () => {
    const queries = [
      "",
      "ab",
      "14 b",
      "blossom",
      "blosom",
      "blossom st",
      "dickenson",
      "dikenson",
      "flat 2",
      "M14",
      "M14 5",
      "m4 6aj",
      "WA14",
      "BL1 4QR",
      "M1",
      "wilmslow",
      "manchester",
      "salford quays",
      "apartment",
      "zzz street",
      "12",
      "42 nowhere",
    ];
    queries.forEach((query) =>
      expect(toPlain(searchAddresses(query))).toEqual(
        toPlain(proto.address.search(query)),
      ),
    );
    const postcodeInputs = [
      "m14 5tq",
      "M145TQ",
      "WA142LX",
      "M1",
      "bad",
      "",
      "SW1A 1AA",
      "M20",
    ];
    postcodeInputs.forEach((code) => {
      expect(formatPostcode(code)).toBe(proto.address.fmtPc(code));
      expect(isPostcodeValid(code)).toBe(proto.address.pcOk(code));
      expect(getDistrict(code)).toBe(proto.address.district(code));
      expect(getPostcodeGeo(code)).toEqual(toPlain(proto.address.geo(code)));
    });
    const addresses = [
      null,
      {
        line1: "12 Dickenson Road",
        line2: "",
        town: "Manchester",
        postcode: "m14 5tq",
      },
      { line1: "Flat 3", line2: "", town: "Manchester", postcode: "M14 5TQ" },
      { line1: "Unit 4", line2: "Floor 2", town: "", postcode: "M1 1JA" },
      { line1: "  ", line2: "Apartment 7", town: "Manchester", postcode: "M1" },
    ];
    addresses.forEach((address) => {
      expect(isAddressValid(address)).toBe(proto.address.valid(address));
      expect(getAddressLines(address)).toEqual(
        toPlain(proto.address.lines(address)),
      );
      expect(getAddressOneLine(address)).toBe(proto.address.oneLine(address));
      expect(hasFlatNumber(address)).toBe(proto.address.hasNumber(address));
    });
  });

  it("password rules and meter view match (before zxcvbn loads)", () => {
    const people = {
      first: "Nia",
      last: "Okafor",
      email: "nia.okafor@gmail.com",
    };
    const passwords = [
      "",
      "short",
      "password1",
      "Pass Word1",
      "niaokafor",
      "Nia-Okafor-2026",
      "okafornia!!",
      "Tiwara's House",
      "tiwarashouse",
      "correct horse battery staple",
      "é".repeat(16),
      "x".repeat(65),
      "sunflower9",
    ];
    passwords.forEach((password) =>
      [{}, { min: 8 }, people, { ...people, min: 8 }].forEach((options) => {
        const ours = checkPassword(password, options);
        const theirs = proto.password.check(password, options);
        expect(toPlain(ours)).toEqual(toPlain(theirs));
        [
          {},
          { dark: true },
          { show: true },
          { dark: true, show: true, errColor: "#fff" },
        ].forEach((viewOptions) =>
          expect(toPlain(getPasswordView(ours, viewOptions))).toEqual(
            toPlain(proto.password.view(theirs, viewOptions)),
          ),
        );
      }),
    );
  });
});
