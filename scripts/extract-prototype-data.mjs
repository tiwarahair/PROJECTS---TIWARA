// Regenerates src/data/*.json from the prototype's data.js (window.TIWARA) so every value is copied mechanically.
// Usage: node scripts/extract-prototype-data.mjs [path/to/prototype]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const prototypeDir =
  process.argv[2] ??
  "design-import/handoff folder/project/design_handoff_tiwaras_house/prototype";
const source = readFileSync(join(prototypeDir, "data.js"), "utf8");

// Expose the closure-only constants the helpers need, without changing any value.
const closingIife = "T.services={";
const exposed = source.replace(
  closingIife,
  "window.__specs=SPECS;window.__passwordBlocklist=PW_BLOCK;" + closingIife,
);

const sandbox = { window: {}, location: { search: "" } };
vm.runInNewContext(exposed, sandbox);
const { TIWARA: data, __specs: specs, __passwordBlocklist: passwordBlocklist } = sandbox.window;

const outputs = {
  "assets.json": data.assets,
  "stylists.json": data.stylists,
  "reviews.json": data.reviews,
  "faqs.json": data.faqs,
  "chat.json": data.chat,
  "service-groups.json": data.serviceGroups,
  "service-types.json": data.serviceTypes,
  "service-specs.json": specs,
  "platform-customisations.json": data.platformCustomisations,
  "colours.json": data.colours,
  "default-addons.json": data.defaultAddons,
  "category-colours.json": data.categoryColours,
  "locations.json": data.locations,
  "postcodes.json": data.postcodes,
  "addresses.json": data.addresses,
  "policy-icons.json": data.policyIcons,
  "policy-defaults.json": data.policyDefaults,
  "business-labels.json": data.services.businessLabel,
  "seed-addresses.json": data.account.seedAddresses,
  "password-blocklist.json": passwordBlocklist,
};

for (const [fileName, value] of Object.entries(outputs)) {
  writeFileSync(join("src/data", fileName), JSON.stringify(value, null, 2) + "\n");
}
console.log(`Wrote ${Object.keys(outputs).length} files to src/data`);
