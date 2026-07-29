import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const inventoryPath = fileURLToPath(
  new URL("../public/data/inventory.json", import.meta.url),
);
const monitorUserAgent =
  "PeninsulaOneAvailabilityMonitor/2.0 (+https://github.com/az196560/apartment-tracker)";
const restrictedPlanPattern =
  /affordable|below[\s-]?market|\bbmr\b|income[\s-]?(?:restricted|qualified)/i;
const excludedPropertyIds = new Set(["shortstack", "the-heltsley"]);
const amenityPolicyOnly = process.argv.includes("--amenity-policy-only");
const amenityReviews = {
  // Burlingame
  anson: { airConditioning: true, inUnitWasherDryer: true },
  revery: { airConditioning: true, inUnitWasherDryer: true },
  "one-adrian": { airConditioning: true, inUnitWasherDryer: true },
  "bayswater-burlingame": {
    airConditioning: false,
    inUnitWasherDryer: true,
  },
  "the-bower": { airConditioning: true, inUnitWasherDryer: true },
  "hanover-burlingame": {
    airConditioning: false,
    inUnitWasherDryer: true,
  },
  northpark: { airConditioning: false, inUnitWasherDryer: true },
  "burlingame-towers": {
    airConditioning: false,
    inUnitWasherDryer: false,
  },

  // San Mateo
  "station-park-green": {
    airConditioning: true,
    inUnitWasherDryer: true,
  },
  mode: { airConditioning: true, inUnitWasherDryer: true },
  "the-lark": { airConditioning: true, inUnitWasherDryer: true },
  "field-house": { airConditioning: true, inUnitWasherDryer: true },
  quimby: { airConditioning: true, inUnitWasherDryer: true },
  "the-russell": { airConditioning: true, inUnitWasherDryer: true },
  hawthorne: { airConditioning: true, inUnitWasherDryer: true },
  "the-morgan": { airConditioning: true, inUnitWasherDryer: true },
  "888-san-mateo": { airConditioning: true, inUnitWasherDryer: true },
  "park-place-san-mateo": {
    airConditioning: true,
    inUnitWasherDryer: true,
  },
  "55-west-fifth": { airConditioning: true, inUnitWasherDryer: true },
  "creekside-san-mateo": {
    airConditioning: false,
    inUnitWasherDryer: true,
  },

  // Foster City
  "the-triton": { airConditioning: true, inUnitWasherDryer: true },
  "the-plaza-foster-city": {
    airConditioning: true,
    inUnitWasherDryer: true,
  },
  "100-grand": { airConditioning: true, inUnitWasherDryer: true },
  miramar: { airConditioning: false, inUnitWasherDryer: false },
  "marlin-cove": { airConditioning: false, inUnitWasherDryer: true },
  "fosters-landing": { airConditioning: false, inUnitWasherDryer: true },
  "schooner-bay": { airConditioning: false, inUnitWasherDryer: true },
  "lantern-cove": { airConditioning: false, inUnitWasherDryer: true },
  "waters-edge": { airConditioning: false, inUnitWasherDryer: true },
  "the-hayden": { airConditioning: false, inUnitWasherDryer: true },

  // Belmont and San Carlos
  trestle: { airConditioning: true, inUnitWasherDryer: true },
  "wheeler-plaza": { airConditioning: false, inUnitWasherDryer: false },

  // Redwood City
  cirrus: { airConditioning: true, inUnitWasherDryer: true },
  indigo: { airConditioning: true, inUnitWasherDryer: true },
  "franklin-299": { airConditioning: true, inUnitWasherDryer: true },
  "201-marshall": { airConditioning: true, inUnitWasherDryer: true },
  "the-heltsley": { airConditioning: true, inUnitWasherDryer: false },
  huxley: { airConditioning: true, inUnitWasherDryer: true },
  "riva-terra": { airConditioning: false, inUnitWasherDryer: true },
  "indian-creek": { airConditioning: false, inUnitWasherDryer: true },
  pescadero: { airConditioning: false, inUnitWasherDryer: true },
  radius: { airConditioning: true, inUnitWasherDryer: true },
  highwater: { airConditioning: true, inUnitWasherDryer: true },
  "encore-redwood-city": {
    airConditioning: true,
    inUnitWasherDryer: true,
  },
  "707-leahy": { airConditioning: true, inUnitWasherDryer: true },
  "885-woodside": { airConditioning: true, inUnitWasherDryer: true },
  locale: { airConditioning: true, inUnitWasherDryer: true },
  "villas-bair-island": {
    airConditioning: true,
    inUnitWasherDryer: true,
  },
  "avenue-two": { airConditioning: false, inUnitWasherDryer: true },
  "franklin-street": { airConditioning: true, inUnitWasherDryer: true },
  "blu-harbor": { airConditioning: true, inUnitWasherDryer: true },
  "the-marston": { airConditioning: true, inUnitWasherDryer: true },
  township: { airConditioning: true, inUnitWasherDryer: true },

  // Menlo Park
  lume: { airConditioning: true, inUnitWasherDryer: true },
  vasara: { airConditioning: true, inUnitWasherDryer: true },
  roen: { airConditioning: true, inUnitWasherDryer: true },
  "anton-menlo": { airConditioning: false, inUnitWasherDryer: true },
  "realm-menlo-park": { airConditioning: true, inUnitWasherDryer: true },
  "sharon-green": { airConditioning: true, inUnitWasherDryer: true },
};

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
  ["anson", "rxwj6rxxp1e", "Anson / SightMap"],
  ["revery", "dqw97oq0vo9", "Revery / SightMap"],
  ["one-adrian", "y8px5zl3v19", "One Adrian / SightMap"],
  ["the-hayden", "r5v510omwny", "The Hayden / SightMap"],
  ["the-triton", "8ywklk16vlx", "The Triton / SightMap"],
  ["the-heltsley", "10pdl0zlv2z", "The Heltsley / SightMap"],
  ["blu-harbor", "n9w60llew71", "Blu Harbor / SightMap"],
  ["the-marston", "40vlgod3ple", "The Marston / SightMap"],
  ["lume", "dqw9k2y5po9", "Lume / SightMap"],
  ["vasara", "1ywyk6e1vq0", "Vasara / SightMap"],
  ["sharon-green", "gow3k7nyp2m", "Sharon Green / SightMap"],
  ["locale", "4yjp2o9zwxl", "Locale / SightMap"],
  ["highwater", "yjp209e5wxl", "Highwater / SightMap"],
  ["885-woodside", "x1p88z1opd6", "885 Woodside / SightMap"],
  ["marlin-cove", "y8px8l6jv19", "Marlin Cove / SightMap"],
  ["pescadero", "m9pz8ldmpk1", "Pescadero / SightMap"],
  ["indian-creek", "yjp2dg09vxl", "Indian Creek / SightMap"],
  ["anton-menlo", "k9zw4kj0v87", "Anton Menlo / SightMap"],
].map(([propertyId, embedId, label]) => ({
  propertyId,
  sourceId: propertyId,
  label,
  embedUrl: `https://sightmap.com/embed/${embedId}`,
}));

const equitySources = [
  ["northpark", "Northpark / Equity Apartments"],
  ["park-place-san-mateo", "Park Place / Equity Apartments"],
  ["55-west-fifth", "55 West Fifth / Equity Apartments"],
  ["creekside-san-mateo", "Creekside / Equity Apartments"],
  ["schooner-bay", "Schooner Bay / Equity Apartments"],
  ["lantern-cove", "Lantern Cove / Equity Apartments"],
  ["huxley", "Huxley / Equity Apartments"],
  ["riva-terra", "Riva Terra / Equity Apartments"],
].map(([propertyId, label]) => ({ propertyId, sourceId: propertyId, label }));

const fixedSources = [
  {
    propertyId: "the-lark",
    sourceId: "the-lark",
    label: "The Lark / RentCafe API",
    scrape: scrapeLark,
  },
  {
    propertyId: "201-marshall",
    sourceId: "201-marshall",
    label: "201 Marshall / RealPage API",
    scrape: scrapeRealPageV2,
  },
  {
    propertyId: "franklin-299",
    sourceId: "franklin-299",
    label: "Franklin 299 / G5 Inventory",
    scrape: scrapeFranklin299,
  },
  {
    propertyId: "indigo",
    sourceId: "indigo",
    label: "Indigo / AIR Communities",
    scrape: scrapeIndigo,
  },
  {
    propertyId: "realm-menlo-park",
    sourceId: "realm-menlo-park",
    label: "Realm Menlo Park / On-Site",
    scrape: scrapeRealm,
  },
  ...[
    ["field-house", "Bay Meadows / RentCafe"],
    ["quimby", "Bay Meadows / RentCafe"],
    ["the-russell", "Bay Meadows / RentCafe"],
    ["hawthorne", "Bay Meadows / RentCafe"],
    ["the-morgan", "Bay Meadows / RentCafe"],
  ].map(([propertyId, label]) => ({
    propertyId,
    sourceId: propertyId,
    label,
    scrape: scrapeBayMeadows,
  })),
  ...[
    ["the-bower", 5177855, "The Bower / Prometheus"],
    ["miramar", 1088225, "Miramar / Prometheus"],
    ["trestle", 4245946, "Trestle / Prometheus"],
  ].map(([propertyId, prometheusId, label]) => ({
    propertyId,
    sourceId: propertyId,
    label,
    prometheusId,
    scrape: scrapePrometheus,
  })),
  {
    propertyId: "encore-redwood-city",
    sourceId: "encore-redwood-city",
    label: "Encore / Official unit map",
    scrape: scrapeEncore,
  },
];

const essexSources = [
  ["station-park-green", 629080, "Station Park Green / Essex"],
  ["the-plaza-foster-city", 1909812, "The Plaza / Essex"],
  ["fosters-landing", 510844, "Foster's Landing / Essex"],
  ["radius", 513957, "Radius / Essex"],
  ["roen", 1955220, "ROEN / Essex"],
].map(([propertyId, essexId, label]) => ({
  propertyId,
  sourceId: propertyId,
  label,
  essexId,
}));

const rentCafeBrowserSources = [
  {
    propertyId: "mode",
    sourceId: "mode",
    label: "MODE / RentCafe",
    url: "https://www.rentcafe.com/apartments/ca/san-mateo/mode/default.aspx",
    mode: "directory",
  },
  {
    propertyId: "100-grand",
    sourceId: "100-grand",
    label: "One Hundred Grand / RentCafe",
    url: "https://www.rcqalive.com/apartments/ca/foster-city/one-hundred-grand/default.aspx",
    mode: "directory",
  },
  {
    propertyId: "avenue-two",
    sourceId: "avenue-two",
    label: "Avenue Two / RentCafe",
    url: "https://www.rentcafe.com/apartments/ca/redwood-city/avenue-two-apartments/default.aspx",
    mode: "directory",
  },
  {
    propertyId: "township",
    sourceId: "township",
    label: "Township / RentCafe",
    url: "https://www.rentcafe.com/apartments/ca/redwood-city/township/default.aspx",
    mode: "directory",
  },
];

const irvineSources = [
  {
    propertyId: "villas-bair-island",
    sourceId: "villas-bair-island",
    label: "Villas at Bair Island / Irvine Company",
    url: "https://www.irvinecompanyapartments.com/locations/northern-california/redwood-city/villas-at-bair-island/availability.html",
  },
  {
    propertyId: "franklin-street",
    sourceId: "franklin-street",
    label: "Franklin Street / Irvine Company",
    url: "https://www.irvinecompanyapartments.com/locations/northern-california/redwood-city/franklin-st/availability.html",
  },
];

const unavailableProperties = [
  {
    propertyId: "888-san-mateo",
    label: "888 San Mateo / official website",
    note: "官网仅公开户型，未提供可验证的单元级实时库存；请联系 leasing office 确认。",
  },
  {
    propertyId: "707-leahy",
    label: "707 Leahy / RealPage",
    note: "官网 RealPage 在线租赁目前暂停服务；监控器会每天检查并在恢复后重新接入。",
  },
];

const propertyOverrides = {
  "the-plaza-foster-city": {
    management: "Essex",
    website:
      "https://www.essexapartmenthomes.com/apartments/foster-city/the-plaza/floor-plans-and-pricing",
  },
  "100-grand": {
    management: "Essex",
    website:
      "https://www.essexapartmenthomes.com/apartments/foster-city/one-hundred-grand/floor-plans-and-pricing",
  },
  "franklin-street": {
    website:
      "https://www.irvinecompanyapartments.com/locations/northern-california/redwood-city/franklin-st/availability.html",
  },
  township: {
    website:
      "https://www.rentcafe.com/apartments/ca/redwood-city/township/default.aspx",
  },
};

function decodeEntities(value) {
  return String(value ?? "")
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

function numberValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = String(value ?? "").replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function isoDate(value, now) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^(?:available\s*)?now$/i.test(raw)) {
    return now.toISOString().slice(0, 10);
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) {
    return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  const shortMonth = raw.match(
    /^(?:available\s+on\s+)?([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?$/i,
  );
  if (shortMonth) {
    let parsed = new Date(
      `${shortMonth[1]} ${shortMonth[2]}, ${now.getFullYear()} 12:00:00`,
    );
    if (parsed.getTime() < now.getTime() - 30 * 86_400_000) {
      parsed = new Date(
        `${shortMonth[1]} ${shortMonth[2]}, ${now.getFullYear() + 1} 12:00:00`,
      );
    }
    return Number.isNaN(parsed.valueOf())
      ? null
      : parsed.toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": monitorUserAgent,
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const endpoint = new URL(url);
    throw new Error(
      `${endpoint.origin}${endpoint.pathname} returned HTTP ${response.status}`,
    );
  }
  return response.text();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: "application/json",
      "accept-encoding": "identity",
      "user-agent": monitorUserAgent,
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const endpoint = new URL(url);
    throw new Error(
      `${endpoint.origin}${endpoint.pathname} returned HTTP ${response.status}`,
    );
  }
  return response.json();
}

function exactApplyUrl(html, unit, pageUrl) {
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `href=["']([^"']+)["'][^>]*>[\\s\\S]{0,180}?Apply Now for Apartment\\s*${escapedUnit}`,
    "i",
  );
  const match = html.match(pattern);
  return match ? new URL(decodeEntities(match[1]), pageUrl).toString() : null;
}

async function scrapeCirrus(now) {
  const results = [];
  for (const source of cirrusFloorplans) {
    const html = await fetchText(source.url);
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
  return [...new Map(results.map((listing) => [listing.id, listing])).values()];
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
  return String(name).replace(/^(\d[A-Za-z])(\d)$/, "$1.$2");
}

function amountForSightmap(unit, expense) {
  const amount = unit.expense_amounts?.[expense.id];
  if (!amount) return { amount: null };
  return {
    amount: numberValue(amount.min_amount),
    amountMax: numberValue(amount.max_amount),
    note: amount.text_amount ?? expense.disclaimer ?? undefined,
  };
}

function sightmapFeeLines(unit, classification, { required, group } = {}) {
  const expenses = (unit.static_expenses ?? []).flatMap(
    (section) => section.expenses ?? [],
  );
  return expenses
    .filter(
      (expense) =>
        expense.classification === classification &&
        (required === undefined || expense.is_required === required) &&
        (group === undefined || expense.group === group),
    )
    .map((expense) => ({
      label: expense.label,
      ...amountForSightmap(unit, expense),
    }));
}

async function sightmapDataUrl(embedUrl) {
  const html = await fetchText(embedUrl);
  const match = decodeEntities(html).match(
    /https:\/\/sightmap\.com\/app\/api\/v1\/[^"'\\\s<]+\/sightmaps\/\d+/,
  );
  if (!match) throw new Error(`${embedUrl} did not expose a SightMap API URL`);
  return match[0];
}

async function scrapeSightmap(source, now) {
  const dataUrl = await sightmapDataUrl(source.embedUrl);
  const payload = await fetchJson(dataUrl);
  if (!payload?.data || !Array.isArray(payload.data.floor_plans)) {
    throw new Error(`${source.propertyId} returned an invalid SightMap payload`);
  }
  const plans = new Map(
    payload.data.floor_plans.map((plan) => [String(plan.id), plan]),
  );

  return (payload.data.units ?? [])
    .map((unit) => {
      const plan = plans.get(String(unit.floor_plan_id));
      if (!plan || Number(plan.bedroom_count) !== 1) return null;
      if (restrictedPlanPattern.test(floorplanName(plan.name))) return null;
      const baths = numberValue(plan.bathroom_count);
      if (baths !== null && (baths < 1 || baths >= 2)) return null;
      const rent = numberValue(unit.price);
      const availableDate = isoDate(unit.available_on, now);
      if (rent === null || !availableDate) return null;
      const recommendedLeaseMonths =
        Number.parseInt(unit.display_lease_term, 10) || null;
      const totalMonthlyPrice = Array.isArray(unit.total_price)
        ? numberValue(unit.total_price[0])
        : numberValue(unit.total_price);
      return {
        id: `${source.propertyId}-${String(unit.unit_number).toLowerCase()}`,
        propertyId: source.propertyId,
        unit: `#${unit.unit_number}`,
        floorplan: floorplanName(plan.name),
        beds: 1,
        baths: 1,
        sqft: numberValue(unit.area) ?? 0,
        rent,
        totalMonthlyPrice,
        availableDate,
        recommendedLeaseMonths,
        leaseTerms:
          recommendedLeaseMonths && rent
            ? [{ months: recommendedLeaseMonths, baseRent: rent }]
            : [],
        mandatoryMonthlyFees: sightmapFeeLines(unit, "monthly", {
          required: true,
        }),
        optionalMonthlyFees: sightmapFeeLines(unit, "optional", {
          required: false,
          group: "parking",
        }),
        oneTimeFees: sightmapFeeLines(unit, "additional", { required: true }),
        sourceUrl: `${source.embedUrl}?unit_number=${encodeURIComponent(unit.unit_number)}`,
        precision: "unit",
        capturedAt: now.toISOString(),
      };
    })
    .filter(Boolean);
}

function extractBalanced(source, start, open = "{", close = "}") {
  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (stringQuote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === stringQuote) stringQuote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      stringQuote = char;
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

function extractJsonAssignment(html, assignment) {
  const assignmentIndex = html.indexOf(assignment);
  if (assignmentIndex < 0) throw new Error(`${assignment} was not found`);
  const start = html.indexOf("{", assignmentIndex + assignment.length);
  const objectText = start < 0 ? null : extractBalanced(html, start);
  if (!objectText) throw new Error(`${assignment} did not contain an object`);
  return JSON.parse(objectText);
}

function parseMoneyRange(value) {
  const text = decodeEntities(value).trim();
  const numbers = [...text.matchAll(/\$?\s*([\d,]+(?:\.\d+)?)/g)].map((match) =>
    Number(match[1].replaceAll(",", "")),
  );
  return {
    amount: numbers[0] ?? null,
    ...(numbers.length > 1 ? { amountMax: numbers[1] } : {}),
    ...(!numbers.length && text ? { note: text } : {}),
  };
}

function equityFee(row) {
  const note = String(row.CHGSUBDESC ?? "").trim();
  const value = parseMoneyRange(row.AMOUNT);
  return {
    label: String(row.CHGDESC ?? row.Description ?? "Fee").trim(),
    ...value,
    ...(note ? { note: value.note ? `${note}; ${value.note}` : note } : {}),
  };
}

async function scrapeEquity(source, property, now) {
  const html = await fetchText(property.website);
  const payload = extractJsonAssignment(html, "ea5.unitAvailability");
  if (!Array.isArray(payload.BedroomTypes)) {
    throw new Error(`${property.name} did not return Equity bedroom inventory`);
  }
  const units = payload.BedroomTypes.filter(
    (bedroom) => Number(bedroom.BedroomCount) === 1,
  ).flatMap((bedroom) => bedroom.AvailableUnits ?? []);

  return units
    .filter((unit) => {
      const name = String(unit.FloorplanName ?? "");
      return unit.AFFORDABLE !== "Y" && !restrictedPlanPattern.test(name);
    })
    .map((unit) => {
      const rent = numberValue(unit.BestTerm?.Price);
      const availableDate = isoDate(unit.AvailableDate, now);
      if (rent === null || !availableDate) return null;
      const recommendedLeaseMonths = numberValue(unit.BestTerm?.Length);
      const leaseTerms = (unit.Terms ?? [])
        .map((term) => ({
          months: numberValue(term.Length),
          baseRent: numberValue(term.Price),
        }))
        .filter((term) => term.months && term.baseRent !== null);
      const monthlyFees = (unit.MonthlyRecurringFees ?? []).filter(
        (fee) =>
          !/monthly apartment rent|estimated monthly charges/i.test(
            String(fee.CHGDESC ?? ""),
          ),
      );
      const oneTimeFees = (unit.OneTimeMoveInFees ?? []).filter(
        (fee) => !/first month'?s rent/i.test(String(fee.CHGDESC ?? "")),
      );
      const buildingId = String(unit.BuildingId ?? "").trim();
      const unitId = String(unit.UnitId ?? unit.UnitNumber ?? "").trim();
      const ledgerId = String(unit.LedgerId ?? "").trim();
      return {
        id: `${source.propertyId}-${buildingId || "building"}-${unitId}`.toLowerCase(),
        propertyId: source.propertyId,
        unit: `#${unit.UnitNumber ?? unitId}`,
        floorplan: String(unit.FloorplanName ?? "1 Bedroom"),
        beds: 1,
        baths: 1,
        sqft: numberValue(unit.SqFt) ?? 0,
        rent,
        totalMonthlyPrice: numberValue(
          unit.EstimatedMonthlyCosts?.[0]?.AMOUNT,
        ),
        availableDate,
        recommendedLeaseMonths,
        leaseTerms,
        mandatoryMonthlyFees: monthlyFees.map(equityFee),
        optionalMonthlyFees: (unit.AdditionalOptionsFees ?? []).map(equityFee),
        oneTimeFees: oneTimeFees.map(equityFee),
        sourceUrl: new URL(
          `/UnitFees/${encodeURIComponent(ledgerId)}/${encodeURIComponent(buildingId)}/${encodeURIComponent(unitId)}`,
          property.website,
        ).toString(),
        precision: "unit",
        capturedAt: now.toISOString(),
      };
    })
    .filter(Boolean);
}

async function scrapeRealPageV2(now, property) {
  const html = await fetchText(property.website);
  const propertyId =
    html.match(/propertyId\s*[:=]\s*['"](\d+)['"]/i)?.[1] ??
    html.match(/siteid\s*[:=]\s*['"](\d+)['"]/i)?.[1];
  const apiKey =
    html.match(/apiKey\s*[:=]\s*['"]([0-9a-f-]{20,})['"]/i)?.[1] ??
    html.match(/x-ws-authkey["']?\s*[:=]\s*['"]([0-9a-f-]{20,})/i)?.[1];
  if (!propertyId || !apiKey) {
    throw new Error(`${property.name} did not expose its RealPage API config`);
  }
  const headers = { "x-ws-authkey": apiKey };
  const floorplansPayload = await fetchJson(
    `https://api.ws.realpage.com/v2/property/${propertyId}/floorplans`,
    { headers },
  );
  const leaseTerms = Array.from({ length: 7 }, (_, index) => index + 6).join(",");
  const unitsUrl = new URL(
    `https://api.ws.realpage.com/v2/property/${propertyId}/units`,
  );
  unitsUrl.search = new URLSearchParams({
    available: "true",
    honordisplayorder: "true",
    siteid: propertyId,
    bestprice: "true",
    leaseterm: leaseTerms,
    baseRent: "true",
    dateneeded: now.toISOString().slice(0, 10),
  }).toString();
  const unitsPayload = await fetchJson(unitsUrl, { headers });
  const floorplans = Array.isArray(floorplansPayload)
    ? floorplansPayload
    : floorplansPayload.floorplans ?? floorplansPayload.results ?? [];
  const units = Array.isArray(unitsPayload)
    ? unitsPayload
    : unitsPayload.units ?? unitsPayload.results ?? [];
  if (!Array.isArray(floorplans) || !Array.isArray(units)) {
    throw new Error(`${property.name} returned an invalid RealPage payload`);
  }
  const plans = new Map(
    floorplans.map((plan) => [String(plan.id ?? plan.floorplanId), plan]),
  );
  return units
    .filter((unit) => Number(unit.numberOfBeds ?? unit.beds) === 1)
    .map((unit) => {
      const plan = plans.get(String(unit.floorplanId)) ?? {};
      const planName = String(plan.name ?? unit.floorplanName ?? "1 Bedroom");
      if (restrictedPlanPattern.test(planName)) return null;
      const bathCount = numberValue(unit.numberOfBaths ?? plan.bathRooms);
      if (bathCount !== null && (bathCount < 1 || bathCount >= 2)) return null;
      const rent = numberValue(unit.rent ?? unit.baseRent);
      const availableDate = isoDate(
        unit.internalAvailableDate ?? unit.availableDate,
        now,
      );
      if (rent === null || !availableDate) return null;
      const recommendedLeaseMonths = numberValue(
        unit.minLeaseTermInMonth ?? unit.leaseTerm,
      );
      const unitId = String(unit.id ?? unit.unitId ?? unit.unitNumber);
      return {
        id: `201-marshall-${unitId}`.toLowerCase(),
        propertyId: "201-marshall",
        unit: `#${unit.unitNumber ?? unitId}`,
        floorplan: planName,
        beds: 1,
        baths: 1,
        sqft: numberValue(unit.squareFeet ?? plan.squareFeet) ?? 0,
        rent,
        totalMonthlyPrice: numberValue(unit.totalRent),
        availableDate,
        recommendedLeaseMonths,
        leaseTerms: recommendedLeaseMonths
          ? [{ months: recommendedLeaseMonths, baseRent: rent }]
          : [],
        mandatoryMonthlyFees: [],
        optionalMonthlyFees: [],
        oneTimeFees: [],
        sourceUrl: `${property.website.replace(/\/$/, "")}/floorplans?unitId=${encodeURIComponent(unitId)}`,
        precision: "unit",
        capturedAt: now.toISOString(),
      };
    })
    .filter(Boolean);
}

async function g5Graphql(query, variables) {
  const payload = await fetchJson("https://inventory.g5marketingcloud.com/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }
  return payload.data;
}

async function scrapeFranklin299(now, property) {
  const floorplansUrl = new URL(
    "/apartments/ca/redwood-city/floor-plans",
    property.website,
  ).toString();
  const html = await fetchText(floorplansUrl);
  const configText = html.match(
    /<script[^>]+id=["']floor-plans-plus-config["'][^>]*>([\s\S]*?)<\/script>/i,
  )?.[1];
  if (!configText) throw new Error("Franklin 299 did not expose G5 inventory config");
  const config = JSON.parse(decodeEntities(configText));
  const locationUrn = config.locationUrn ?? config.location_urn;
  if (!locationUrn) throw new Error("Franklin 299 G5 location URN is missing");
  const date = now.toISOString().slice(0, 10);
  const data = await g5Graphql(
    `query ApartmentComplex($locationUrn:String!,$moveInDate:String!){
      apartmentComplex(locationUrn:$locationUrn){
        floorplans(beds:[1],moveInDate:$moveInDate){
          id name beds baths sqft sqftDisplay startingRate totalRentStarting
          rateDisplay totalRentDisplay leaseTermBasisMin totalAvailableUnits
          unitsAvailableByFilters(moveInDate:$moveInDate,limit:50)
        }
      }
    }`,
    { locationUrn, moveInDate: date },
  );
  const floorplans = data?.apartmentComplex?.floorplans;
  if (!Array.isArray(floorplans)) {
    throw new Error("Franklin 299 returned an invalid G5 payload");
  }
  const listings = [];
  for (const plan of floorplans) {
    if (Number(plan.beds) !== 1 || restrictedPlanPattern.test(plan.name)) continue;
    const bathCount = numberValue(plan.baths);
    if (bathCount !== null && (bathCount < 1 || bathCount >= 2)) continue;
    if (!Number(plan.unitsAvailableByFilters ?? plan.totalAvailableUnits)) continue;
    const unitData = await g5Graphql(
      `query Units($floorplanId:Int!,$limit:Int,$moveInDate:String,$locationUrn:String){
        units(floorplanId:$floorplanId,limit:$limit,moveInDate:$moveInDate,locationUrn:$locationUrn){
          id externalId name displayName building sqftDisplay availabilityDate
          prices{id priceType formattedPrice value leaseTermBasisMin}
          callToActions{name url actionType redirectUrl redirectUrlActionType isExternal}
          floorplan{name beds baths sqft}
        }
      }`,
      {
        floorplanId: Number(plan.id),
        limit: 50,
        moveInDate: date,
        locationUrn,
      },
    );
    for (const unit of unitData?.units ?? []) {
      const price =
        unit.prices?.find((item) => /rate|min.?rent/i.test(item.priceType)) ??
        unit.prices?.[0];
      const rent = numberValue(price?.value ?? price?.formattedPrice);
      const availableDate = isoDate(unit.availabilityDate, now);
      if (rent === null || !availableDate) continue;
      const cta = unit.callToActions?.find(
        (item) => item.url || item.redirectUrl,
      );
      const unitId = String(unit.externalId ?? unit.id ?? unit.name);
      listings.push({
        id: `franklin-299-${unitId}`.toLowerCase(),
        propertyId: "franklin-299",
        unit: `#${unit.displayName ?? unit.name ?? unitId}`,
        floorplan: String(unit.floorplan?.name ?? plan.name),
        beds: 1,
        baths: 1,
        sqft: numberValue(unit.floorplan?.sqft ?? unit.sqftDisplay) ?? 0,
        rent,
        totalMonthlyPrice: numberValue(plan.totalRentStarting),
        availableDate,
        recommendedLeaseMonths: numberValue(price?.leaseTermBasisMin),
        leaseTerms: [],
        mandatoryMonthlyFees: [],
        optionalMonthlyFees: [],
        oneTimeFees: [],
        sourceUrl: cta?.url ?? cta?.redirectUrl ?? floorplansUrl,
        precision: cta ? "unit" : "floorplan",
        capturedAt: now.toISOString(),
      });
    }
  }
  return listings;
}

function rentCafeAvailable(unit) {
  const status = String(unit.UnitStatus ?? "");
  if (/occupied no notice|notice rented|occupied rented/i.test(status)) return false;
  return Boolean(unit.AvailableDate);
}

async function scrapeLark(now) {
  const apiToken = process.env.RENTCAFE_API_TOKEN;
  if (!apiToken) throw new Error("RENTCAFE_API_TOKEN is not configured");
  const apiUrl = new URL("https://api.rentcafe.com/rentcafeapi.aspx");
  apiUrl.search = new URLSearchParams({
    requestType: "apartmentavailability",
    apiToken,
    propertyId: "1333368",
    showallunit: "1",
  }).toString();
  const payload = await fetchJson(apiUrl);
  if (!Array.isArray(payload)) throw new Error("The Lark returned invalid RentCafe data");
  return payload
    .filter(
      (unit) =>
        Number(unit.Beds) === 1 &&
        numberValue(unit.Baths) >= 1 &&
        numberValue(unit.Baths) < 2 &&
        !restrictedPlanPattern.test(String(unit.FloorplanName ?? "")) &&
        rentCafeAvailable(unit),
    )
    .map((unit) => {
      const rent = numberValue(unit.MinimumRent ?? unit.MaximumRent);
      const availableDate = isoDate(unit.AvailableDate, now);
      if (rent === null || !availableDate) return null;
      const unitId = String(unit.ApartmentId ?? unit.ApartmentName);
      return {
        id: `the-lark-${unitId}`.toLowerCase(),
        propertyId: "the-lark",
        unit: `#${unit.ApartmentName ?? unitId}`,
        floorplan: String(unit.FloorplanName ?? "1 Bedroom"),
        beds: 1,
        baths: 1,
        sqft: numberValue(unit.SQFT) ?? 0,
        rent,
        totalMonthlyPrice: null,
        availableDate,
        recommendedLeaseMonths: null,
        leaseTerms: [],
        mandatoryMonthlyFees: [],
        optionalMonthlyFees: [],
        oneTimeFees: unit.Deposit
          ? [{ label: "Deposit", ...parseMoneyRange(unit.Deposit) }]
          : [],
        sourceUrl:
          unit.ApplyOnlineURL ??
          "https://www.larksanmateo.com/floorplans",
        precision: unit.ApplyOnlineURL ? "unit" : "floorplan",
        capturedAt: now.toISOString(),
      };
    })
    .filter(Boolean);
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next;
      next += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

async function scrapeIndigo(now, property) {
  const html = await fetchText(property.website);
  const oneBedroomUrls = [
    ...new Set(
      [...html.matchAll(/href=["']([^"']*\/floor-plan\/1-bedroom\/[^"']+\.html)["']/gi)]
        .map((match) => new URL(decodeEntities(match[1]), property.website).toString()),
    ),
  ];
  if (!oneBedroomUrls.length) {
    throw new Error("Indigo did not expose its one-bedroom floorplans");
  }
  const pages = await mapLimit(oneBedroomUrls, 6, async (url) => ({
    url,
    html: await fetchText(url),
  }));
  const unitPayloads = await mapLimit(pages, 6, async ({ url, html: pageHtml }) => {
    const jsonPath = pageHtml.match(
      /data-units-json-path=["']([^"']+)["']/i,
    )?.[1];
    if (!jsonPath) throw new Error(`${url} did not expose AIR unit inventory`);
    const floorplanId =
      pageHtml.match(/floorplan-id=["']([^"']+)["']/i)?.[1] ?? "floorplan";
    return {
      url,
      floorplanId,
      payload: await fetchJson(new URL(jsonPath, property.website)),
    };
  });
  const listings = [];
  for (const { url, floorplanId, payload } of unitPayloads) {
    if (!payload || payload.success !== true || !Array.isArray(payload.units)) {
      throw new Error(`${url} returned invalid AIR inventory`);
    }
    for (const unit of payload.units) {
      const rent = numberValue(
        unit.minRent ?? unit.minimumRent ?? unit.rent ?? unit.price,
      );
      const availableDate = isoDate(
        unit.availableDate ?? unit.availabilityDate ?? unit.dateAvailable,
        now,
      );
      if (rent === null || !availableDate) continue;
      const unitId = String(
        unit.propertyUnitID ?? unit.unitId ?? unit.unitNumber ?? unit.id,
      );
      listings.push({
        id: `indigo-${unitId}`.toLowerCase(),
        propertyId: "indigo",
        unit: `#${unit.unitNumber ?? unit.name ?? unitId}`,
        floorplan: String(unit.floorplanName ?? unit.planName ?? floorplanId),
        beds: 1,
        baths: 1,
        sqft: numberValue(unit.squareFeet ?? unit.sqft) ?? 0,
        rent,
        totalMonthlyPrice: numberValue(unit.totalRent),
        availableDate,
        recommendedLeaseMonths: numberValue(unit.leaseTerm),
        leaseTerms: [],
        mandatoryMonthlyFees: [],
        optionalMonthlyFees: [],
        oneTimeFees: [],
        sourceUrl: unit.applyUrl ?? unit.url ?? url,
        precision: unit.applyUrl || unit.url ? "unit" : "floorplan",
        capturedAt: now.toISOString(),
      });
    }
  }
  return listings;
}

async function scrapeRealm() {
  const availabilityUrl =
    "https://www.on-site.com/web/online_app3/427405/step/floorplan";
  const html = await fetchText(availabilityUrl);
  const availabilityIndex = html.indexOf("unit_availability");
  if (availabilityIndex < 0) {
    throw new Error("Realm did not expose On-Site unit inventory");
  }
  const availabilityText = html.slice(availabilityIndex);
  if (!/num_bedrooms\s*:\s*1(?:\D|$)/.test(availabilityText)) return [];
  throw new Error(
    "Realm currently exposes 1BR inventory in a format that requires a parser update",
  );
}

let bayMeadowsCache;

async function bayMeadowsInventory(now) {
  if (bayMeadowsCache) return bayMeadowsCache;
  bayMeadowsCache = (async () => {
    const pageUrl = "https://apartmentcollectionatbaymeadows.com/floor-plans/";
    const html = await fetchText(pageUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
    });
    const payload = extractJsonAssignment(html, "var rentcafeData");
    if (
      !payload.floorplans ||
      !payload.availability ||
      !payload.property
    ) {
      throw new Error("Bay Meadows returned invalid RentCafe inventory");
    }
    const propertyIds = {
      fieldhouse: "field-house",
      quimby: "quimby",
      "the-russell": "the-russell",
      hawthorne: "hawthorne",
      "the-morgan": "the-morgan",
    };
    const listingsByProperty = new Map(
      Object.values(propertyIds).map((propertyId) => [propertyId, []]),
    );
    for (const [unitId, unit] of Object.entries(payload.availability)) {
      const propertyId = propertyIds[unit.propertySlug];
      const plan = payload.floorplans[String(unit.floorplan_id)];
      if (!propertyId || !plan || Number(plan.beds) !== 1) continue;
      if (
        restrictedPlanPattern.test(
          `${plan.floorplanName ?? ""} ${unit.apartmentName ?? ""}`,
        )
      ) {
        continue;
      }
      const bathCount = numberValue(plan.baths);
      if (bathCount !== null && (bathCount < 1 || bathCount >= 2)) continue;
      const rent = numberValue(unit.price);
      const availableDate = isoDate(unit.availableDate, now);
      if (rent === null || !availableDate) continue;
      const totalFees = numberValue(payload.total_fees);
      listingsByProperty.get(propertyId).push({
        id: `${propertyId}-${unitId}`.toLowerCase(),
        propertyId,
        unit: `#${unit.apartmentName ?? unitId}`,
        floorplan: String(plan.floorplanName ?? "1 Bedroom"),
        beds: 1,
        baths: 1,
        sqft: numberValue(unit.sqft) ?? 0,
        rent,
        totalMonthlyPrice: totalFees === null ? null : rent + totalFees,
        availableDate,
        recommendedLeaseMonths: null,
        leaseTerms: [],
        mandatoryMonthlyFees:
          totalFees === null
            ? []
            : [{ label: "Required monthly fees", amount: totalFees }],
        optionalMonthlyFees: [],
        oneTimeFees: [],
        sourceUrl: unit.applicationUrl ?? pageUrl,
        precision: unit.applicationUrl ? "unit" : "floorplan",
        capturedAt: now.toISOString(),
      });
    }
    return listingsByProperty;
  })();
  return bayMeadowsCache;
}

async function scrapeBayMeadows(now, property) {
  const listingsByProperty = await bayMeadowsInventory(now);
  if (!listingsByProperty.has(property.id)) {
    throw new Error(`Bay Meadows did not recognize ${property.name}`);
  }
  return listingsByProperty.get(property.id);
}

async function scrapePrometheus(now, property, source) {
  const date = now.toISOString().slice(0, 10);
  const url = `https://shopping.prometheusapartments-prod-west2.com/${source.prometheusId}/available-units?date=${date}`;
  const payload = await fetchJson(url, {
    headers: { origin: "https://prometheusapartments.com" },
  });
  if (!Array.isArray(payload)) {
    throw new Error(`${property.name} returned invalid Prometheus inventory`);
  }
  return payload
    .filter((unit) => {
      const bathCount = numberValue(unit.bathrooms);
      return (
        Number(unit.bedrooms) === 1 &&
        bathCount >= 1 &&
        bathCount < 2 &&
        !restrictedPlanPattern.test(String(unit.floorPlanName ?? ""))
      );
    })
    .map((unit) => {
      const rent = numberValue(unit.bestRent ?? unit.rent);
      const availableDate = isoDate(unit.madeReadyDate, now);
      if (rent === null || !availableDate) return null;
      const recommendedLeaseMonths = numberValue(unit.bestTerm);
      const unitNumber = String(unit.unitNumber ?? unit.unitID);
      return {
        id: `${property.id}-${unit.unitID ?? unitNumber}`.toLowerCase(),
        propertyId: property.id,
        unit: `#${unit.buildingNumber ? `${unit.buildingNumber}-` : ""}${unitNumber}`,
        floorplan: String(unit.floorPlanName ?? "1 Bedroom"),
        beds: 1,
        baths: 1,
        sqft: numberValue(unit.area) ?? 0,
        rent,
        totalMonthlyPrice: null,
        availableDate,
        recommendedLeaseMonths,
        leaseTerms: recommendedLeaseMonths
          ? [{ months: recommendedLeaseMonths, baseRent: rent }]
          : [],
        mandatoryMonthlyFees: [],
        optionalMonthlyFees: [],
        oneTimeFees: unit.deposit
          ? [{ label: "Deposit", amount: numberValue(unit.deposit) }]
          : [],
        sourceUrl: `${property.website.replace(/\/$/, "")}/unit-${encodeURIComponent(unitNumber)}`,
        precision: "unit",
        capturedAt: now.toISOString(),
      };
    })
    .filter(Boolean);
}

async function scrapeEncore(now) {
  const scriptUrl =
    "https://encoreredwoodcity.com/wp-content/themes/client-theme/includes/js/units.js";
  const javascript = await fetchText(scriptUrl);
  if (!/\bunits\s*=\s*\[/.test(javascript)) {
    throw new Error("Encore did not expose its official unit map");
  }
  const objects = [
    ...javascript.matchAll(/\{unitNumber:[\s\S]*?\}(?=,|\s*\])/g),
  ].map((match) => match[0]);
  if (objects.length < 20) {
    throw new Error("Encore returned an incomplete unit map");
  }
  return objects
    .map((objectText) => {
      const value = (field) =>
        objectText.match(
          new RegExp(`${field}:\\s*(?:"([^"]*)"|'([^']*)'|([^,}]+))`),
        )?.slice(1).find((item) => item !== undefined)?.trim() ?? "";
      if (Number(value("unitBedrooms")) !== 1) return null;
      if (numberValue(value("unitBathrooms")) !== 1) return null;
      const rent = numberValue(value("unitCost"));
      const availableDate = isoDate(value("unitAvailable"), now);
      if (rent === null || !availableDate) return null;
      const unitNumber = value("unitNumber");
      const unitLink = value("unitLink");
      return {
        id: `encore-redwood-city-${unitNumber}`.toLowerCase(),
        propertyId: "encore-redwood-city",
        unit: `#${unitNumber}`,
        floorplan: value("unitPlan") || "1 Bedroom",
        beds: 1,
        baths: 1,
        sqft: numberValue(value("unitSqft")) ?? 0,
        rent,
        totalMonthlyPrice: null,
        availableDate,
        recommendedLeaseMonths: null,
        leaseTerms: [],
        mandatoryMonthlyFees: [],
        optionalMonthlyFees: [],
        oneTimeFees: [],
        sourceUrl: unitLink
          ? new URL(unitLink, "https://encoreredwoodcity.com/availability/").toString()
          : `https://encoreredwoodcity.com/availability/#unit-${encodeURIComponent(unitNumber)}`,
        precision: "unit",
        capturedAt: now.toISOString(),
      };
    })
    .filter(Boolean);
}

let automationBrowser;
let automationContext;
let automationPage;

async function getAutomationPage() {
  if (automationPage) return automationPage;
  const { chromium } = await import("playwright");
  const headed =
    process.env.PLAYWRIGHT_HEADED === "1" ||
    (process.env.PLAYWRIGHT_HEADED === undefined &&
      process.platform === "darwin");
  const launchOptions = {
    headless: !headed,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  };
  try {
    automationBrowser = await chromium.launch({
      ...launchOptions,
      ...(process.platform === "darwin" ? { channel: "chrome" } : {}),
    });
  } catch {
    automationBrowser = await chromium.launch(launchOptions);
  }
  automationContext = await automationBrowser.newContext({
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
    viewport: { width: 1440, height: 1000 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  });
  await automationContext.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  automationPage = await automationContext.newPage();
  return automationPage;
}

async function openAutomationPage(url) {
  const page = await getAutomationPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 75_000 });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const title = await page.title();
    if (!/just a moment|attention required|checking your browser/i.test(title)) {
      break;
    }
    await page.waitForTimeout(1_000);
  }
  await page.waitForTimeout(1_000);
  const title = await page.title();
  if (/just a moment|attention required|checking your browser/i.test(title)) {
    throw new Error(`${url} browser challenge did not finish`);
  }
  return page;
}

async function closeAutomationBrowser() {
  await automationBrowser?.close();
  automationBrowser = undefined;
  automationContext = undefined;
  automationPage = undefined;
}

function browserSourceUrl(url, unit) {
  const target = new URL(url);
  target.searchParams.set("unit", unit);
  target.hash = "FloorplanGroupContent";
  return target.toString();
}

async function scrapeEssex(now, property, source) {
  const page = await openAutomationPage(property.website);
  const date = now.toISOString().slice(0, 10);
  const apiUrl = `https://www.essexapartmenthomes.com/api/properties/${source.essexId}/availability?start_date=${date}&end_date=${date}&format=spa`;
  const payload = await page.evaluate(async (url) => {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Essex API returned HTTP ${response.status}`);
    return response.json();
  }, apiUrl);
  const units = payload?.result?.units;
  if (!Array.isArray(units)) {
    throw new Error(`${property.name} returned invalid Essex inventory`);
  }
  return units
    .filter((unit) => {
      const baths = numberValue(unit.baths);
      return (
        Number(unit.beds) === 1 &&
        baths >= 1 &&
        baths < 2 &&
        !restrictedPlanPattern.test(
          `${unit.floorplan_name ?? ""} ${unit.name ?? ""}`,
        )
      );
    })
    .map((unit) => {
      const rent = numberValue(unit.minimum_rent);
      const availableDate = isoDate(unit.availability_date, now);
      if (rent === null || !availableDate) return null;
      const unitId = String(unit.unit_id ?? unit.name);
      const unitNumber = String(unit.name ?? unitId);
      const amenityText = (unit.amenities ?? [])
        .map((amenity) =>
          typeof amenity === "string"
            ? amenity
            : amenity.name ?? amenity.description ?? "",
        )
        .join(" ");
      const utilityServiceFee = amenityText.match(
        /Mandatory Fee:\s*([^$]+?)\s*\$([\d.]+)\s*\/?\s*month/i,
      );
      const directUrl =
        unit.application_url ??
        unit.apply_url ??
        unit.url ??
        browserSourceUrl(property.website, unitNumber);
      return {
        id: `${property.id}-${unitId}`.toLowerCase(),
        propertyId: property.id,
        unit: `#${unitNumber}`,
        floorplan: String(unit.floorplan_name ?? "1 Bedroom"),
        beds: 1,
        baths: 1,
        sqft: numberValue(unit.sqft) ?? 0,
        rent,
        totalMonthlyPrice: numberValue(unit.total_monthly_price),
        availableDate,
        recommendedLeaseMonths: null,
        leaseTerms: [],
        mandatoryMonthlyFees: utilityServiceFee
          ? [
              {
                label: utilityServiceFee[1].trim(),
                amount: Number(utilityServiceFee[2]),
                note: "Utilities are additionally charged based on usage.",
              },
            ]
          : [],
        optionalMonthlyFees: [],
        oneTimeFees: [],
        sourceUrl: new URL(directUrl, property.website).toString(),
        precision: "unit",
        capturedAt: now.toISOString(),
      };
    })
    .filter(Boolean);
}

function rentCafeDirectorySections(text) {
  const lines = text
    .split(/[\r\n\t]+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const sections = [];
  const planPattern =
    /^1 Bed \/ 1 Bath(?:s)? \/ ([\d,]+) Sqft$/i;
  const anyPlanPattern =
    /^(?:Studio|\d+ Beds?|(?:Loft|Den|Townhome) \/ \d+ Beds?) \/ \d+(?:\.\d+)? Baths? \/ [\d,]+ Sqft$/i;
  for (let index = 1; index < lines.length; index += 1) {
    const planMatch = lines[index].match(planPattern);
    if (!planMatch) continue;
    let end = lines.length;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (anyPlanPattern.test(lines[cursor])) {
        end = cursor - 1;
        break;
      }
    }
    sections.push({
      floorplan: lines[index - 1],
      sqft: Number(planMatch[1].replaceAll(",", "")),
      lines: lines.slice(index + 1, end),
    });
  }
  return sections;
}

async function scrapeRentCafeDirectory(now, property, source) {
  const page = await openAutomationPage(source.url);
  await page
    .locator("main")
    .waitFor({ state: "visible", timeout: 20_000 })
    .catch(() => {});
  const currentUrl = page.url();
  const expectedPropertyName = property.name
    .replace(/^100 Grand$/i, "One Hundred Grand")
    .replace(/^Anton Menlo$/i, "Anton Menlo");
  const pageHeading = await page.locator("main h1").first().textContent().catch(() => "");
  if (
    !pageHeading ||
    (!pageHeading.toLowerCase().includes(expectedPropertyName.toLowerCase()) &&
      !expectedPropertyName.toLowerCase().includes(pageHeading.toLowerCase()))
  ) {
    throw new Error(`${source.url} redirected to ${currentUrl}`);
  }
  const mainText = await page.locator("main").innerText();
  const rowLinks = await page.evaluate(() =>
    [...document.querySelectorAll("main table tr")].map((row) => {
      const unit = row.querySelector("th, td")?.textContent?.trim() ?? "";
      const link = row.querySelector("a[href]");
      const button = [...row.querySelectorAll("button")].find((item) =>
        /apply|view/i.test(item.textContent ?? ""),
      );
      const candidates = button
        ? [
            button.getAttribute("data-url"),
            button.getAttribute("data-href"),
            button.getAttribute("formaction"),
          ]
        : [];
      return {
        unit,
        url: link?.href ?? candidates.find(Boolean) ?? null,
      };
    }),
  );
  const rowLinkByUnit = new Map(
    rowLinks.filter((row) => row.unit).map((row) => [row.unit, row.url]),
  );
  const listings = [];
  for (const section of rentCafeDirectorySections(mainText)) {
    if (
      restrictedPlanPattern.test(
        `${section.floorplan} ${section.lines.join(" ")}`,
      )
    ) {
      continue;
    }
    for (let index = 0; index < section.lines.length - 2; index += 1) {
      const unit = section.lines[index];
      const rentText = section.lines[index + 1];
      const availabilityText = section.lines[index + 2];
      if (!/^[A-Za-z0-9-]+$/.test(unit) || !/^\$[\d,]+/.test(rentText)) {
        continue;
      }
      if (
        !/^(?:(?:Available\s+on\s+)?[A-Za-z]{3,9}\s+\d{1,2}|(?:Available\s*)?Now)$/i.test(
          availabilityText,
        )
      ) {
        continue;
      }
      const rent = numberValue(rentText);
      const availableDate = isoDate(availabilityText, now);
      if (rent === null || !availableDate) continue;
      const directUrl = rowLinkByUnit.get(unit);
      const usableDirectUrl =
        directUrl && !/^javascript:/i.test(directUrl) ? directUrl : null;
      listings.push({
        id: `${property.id}-${unit}`.toLowerCase(),
        propertyId: property.id,
        unit: `#${unit}`,
        floorplan: section.floorplan,
        beds: 1,
        baths: 1,
        sqft: section.sqft,
        rent,
        totalMonthlyPrice: null,
        availableDate,
        recommendedLeaseMonths: null,
        leaseTerms: [],
        mandatoryMonthlyFees: [],
        optionalMonthlyFees: [],
        oneTimeFees: [],
        sourceUrl: usableDirectUrl
          ? new URL(usableDirectUrl, source.url).toString()
          : browserSourceUrl(source.url, unit),
        precision: "unit",
        capturedAt: now.toISOString(),
      });
    }
  }
  return [...new Map(listings.map((listing) => [listing.id, listing])).values()];
}

async function scrapeRentCafeProperty(now, property, source) {
  const page = await openAutomationPage(source.url);
  await page
    .locator(".floorplan-section")
    .first()
    .waitFor({ state: "attached", timeout: 20_000 })
    .catch(() => {});
  const sections = await page.locator(".floorplan-section").evaluateAll((nodes) =>
    nodes.map((section) => ({
      floorplan:
        section.querySelector("h2, h3, .floorplan-title")?.textContent?.trim() ??
        "1 Bedroom",
      text: section.textContent ?? "",
      rows: [...section.querySelectorAll("tr.unit-container, tbody tr")].map(
        (row) => {
          const value = (selector) =>
            row.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ??
            "";
          const link = [...row.querySelectorAll("a[href]")].find((item) =>
            /apply|unitid|securecafe/i.test(
              `${item.textContent ?? ""} ${item.getAttribute("href") ?? ""}`,
            ),
          );
          return {
            unit: value(".td-card-name, th, td:first-child"),
            sqft: value(".td-card-sqft"),
            rent: value(".td-card-rent"),
            deposit: value(".td-card-deposit"),
            available: value(".td-card-available"),
            url: link?.href ?? null,
          };
        },
      ),
    })),
  );
  if (!sections.length) {
    throw new Error(`${property.name} did not expose RentCafe floorplans`);
  }
  const listings = [];
  for (const section of sections) {
    if (
      !/1\s*Bedroom\s*[|/]\s*1\s*Bathroom/i.test(section.text) ||
      restrictedPlanPattern.test(section.text)
    ) {
      continue;
    }
    const defaultSqft = numberValue(
      section.text.match(/([\d,]+)\s*(?:Sq\.?\s*Ft|Sqft)/i)?.[1],
    );
    for (const row of section.rows) {
      const unit = row.unit.replace(/^Apartment:\s*#?\s*/i, "").trim();
      const rent = numberValue(row.rent);
      const availableDate = isoDate(
        row.available.replace(/^Date Available:\s*/i, ""),
        now,
      );
      if (!unit || rent === null || !availableDate) continue;
      listings.push({
        id: `${property.id}-${unit}`.toLowerCase(),
        propertyId: property.id,
        unit: `#${unit.replace(/^#/, "")}`,
        floorplan: section.floorplan,
        beds: 1,
        baths: 1,
        sqft: numberValue(row.sqft) ?? defaultSqft ?? 0,
        rent,
        totalMonthlyPrice: null,
        availableDate,
        recommendedLeaseMonths: null,
        leaseTerms: [],
        mandatoryMonthlyFees: [],
        optionalMonthlyFees: [],
        oneTimeFees: row.deposit
          ? [{ label: "Deposit", ...parseMoneyRange(row.deposit) }]
          : [],
        sourceUrl: row.url
          ? new URL(row.url, source.url).toString()
          : browserSourceUrl(source.url, unit),
        precision: "unit",
        capturedAt: now.toISOString(),
      });
    }
  }
  return listings;
}

async function scrapeRentCafeBrowser(now, property, source) {
  return source.mode === "property"
    ? scrapeRentCafeProperty(now, property, source)
    : scrapeRentCafeDirectory(now, property, source);
}

function irvineFeeDetails() {
  return {
    mandatoryMonthlyFees: [
      {
        label: "Utility Billing Fee",
        amount: 5.55,
        note: "Maximum monthly fee; utilities are additionally usage based.",
      },
    ],
    optionalMonthlyFees: [
      { label: "Cat premium (per cat)", amount: 50 },
      { label: "Dog premium (per dog)", amount: 75 },
      { label: "Extra parking / garage", amount: null, note: "Varies by location." },
    ],
    oneTimeFees: [
      { label: "Application fee (per applicant)", amount: 45 },
      { label: "Holding deposit", amount: 200, amountMax: 600 },
      {
        label: "Security deposit",
        amount: 600,
        note: "May increase up to one month's rent.",
      },
    ],
  };
}

async function scrapeIrvine(now, property, source) {
  const page = await openAutomationPage(source.url);
  await page
    .getByRole("button", { name: /^Plan\s+[A-Za-z0-9]+$/i })
    .first()
    .waitFor({ state: "visible", timeout: 20_000 })
    .catch(() => {});
  const planButtons = page.locator("main button");
  const buttonCount = await planButtons.count();
  const clicked = new Set();
  for (let index = 0; index < buttonCount; index += 1) {
    const button = planButtons.nth(index);
    const name = (
      (await button.getAttribute("aria-label")) ??
      (await button.innerText().catch(() => ""))
    ).trim();
    if (!/^Plan\s+[A-Za-z0-9]+$/i.test(name) || clicked.has(name)) continue;
    const floorplanSummary = await button
      .locator("xpath=../..")
      .innerText()
      .catch(() => "");
    if (!/\b1 Bed\s*\/\s*1 Bath\b/i.test(floorplanSummary)) {
      continue;
    }
    clicked.add(name);
    await button.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  const lines = (await page.locator("main").innerText())
    .split(/[\r\n\t]+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const listings = [];
  for (let index = 0; index < lines.length - 2; index += 1) {
    if (
      !/^Plan\s+[A-Za-z0-9]+$/i.test(lines[index]) ||
      !/^(?:(?:Loft|Den)\s*\/\s*)?1 Bed\s*\/\s*1 Bath$/i.test(
        lines[index + 1],
      )
    ) {
      continue;
    }
    const floorplan = lines[index];
    const sqft = numberValue(lines[index + 2]);
    let end = lines.length;
    for (let cursor = index + 3; cursor < lines.length - 1; cursor += 1) {
      if (
        /^Plan\s+[A-Za-z0-9]+$/i.test(lines[cursor]) &&
        /\bBed\b.*\bBath\b/i.test(lines[cursor + 1])
      ) {
        end = cursor;
        break;
      }
    }
    const section = lines.slice(index + 3, end);
    if (restrictedPlanPattern.test(section.join(" "))) continue;
    for (let cursor = 0; cursor < section.length - 4; cursor += 1) {
      const unitMatch = section[cursor].match(/^(\S+)\s+(\S+)$/);
      if (
        !unitMatch ||
        !/^[\d,]+\s+Sq\./i.test(section[cursor + 1]) ||
        !/^\d+\s+mo\./i.test(section[cursor + 2]) ||
        !/^\$[\d,]+/.test(section[cursor + 3]) ||
        !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(section[cursor + 4])
      ) {
        continue;
      }
      const [, building, unit] = unitMatch;
      const rent = numberValue(section[cursor + 3]);
      const availableDate = isoDate(section[cursor + 4], now);
      const recommendedLeaseMonths = numberValue(section[cursor + 2]);
      if (rent === null || !availableDate) continue;
      listings.push({
        id: `${property.id}-${building}-${unit}`.toLowerCase(),
        propertyId: property.id,
        unit: `#${building}-${unit}`,
        floorplan,
        beds: 1,
        baths: 1,
        sqft: numberValue(section[cursor + 1]) ?? sqft ?? 0,
        rent,
        totalMonthlyPrice: null,
        availableDate,
        recommendedLeaseMonths,
        leaseTerms: recommendedLeaseMonths
          ? [{ months: recommendedLeaseMonths, baseRent: rent }]
          : [],
        ...irvineFeeDetails(),
        sourceUrl: browserSourceUrl(source.url, unit),
        precision: "unit",
        capturedAt: now.toISOString(),
      });
    }
  }
  return [...new Map(listings.map((listing) => [listing.id, listing])).values()];
}

function upsertSource(inventory, update, now) {
  let source = inventory.sources.find((item) => item.id === update.sourceId);
  if (!source) {
    source = {
      id: update.sourceId,
      label: update.label,
      status: "live",
      lastSuccessAt: now.toISOString(),
    };
    inventory.sources.push(source);
  } else {
    source.label = update.label;
    source.status = "live";
    source.lastSuccessAt = now.toISOString();
    delete source.lastError;
  }
}

async function main() {
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  const now = new Date();
  const originalPropertyIds = new Set(
    inventory.properties.map((property) => property.id),
  );
  inventory.properties = inventory.properties.filter(
    (property) => !excludedPropertyIds.has(property.id),
  );
  inventory.listings = inventory.listings.filter(
    (listing) => !excludedPropertyIds.has(listing.propertyId),
  );
  inventory.sources = inventory.sources.filter(
    (source) => !excludedPropertyIds.has(source.id),
  );
  for (const property of inventory.properties) {
    Object.assign(
      property,
      amenityReviews[property.id] ?? {
        airConditioning: false,
        inUnitWasherDryer: false,
      },
      propertyOverrides[property.id] ?? {},
    );
  }
  const eligiblePropertyIds = new Set(
    inventory.properties.map((property) => property.id),
  );
  inventory.listings = inventory.listings.filter((listing) =>
    eligiblePropertyIds.has(listing.propertyId),
  );
  inventory.sources = inventory.sources.filter((source) =>
    eligiblePropertyIds.has(source.id),
  );
  const propertyById = new Map(
    inventory.properties.map((property) => [property.id, property]),
  );
  const updates = [];
  const failures = [];

  async function runSource(source, scrape) {
    if (excludedPropertyIds.has(source.propertyId)) return;
    if (!originalPropertyIds.has(source.propertyId)) {
      throw new Error(`Unknown property ${source.propertyId}`);
    }
    if (amenityPolicyOnly || !eligiblePropertyIds.has(source.propertyId)) return;
    const property = propertyById.get(source.propertyId);
    try {
      const listings = await scrape(now, property, source);
      if (!Array.isArray(listings)) {
        throw new Error(`${property.name} scraper did not return an array`);
      }
      updates.push({ ...source, listings });
    } catch (error) {
      failures.push({
        ...source,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await runSource(
    { propertyId: "cirrus", sourceId: "cirrus", label: "Cirrus / RentCafe" },
    scrapeCirrus,
  );

  for (const source of sightmapSources) {
    await runSource(source, (_, __, currentSource) =>
      scrapeSightmap(currentSource, now),
    );
  }
  for (const source of equitySources) {
    await runSource(source, (_, property, currentSource) =>
      scrapeEquity(currentSource, property, now),
    );
  }
  for (const source of fixedSources) {
    await runSource(source, source.scrape);
  }
  try {
    for (const source of essexSources) {
      await runSource(source, scrapeEssex);
    }
    for (const source of rentCafeBrowserSources) {
      await runSource(source, scrapeRentCafeBrowser);
    }
    for (const source of irvineSources) {
      await runSource(source, scrapeIrvine);
    }
  } finally {
    await closeAutomationBrowser();
  }

  for (const update of updates) {
    inventory.listings = [
      ...inventory.listings.filter(
        (listing) => listing.propertyId !== update.propertyId,
      ),
      ...update.listings,
    ];
    const property = propertyById.get(update.propertyId);
    property.inventoryStatus = "live";
    delete property.inventoryNote;
    upsertSource(inventory, update, now);
  }

  for (const failure of failures) {
    const source = inventory.sources.find((item) => item.id === failure.sourceId);
    if (source) {
      source.lastAttemptAt = now.toISOString();
      source.lastError = failure.message;
    }
    const property = propertyById.get(failure.propertyId);
    const hasSnapshot = inventory.listings.some(
      (listing) => listing.propertyId === failure.propertyId,
    );
    if (property?.inventoryStatus === "onboarding" && !hasSnapshot) {
      property.inventoryStatus = "blocked";
      property.inventoryNote = `官网动态库存读取失败；每日任务会自动重试。${failure.message}`;
    }
  }

  for (const unavailable of unavailableProperties) {
    const property = propertyById.get(unavailable.propertyId);
    if (!property) continue;
    property.inventoryStatus = "blocked";
    property.inventoryNote = unavailable.note;
    let source = inventory.sources.find(
      (item) => item.id === unavailable.propertyId,
    );
    if (!source) {
      source = {
        id: unavailable.propertyId,
        label: unavailable.label,
        status: "watching",
        lastSuccessAt: null,
      };
      inventory.sources.push(source);
    } else {
      source.label = unavailable.label;
      source.status = "watching";
    }
  }

  if (!amenityPolicyOnly) inventory.updatedAt = now.toISOString();
  inventory.listings.sort((a, b) => {
    const propertyOrder =
      inventory.properties.findIndex((property) => property.id === a.propertyId) -
      inventory.properties.findIndex((property) => property.id === b.propertyId);
    return (
      propertyOrder ||
      a.availableDate.localeCompare(b.availableDate) ||
      a.rent - b.rent
    );
  });
  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);

  const listingCount = updates.reduce(
    (count, update) => count + update.listings.length,
    0,
  );
  process.stdout.write(
    `Updated ${updates.length} official sources with ${listingCount} current 1B1B listings.\n`,
  );
  if (failures.length) {
    process.stdout.write(
      `Retained previous snapshots for ${failures.length} failed sources:\n${failures
        .map((failure) => `- ${failure.propertyId}: ${failure.message}`)
        .join("\n")}\n`,
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
