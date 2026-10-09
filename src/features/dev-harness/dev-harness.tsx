import type { ReactNode } from "react";
import { useParams } from "react-router";
import { AddressFinder } from "../../components/address-finder/address-finder";
import { AllergyField } from "../../components/allergy-field/allergy-field";
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
};

/** Dev-only: renders a component in every fixture state, mirroring the prototype harness page for diffing. */
export const DevHarness = () => {
  const { component = "" } = useParams();
  const render = HARNESSES[component];
  return (
    <div className={styles.page}>{render ? render() : "Unknown harness"}</div>
  );
};
