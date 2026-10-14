import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  hasPrototype,
  loadPrototypeData,
  renameKeys,
  toAssetPaths,
  toPlain,
} from "../../test/prototype";
import * as data from "../index";
import {
  findService,
  formatServiceDuration,
  getCustomisationSummary,
  getFromPrice,
  getFromWithFee,
  getMenu,
  getServiceOptions,
  getSpec,
  hasStep2,
  matchTypes,
} from "../../utils/services";
import { miles, slotsFor } from "../../utils/availability";
import { bookingFee, policyLines } from "../../utils/pricing";
import {
  formatPostcode,
  getAddressLines,
  getAddressOneLine,
  getDistrict,
  isAddressValid,
  isPostcodeValid,
} from "../../utils/address";
import { checkPassword, getPasswordView } from "../../utils/password";
import type { Policy } from "../../types/policy";
import { formatMoney } from "../../utils/money";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic reference object from vm
type Reference = any;

// Our data spells out the reference implementation's abbreviated keys: [reference name, our name].
const SERVICE_KEYS: [string, string][] = [
  ["mins", "minutes"],
  ["minsDelta", "minutesDelta"],
  ["desc", "description"],
];

const POLICY_KEYS: [string, string][] = [
  ["depositPct", "depositPercent"],
  ["freeWindowHrs", "freeWindowHours"],
  ["pct", "percent"],
  ["graceMins", "graceMinutes"],
];

const STYLIST_KEYS = [...SERVICE_KEYS, ...POLICY_KEYS];

const SPEC_KEYS: [string, string][] = [...SERVICE_KEYS, ["add", "addedPrice"]];

/** Reverses rename pairs, to hand our values to the reference helpers. */
const toPrototypeKeys = (names: [string, string][]): [string, string][] =>
  names.map(([prototypeName, portName]) => [portName, prototypeName]);

describe.skipIf(!hasPrototype)(
  "data layer matches the reference data.js",
  () => {
    let prototypeData: Reference;

    beforeAll(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-09T09:15:00"));
      prototypeData = loadPrototypeData();
    });

    afterAll(() => vi.useRealTimers());

    it("datasets are identical", () => {
      // the live domain is .com; the prototype used .co.uk
      expect(data.stylists).toEqual(
        JSON.parse(
          JSON.stringify(
            renameKeys(
              toAssetPaths(toPlain(prototypeData.stylists)),
              STYLIST_KEYS,
            ),
          ).replaceAll("tiwarashouse.co.uk", "tiwarashouse.com"),
        ),
      );

      expect(data.reviews).toEqual(toPlain(prototypeData.reviews));

      expect(data.faqs).toEqual(
        renameKeys(toPlain(prototypeData.faqs), [
          ["q", "question"],
          ["a", "answer"],
        ]),
      );

      expect(data.chatMessages).toEqual(toPlain(prototypeData.chat));

      expect(data.serviceGroups).toEqual(
        renameKeys(toAssetPaths(toPlain(prototypeData.serviceGroups)), [
          ["desc", "description"],
          ["img", "image"],
        ]),
      );

      expect(data.serviceTypes).toEqual(toPlain(prototypeData.serviceTypes));

      expect(data.platformCustomisations).toEqual(
        toPlain(prototypeData.platformCustomisations),
      );

      expect(data.hairColours).toEqual(toPlain(prototypeData.colours));
      expect(data.defaultAddons).toEqual(toPlain(prototypeData.defaultAddons));

      expect(data.categoryColours).toEqual(
        toPlain(prototypeData.categoryColours),
      );

      expect(data.searchLocations).toEqual(toPlain(prototypeData.locations));
      expect(data.postcodes).toEqual(toPlain(prototypeData.postcodes));

      expect(data.policyIcons).toEqual(
        renameKeys(toPlain(prototypeData.policyIcons), [
          ["ns", "noShow"],
          ["pay", "payment"],
          ["cal", "calendar"],
        ]),
      );

      expect(data.seedAddresses).toEqual(
        renameKeys(toPlain(prototypeData.account.seedAddresses), [
          ["def", "isDefault"],
        ]),
      );
    });

    it("service helpers return identical output for every stylist and service", () => {
      data.stylists.forEach((stylist, index) => {
        const prototypeStylist = prototypeData.stylists[index];

        expect(toPlain(getMenu(stylist))).toEqual(
          renameKeys(
            toPlain(prototypeData.services.menu(prototypeStylist)),
            STYLIST_KEYS,
          ),
        );

        stylist.services.forEach((service, serviceIndex) => {
          const prototypeService = prototypeStylist.services[serviceIndex];

          expect(toPlain(getServiceOptions(service))).toEqual(
            renameKeys(
              toPlain(prototypeData.services.custOf(prototypeService)),
              SERVICE_KEYS,
            ),
          );

          expect(hasStep2(service)).toBe(
            prototypeData.services.hasStep2(prototypeService),
          );

          expect(getFromPrice(service)).toBe(
            prototypeData.services.fromPrice(prototypeService),
          );

          expect(getFromWithFee(service)).toBe(
            prototypeData.services.fromWithFee(prototypeService),
          );

          expect(getCustomisationSummary(service)).toBe(
            prototypeData.services.custSummary(prototypeService),
          );

          expect(findService(stylist, service.id)?.id).toBe(
            prototypeData.services.findService(prototypeStylist, service.id)
              ?.id,
          );

          expect(findService(stylist, service.name.toUpperCase())?.id).toBe(
            prototypeData.services.findService(
              prototypeStylist,
              service.name.toUpperCase(),
            )?.id,
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
        expect(getSpec(name)).toEqual(
          renameKeys(toPlain(prototypeData.services.spec(name)), SPEC_KEYS),
        );
      });

      (
        [
          [0, "15m"],
          [10, "15m"],
          [14, "15m"],
          [15, "15m"],
          [44.6, "45m"],
          [45, "45m"],
          [59, "59m"],
          [60, "1h"],
          [61, "1h 1m"],
          [90, "1h 30m"],
          [120, "2h"],
          [135, "2h 15m"],
          [240, "4h"],
          [245, "4h 5m"],
        ] as const
      ).forEach(([minutes, expected]) =>
        expect(formatServiceDuration(minutes)).toBe(expected),
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
          toPlain(prototypeData.services.matchTypes(query)),
        ),
      );
    });

    it("availability matches over two weeks", () => {
      data.stylists.forEach((stylist, index) => {
        const prototypeStylist = prototypeData.stylists[index];

        for (let offset = 0; offset < 14; offset++) {
          const day = new Date(2026, 9, 9 + offset);

          [30, 60, 120, 240, 300].forEach((minutes) =>
            expect(slotsFor(stylist, day, minutes)).toEqual(
              toPlain(
                prototypeData.services.slotsFor(prototypeStylist, day, minutes),
              ),
            ),
          );
        }
      });

      expect(miles(53.4808, -2.2426, 53.4166, -2.231)).toBe(
        prototypeData.services.miles(53.4808, -2.2426, 53.4166, -2.231),
      );
    });

    it("fees, money and policy lines match", () => {
      [0, 1, 9.99, 30, 45, 45.5, 56.33, 100, 133.335, 250].forEach((amount) => {
        expect(bookingFee(amount)).toBe(prototypeData.bookingFee(amount));
        expect(formatMoney(amount)).toBe(prototypeData.money(amount));
      });

      const variants: Partial<Policy>[] = [
        {},
        { mode: "full" },
        { mode: "card" },
        { mode: "none" },
        { refundable: false },
        { freeWindowHours: 0 },
        { freeWindowHours: 1 },
        { graceMinutes: 15 },
        {
          late: { on: true, kind: "pct", percent: 10 },
          noShow: { on: true, kind: "pct", percent: 20 },
        },
        {
          late: { on: true, kind: "pct", percent: 50 },
          noShow: { on: true, kind: "pct", percent: 100 },
        },
        {
          late: { on: true, kind: "keep", percent: 50 },
          noShow: { on: true, kind: "keep", percent: 50 },
        },
        {
          refundable: false,
          late: { on: true, kind: "pct", percent: 10 },
          noShow: { on: true, kind: "pct", percent: 150 },
        },
        {
          mode: "full",
          late: { on: true, kind: "pct", percent: 50 },
          noShow: { on: true, kind: "pct", percent: 100 },
          graceMinutes: 10,
        },
        {
          mode: "card",
          late: { on: true, kind: "pct", percent: 25 },
          noShow: { on: true, kind: "pct", percent: 50 },
        },
        { extras: [{ text: "  Bring your own hair  " }, { text: " " }] },
      ];

      const policies: Policy[] = [
        ...data.stylists.map(({ policies }) => policies),
        ...variants.map((variant) => ({
          ...data.stylists[0]!.policies,
          ...variant,
        })),
      ];

      policies.forEach((policy) =>
        [20, 45, 120, 133.33].forEach((price) =>
          expect(toPlain(policyLines(policy, price, "Amara"))).toEqual(
            toPlain(
              prototypeData.policyLines(
                renameKeys(policy, toPrototypeKeys(POLICY_KEYS)),
                price,
                "Amara",
              ),
            ),
          ),
        ),
      );
    });

    it("postcode and address helpers match", () => {
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
        expect(formatPostcode(code)).toBe(prototypeData.address.fmtPc(code));
        expect(isPostcodeValid(code)).toBe(prototypeData.address.pcOk(code));
        expect(getDistrict(code)).toBe(prototypeData.address.district(code));
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
        {
          line1: "  ",
          line2: "Apartment 7",
          town: "Manchester",
          postcode: "M1",
        },
      ];

      addresses.forEach((address) => {
        expect(isAddressValid(address)).toBe(
          prototypeData.address.valid(address),
        );

        expect(getAddressLines(address)).toEqual(
          toPlain(prototypeData.address.lines(address)),
        );

        expect(getAddressOneLine(address)).toBe(
          prototypeData.address.oneLine(address),
        );
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
          const theirs = prototypeData.password.check(password, options);

          expect(toPlain(ours)).toEqual(
            renameKeys(toPlain(theirs), [
              ["ok", "valid"],
              ["len", "length"],
            ]),
          );

          [
            {},
            { dark: true },
            { show: true },
            { dark: true, show: true, errorColour: "#fff" },
          ].forEach((viewOptions) =>
            expect(toPlain(getPasswordView(ours, viewOptions))).toEqual(
              renameKeys(
                toPlain(
                  prototypeData.password.view(
                    theirs,
                    renameKeys(viewOptions, [["errorColour", "errColor"]]),
                  ),
                ),
                [
                  ["bg", "background"],
                  ["s1", "bar1Colour"],
                  ["s2", "bar2Colour"],
                  ["s3", "bar3Colour"],
                  ["okLen", "lengthMet"],
                  ["noLen", "lengthUnmet"],
                  ["ruleSr", "ruleScreenReaderText"],
                  ["ruleC", "ruleColour"],
                  ["labelC", "labelColour"],
                  ["muteC", "mutedColour"],
                  ["segs", "segments"],
                  ["msg", "message"],
                  ["msgC", "messageColour"],
                  ["msgW", "messageWeight"],
                  ["hasErr", "hasError"],
                  ["msgOn", "showMessage"],
                  ["warn", "warning"],
                  ["warnOn", "showWarning"],
                  ["inv", "ariaInvalid"],
                ],
              ),
            ),
          );
        }),
      );
    });
  },
);
