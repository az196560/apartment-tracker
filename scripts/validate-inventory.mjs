import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const inventoryPath = fileURLToPath(
  new URL("../public/data/inventory.json", import.meta.url),
);

function duplicateIds(items) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item.id)) duplicates.add(item.id);
    seen.add(item.id);
  }
  return [...duplicates];
}

const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const errors = [];
const explicitlyExcludedPropertyIds = new Set(["shortstack", "the-heltsley"]);

if (inventory.timezone !== "America/Los_Angeles") {
  errors.push(
    `timezone must be America/Los_Angeles, received ${inventory.timezone}`,
  );
}

for (const [collectionName, items] of [
  ["properties", inventory.properties],
  ["listings", inventory.listings],
  ["sources", inventory.sources],
]) {
  if (!Array.isArray(items)) {
    errors.push(`${collectionName} must be an array`);
    continue;
  }
  const duplicates = duplicateIds(items);
  if (duplicates.length) {
    errors.push(`${collectionName} contains duplicate ids: ${duplicates.join(", ")}`);
  }
}

if (Array.isArray(inventory.properties)) {
  for (const property of inventory.properties) {
    if (typeof property.airConditioning !== "boolean") {
      errors.push(`${property.id} must declare an air-conditioning review status`);
    }
    if (typeof property.inUnitWasherDryer !== "boolean") {
      errors.push(
        `${property.id} must declare an in-unit washer/dryer review status`,
      );
    }
    if (explicitlyExcludedPropertyIds.has(property.id)) {
      errors.push(`${property.id} must remain excluded by policy`);
    }
  }
}

const propertyIds = new Set(
  Array.isArray(inventory.properties)
    ? inventory.properties.map((property) => property.id)
    : [],
);

if (Array.isArray(inventory.listings)) {
  for (const listing of inventory.listings) {
    if (!propertyIds.has(listing.propertyId)) {
      errors.push(
        `${listing.id} references excluded or unknown property ${listing.propertyId}`,
      );
    }
  }
}

if (Array.isArray(inventory.sources)) {
  for (const source of inventory.sources) {
    if (!propertyIds.has(source.id)) {
      errors.push(`${source.id} source has no included property`);
    }
  }
}

if (errors.length) {
  throw new Error(`Inventory validation failed:\n- ${errors.join("\n- ")}`);
}

process.stdout.write(
  `Validated ${inventory.properties.length} amenity-reviewed properties, ` +
    `${inventory.listings.length} listings, and ${inventory.sources.length} sources.\n`,
);
