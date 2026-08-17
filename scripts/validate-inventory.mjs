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

function isValidTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const errors = [];
const explicitlyExcludedPropertyIds = new Set(["shortstack", "the-heltsley"]);
const supportedRegions = new Set(["sf", "peninsula", "south-bay", "east-bay"]);
const restrictedPlanPattern =
  /affordable|below[\s-]?market|\bbmr\b|income[\s-]?(?:restricted|qualified)|workforce|senior|age[\s-]?restricted|student[\s-]?housing|faculty[\s-]?housing|employee[\s-]?housing/i;
const updatedAt = Date.parse(inventory.updatedAt);

if (!isValidTimestamp(inventory.updatedAt)) {
  errors.push(
    `updatedAt must be a valid timestamp, received ${inventory.updatedAt}`,
  );
}

if (inventory.timezone !== "America/Los_Angeles") {
  errors.push(
    `timezone must be America/Los_Angeles, received ${inventory.timezone}`,
  );
}

for (const [collectionName, items] of [
  ["properties", inventory.properties],
  ["listings", inventory.listings],
  ["listingHistory", inventory.listingHistory],
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
    if (!supportedRegions.has(property.region)) {
      errors.push(`${property.id} must declare a supported Bay Area region`);
    }
    if (
      property.area !== undefined &&
      (typeof property.area !== "string" || property.area.trim() === "")
    ) {
      errors.push(`${property.id} must declare a non-empty area when present`);
    }
    if (
      !Array.isArray(property.bedroomTypes) ||
      !property.bedroomTypes.length ||
      property.bedroomTypes.some(
        (beds) => !Number.isInteger(beds) || beds < 0 || beds > 4,
      )
    ) {
      errors.push(`${property.id} must declare supported bedroom types from 0 to 4`);
    }
    if (property.marketRate !== true) {
      errors.push(`${property.id} must be an unrestricted market-rate community`);
    }
    if (
      property.airConditioning !== true &&
      property.airConditioning !== null
    ) {
      errors.push(
        `${property.id} must have verified or explicitly unverified air conditioning`,
      );
    }
    if (property.inUnitWasherDryer !== true) {
      errors.push(`${property.id} must have a verified in-unit washer/dryer`);
    }
    if (!isValidTimestamp(property.amenitiesVerifiedAt)) {
      errors.push(`${property.id} must declare a valid amenitiesVerifiedAt date`);
    }
    try {
      const evidenceUrl = new URL(property.amenityEvidenceUrl);
      if (evidenceUrl.protocol !== "https:") throw new Error("not HTTPS");
    } catch {
      errors.push(`${property.id} must link to HTTPS amenity evidence`);
    }
    if (explicitlyExcludedPropertyIds.has(property.id)) {
      errors.push(`${property.id} must remain excluded by policy`);
    }
  }
}

if (Array.isArray(inventory.properties)) {
  for (const region of supportedRegions) {
    if (!inventory.properties.some((property) => property.region === region)) {
      errors.push(`${region} must contain at least one qualifying property`);
    }
  }
}

const propertyIds = new Set(
  Array.isArray(inventory.properties)
    ? inventory.properties.map((property) => property.id)
    : [],
);

const listingHistoryById = new Map(
  Array.isArray(inventory.listingHistory)
    ? inventory.listingHistory.map((entry) => [entry.id, entry])
    : [],
);

if (Array.isArray(inventory.listingHistory)) {
  for (const entry of inventory.listingHistory) {
    if (!propertyIds.has(entry.propertyId)) {
      errors.push(
        `${entry.id} history references excluded or unknown property ${entry.propertyId}`,
      );
    }
    if (!isValidTimestamp(entry.firstSeenAt)) {
      errors.push(`${entry.id} history must declare a valid firstSeenAt`);
    } else if (
      Number.isFinite(updatedAt) &&
      Date.parse(entry.firstSeenAt) > updatedAt
    ) {
      errors.push(`${entry.id} history firstSeenAt cannot be after updatedAt`);
    }
  }
}

if (Array.isArray(inventory.listings)) {
  for (const listing of inventory.listings) {
    if (!propertyIds.has(listing.propertyId)) {
      errors.push(
        `${listing.id} references excluded or unknown property ${listing.propertyId}`,
      );
    }
    if (
      restrictedPlanPattern.test(
        `${listing.floorplan ?? ""} ${listing.unit ?? ""} ${listing.sourceUrl ?? ""}`,
      )
    ) {
      errors.push(`${listing.id} appears to require a special eligibility program`);
    }
    if (!Number.isInteger(listing.beds) || listing.beds < 0 || listing.beds > 4) {
      errors.push(`${listing.id} must declare a bedroom count from 0 to 4`);
    }
    if (
      listing.baths !== null &&
      (typeof listing.baths !== "number" ||
        !Number.isFinite(listing.baths) ||
        listing.baths <= 0 ||
        listing.baths > 4)
    ) {
      errors.push(`${listing.id} must declare a bathroom count above 0 and at most 4`);
    }
    if (!isValidTimestamp(listing.capturedAt)) {
      errors.push(`${listing.id} must declare a valid capturedAt`);
    }
    if (!isValidTimestamp(listing.firstSeenAt)) {
      errors.push(`${listing.id} must declare a valid firstSeenAt`);
    } else if (
      isValidTimestamp(listing.capturedAt) &&
      Date.parse(listing.firstSeenAt) > Date.parse(listing.capturedAt)
    ) {
      errors.push(`${listing.id} firstSeenAt cannot be after capturedAt`);
    }
    const history = listingHistoryById.get(listing.id);
    if (!history) {
      errors.push(`${listing.id} is missing from listingHistory`);
    } else {
      if (history.propertyId !== listing.propertyId) {
        errors.push(`${listing.id} history property does not match its listing`);
      }
      if (history.firstSeenAt !== listing.firstSeenAt) {
        errors.push(`${listing.id} history firstSeenAt does not match its listing`);
      }
    }
  }
}

if (Array.isArray(inventory.sources)) {
  for (const source of inventory.sources) {
    if (!propertyIds.has(source.id)) {
      errors.push(`${source.id} source has no included property`);
    }
  }
  const sourceIds = new Set(inventory.sources.map((source) => source.id));
  for (const propertyId of propertyIds) {
    if (!sourceIds.has(propertyId)) {
      errors.push(`${propertyId} must have an official inventory source`);
    }
  }
}

if (errors.length) {
  throw new Error(`Inventory validation failed:\n- ${errors.join("\n- ")}`);
}

process.stdout.write(
  `Validated ${inventory.properties.length} region-tagged properties, ` +
    `${inventory.listings.length} listings, and ${inventory.sources.length} sources.\n`,
);
