import styleConfig from "./style-config.json";
import type { StyleConfig, AddOnOption } from "../../types/styles";
import type { ServiceId } from "../../types/services";

const STYLE_CONFIG = styleConfig as StyleConfig[];

export const ADD_ON_OPTIONS = (STYLE_CONFIG.find(
  ({ name }) => name === "Add-ons",
)?.options ?? []) as AddOnOption[];

export const getServiceAddOns = (id: ServiceId): AddOnOption[] =>
  ADD_ON_OPTIONS.filter(
    ({ serviceIds }) => serviceIds.includes(id) || serviceIds.includes("all"),
  );
