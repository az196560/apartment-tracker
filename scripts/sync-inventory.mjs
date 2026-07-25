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

const sightmapSources = [
  {
    propertyId: "highwater",
    sourceId: "highwater",
    dataUrl:
      "https://sightmap.com/app/api/v1/r5v5xezjpny/sightmaps/86050",
    embedUrl: "https://sightmap.com/embed/yjp209e5wxl",
  },
  {
    propertyId: "885-woodside",
    sourceId: "885-woodside",
    dataUrl:
      "https://sightmap.com/app/api/v1/jlw07gmjv2y/sightmaps/86909",
    embedUrl: "https://sightmap.com/embed/x1p88z1opd6",
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
        totalMonthlyPrice: null,
        availableDate: isoDate(available, now),
        recommendedLeaseMonths: null,
        leaseTerms: [],
        mandatoryMonthlyFees: [],
        optionalMonthlyFees: [],
        oneTimeFees: [],
        sourceUrl: applyUrl ?? source.url,
        precision: applyUrl ? "unit" : "floorplan",
        capturedAt: now.toISOString(),
      });
    }
  }

  const unique = new Map(results.map((listing) => [listing.id, listing]));
  return [...unique.values()];
}

function floorplanName(value) {
  if (!value) return "1 Bedroom";
  let name = value;
  try {
    const parsed = JSON.parse(value);
    name = parsed.name ?? value;
  } catch {
    name = value;
  }
  return name.replace(/^(\d[A-Za-z])(\d)$/, "$1.$2");
}

function amountFor(unit, expense) {
  const amount = unit.expense_amounts?.[expense.id];
  if (!amount) return { amount: null };
  return {
    amount:
      amount.min_amount === null ? null : Number(amount.min_amount),
    amountMax:
      amount.max_amount === null ? null : Number(amount.max_amount),
    note: amount.text_amount ?? expense.disclaimer ?? undefined,
  };
}

function feeLines(unit, classification, { required, group } = {}) {
  const sections = unit.static_expenses ?? [];
  const expenses = sections.flatMap((section) => section.expenses ?? []);

  return expenses
    .filter(
      (expense) =>
        expense.classification === classification &&
        (required === undefined || expense.is_required === required) &&
        (group === undefined || expense.group === group),
    )
    .map((expense) => ({
      label: expense.label,
      ...amountFor(unit, expense),
    }));
}

function isOneBedroom(plan) {
  return /^1(?:[A-Za-z]|\s|$)/.test(plan);
}

async function scrapeSightmap(source, now) {
  const response = await fetch(source.dataUrl, {
    headers: {
      accept: "application/json",
      "accept-encoding": "identity",
      "user-agent":
        "PeninsulaOneAvailabilityMonitor/1.0 (+https://github.com/az196560/apartment-tracker)",
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    throw new Error(
      `${source.propertyId} SightMap returned HTTP ${response.status}`,
    );
  }

  const payload = await response.json();
  const data = payload.data;
  const plans = new Map(
    (data.floor_plans ?? []).map((plan) => [
      String(plan.id),
      floorplanName(plan.name),
    ]),
  );

  return (data.units ?? [])
    .map((unit) => {
      const plan = plans.get(String(unit.floor_plan_id)) ?? "1 Bedroom";
      const recommendedLeaseMonths =
        Number.parseInt(unit.display_lease_term, 10) || null;
      const totalMonthlyPrice = Array.isArray(unit.total_price)
        ? Number(unit.total_price[0])
        : null;

      return {
        id: `${source.propertyId}-${String(unit.unit_number).toLowerCase()}`,
        propertyId: source.propertyId,
        unit: `#${unit.unit_number}`,
        floorplan: plan,
        beds: 1,
        baths: 1,
        sqft: Number(unit.area),
        rent: Number(unit.price),
        totalMonthlyPrice,
        availableDate: unit.available_on,
        recommendedLeaseMonths,
        leaseTerms:
          recommendedLeaseMonths && unit.price
            ? [{ months: recommendedLeaseMonths, baseRent: Number(unit.price) }]
            : [],
        mandatoryMonthlyFees: feeLines(unit, "monthly", { required: true }),
        optionalMonthlyFees: feeLines(unit, "optional", {
          required: false,
          group: "parking",
        }),
        oneTimeFees: feeLines(unit, "additional", { required: true }),
        sourceUrl: `${source.embedUrl}?unit_number=${encodeURIComponent(unit.unit_number)}`,
        precision: "unit",
        capturedAt: now.toISOString(),
      };
    })
    .filter(
      (listing) =>
        isOneBedroom(listing.floorplan) &&
        Number.isFinite(listing.rent) &&
        listing.availableDate,
    );
}

async function main() {
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  const now = new Date();
  const updates = [];
  const failures = [];

  try {
    const cirrusListings = await scrapeCirrus(now);
    if (cirrusListings.length === 0) {
      throw new Error("No Cirrus 1B1B listings were parsed.");
    }
    updates.push({ propertyId: "cirrus", sourceId: "cirrus", listings: cirrusListings });
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  for (const source of sightmapSources) {
    try {
      updates.push({
        propertyId: source.propertyId,
        sourceId: source.sourceId,
        listings: await scrapeSightmap(source, now),
      });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  for (const update of updates) {
    inventory.listings = [
      ...inventory.listings.filter(
        (listing) => listing.propertyId !== update.propertyId,
      ),
      ...update.listings,
    ];

    const property = inventory.properties.find(
      (item) => item.id === update.propertyId,
    );
    if (property) property.inventoryStatus = "live";

    const source = inventory.sources.find(
      (item) => item.id === update.sourceId,
    );
    if (source) {
      source.status = "live";
      source.lastSuccessAt = now.toISOString();
    }
  }
  inventory.updatedAt = now.toISOString();

  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  process.stdout.write(
    `Updated ${updates.length} sources with ${updates.reduce(
      (count, update) => count + update.listings.length,
      0,
    )} 1B1B listings.\n`,
  );
  if (failures.length) {
    process.stdout.write(
      `Retained previous snapshots for failed sources: ${failures.join(" | ")}\n`,
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
