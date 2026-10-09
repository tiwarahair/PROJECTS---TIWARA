import type { ReactNode } from "react";
import { useParams } from "react-router";
import { AddressFinder } from "../../components/address-finder/address-finder";
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
};

/** Dev-only: renders a component in every fixture state, mirroring the prototype harness page for diffing. */
export const DevHarness = () => {
  const { component = "" } = useParams();
  const render = HARNESSES[component];
  return (
    <div className={styles.page}>{render ? render() : "Unknown harness"}</div>
  );
};
