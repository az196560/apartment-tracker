import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const inventoryPath = fileURLToPath(
  new URL("../public/data/inventory.json", import.meta.url),
);

const cirrusFloorplans = [
  {
    url: "https://www.cirrusredwoodcityapartments.com/floorplans/1-bedroom-1-bath-a",
    floorplan: "1 Bedroom 1 Bath A",
    sqft: 663,
  },
  {
    url: "https://www.cirrusredwoodcityapartments.com/floorplans/1-bedroom-1-bath-b",
    floorplan: "1 Bedroom 1 Bath B",
    sqft: 699,
  },
];

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#160;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function textFromHtml(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  );
}

function isoDate(value, now) {
  if (/available now/i.test(value)) {
    return now.toISOString().slice(0, 10);
  }
  const [month, day, year] = value.split("/").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function exactApplyUrl(html, unit, pageUrl) {
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `href=["']([^"']+)["'][^>]*>[\\s\\S]{0,160}?Apply Now for Apartment\\s*${escapedUnit}`,
    "i",
  );
  const match = html.match(pattern);
  if (!match) return null;
  return new URL(decodeEntities(match[1]), pageUrl).toString();
}

async function scrapeCirrus(now) {
  const results = [];

  for (const source of cirrusFloorplans) {
    const response = await fetch(source.url, {
      headers: {
        "user-agent":
          "PeninsulaOneAvailabilityMonitor/1.0 (+https://github.com/az196560/apartment-tracker)",
      },
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      throw new Error(`Cirrus returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const text = textFromHtml(html);
    const pattern =
      /Apartment:\s*#\s*([A-Za-z0-9-]+)\s*Date Available:\s*(Available Now|\d{1,2}\/\d{1,2}\/\d{4})\s*Starting at:\s*\$([\d,]+)(?:\.\d{2})?/gi;

    for (const match of text.matchAll(pattern)) {
      const [, unit, available, rentText] = match;
      const applyUrl = exactApplyUrl(html, unit, source.url);

      results.push({
        id: `cirrus-${unit.toLowerCase()}`,
        propertyId: "cirrus",
        unit: `#${unit}`,
        floorplan: source.floorplan,
        beds: 1,
        baths: 1,
        sqft: source.sqft,
        rent: Number(rentText.replaceAll(",", "")),
        availableDate: isoDate(available, now),
        sourceUrl: applyUrl ?? source.url,
        precision: applyUrl ? "unit" : "floorplan",
        capturedAt: now.toISOString(),
      });
    }
  }

  const unique = new Map(results.map((listing) => [listing.id, listing]));
  return [...unique.values()];
}

async function main() {
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  const now = new Date();
  const cirrusListings = await scrapeCirrus(now);

  if (cirrusListings.length === 0) {
    throw new Error("No Cirrus 1B1B listings were parsed; keeping the last snapshot.");
  }

  inventory.listings = [
    ...inventory.listings.filter((listing) => listing.propertyId !== "cirrus"),
    ...cirrusListings,
  ];
  inventory.updatedAt = now.toISOString();

  const source = inventory.sources.find((item) => item.id === "cirrus");
  if (source) {
    source.status = "live";
    source.lastSuccessAt = now.toISOString();
  }

  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  process.stdout.write(
    `Updated inventory with ${cirrusListings.length} Cirrus listings.\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("HTTP 403")) {
    process.stdout.write(
      "Official site blocked automated access; retaining the last verified snapshot.\n",
    );
    process.exitCode = 0;
    return;
  }
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
