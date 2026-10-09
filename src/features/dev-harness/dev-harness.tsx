import type { ReactNode } from "react";
import { useParams } from "react-router";
import { AddressFinder } from "../../components/address-finder/address-finder";
import { AllergyField } from "../../components/allergy-field/allergy-field";
import { StylistCard } from "../../components/stylist-card/stylist-card";
import type { StylistCardProps } from "../../components/stylist-card/stylist-card";
import type { AddressFixture } from "../../components/address-finder/use-address-finder";
import styles from "./dev-harness.module.css";

const ADDRESS_FIXTURES: AddressFixture[] = [
  "",
  "typing",
  "postcode",
  "typo",
  "nomatch",
  "summary",
  "manual",
  "errors",
  "manual-errors",
];

const ALLERGY_160 =
  "Sensitive scalp, allergic to tea tree oil and some edge controls. Please use fragrance-free products where possible and avoid tight tension at the nape of the n";
const ALLERGY_200 =
  "Allergic to latex and lanolin. Sensitive scalp after relaxers in the past, so please patch test new products. Fragrance-free where possible, and gentle on the edges and nape. Thanks very much!!       ";

const STYLIST_CARDS: { fixture: string; props: StylistCardProps }[] = [
  {
    fixture: "home-usage",
    props: {
      href: "/stylist?stylist=amara-beauty",
      cover: "img/w161154.jpg",
      stylistName: "Amara Beauty",
      rating: "4.8",
      reviews: 146,
      area: "Hulme, Manchester",
      from: "£81.70",
      verified: true,
    },
  },
  {
    fixture: "meta",
    props: {
      href: "/stylist?stylist=studio-zuri",
      cover: "img/w162031.jpg",
      stylistName: "Studio Zuri",
      rating: "4.8",
      reviews: 121,
      area: "Salford",
      meta: "1.2 mi",
      verified: false,
    },
  },
  {
    fixture: "rows",
    props: {
      href: "/stylist?stylist=naturallynia",
      cover: "img/IMG_0013.jpg",
      stylistName: "NaturallyNia",
      rating: "5.0",
      reviews: 98,
      area: "Moss Side, Manchester",
      verified: true,
      rows: [
        {
          name: "Silk press",
          meta: "2 hr · from £30.95",
          href: "/book?stylist=naturallynia",
        },
        { name: "Define curls", meta: "1 hr 45 · from £25.88", href: "#" },
      ],
      facts: [
        { text: "Travels to you", strong: true },
        { text: "Next: Tue 13 Oct", strong: false },
      ],
      bookHref: "/book?stylist=naturallynia",
    },
  },
  {
    fixture: "services",
    props: {
      href: "/stylist?stylist=braid-bar-mcr",
      cover: "img/w161244.jpg",
      stylistName: "The Braid Bar MCR",
      rating: "4.7",
      reviews: 183,
      area: "Northern Quarter, Manchester",
      from: 41.1,
      verified: true,
      services: [
        "Fulani braids",
        { name: "Feed-in braids", status: "active" },
        { name: "Draft", status: "draft" },
      ],
    },
  },
];

const HARNESSES: Record<string, () => ReactNode> = {
  "address-finder": () =>
    ADDRESS_FIXTURES.map((fixture) => (
      <div
        key={fixture || "default"}
        className={styles.box}
        data-fx={fixture || "default"}
      >
        <AddressFinder
          fixture={fixture}
          idPrefix={"hx-" + (fixture || "default")}
        />
      </div>
    )),
  "allergy-field": () =>
    [
      { fixture: "default", props: {} },
      {
        fixture: "count",
        props: { stylistName: "Crowned by Kemi", value: ALLERGY_160 },
      },
      {
        fixture: "full",
        props: { stylistName: "Crowned by Kemi", value: ALLERGY_200 },
      },
      {
        fixture: "privacy",
        props: { stylistName: "Studio Zuri", openPrivacy: true },
      },
    ].map(({ fixture, props }) => (
      <div key={fixture} className={styles.box} data-fx={fixture}>
        <AllergyField {...props} />
      </div>
    )),
  "stylist-card": () =>
    STYLIST_CARDS.map(({ fixture, props }) => (
      <div key={fixture} className={styles.cardBox} data-fx={fixture}>
        <StylistCard {...props} />
      </div>
    )),
};

/** Dev-only: renders a component in every fixture state, mirroring the prototype harness page for diffing. */
export const DevHarness = () => {
  const { component = "" } = useParams();
  const render = HARNESSES[component];
  return (
    <div className={styles.page}>{render ? render() : "Unknown harness"}</div>
  );
};
