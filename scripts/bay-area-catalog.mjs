export const bayAreaRegions = ["sf", "peninsula", "south-bay", "east-bay"];

const citiesByRegion = {
  sf: new Set(["San Francisco"]),
  peninsula: new Set([
    "Daly City",
    "Colma",
    "South San Francisco",
    "San Bruno",
    "Millbrae",
    "Burlingame",
    "Hillsborough",
    "San Mateo",
    "Foster City",
    "Belmont",
    "San Carlos",
    "Redwood City",
    "Menlo Park",
    "Atherton",
    "East Palo Alto",
    "Palo Alto",
  ]),
  "south-bay": new Set([
    "Mountain View",
    "Sunnyvale",
    "Santa Clara",
    "Cupertino",
    "Milpitas",
    "San Jose",
    "Campbell",
    "Los Gatos",
  ]),
  "east-bay": new Set([
    "Alameda",
    "Oakland",
    "Emeryville",
    "Berkeley",
    "Albany",
    "El Cerrito",
    "Richmond",
    "San Leandro",
    "Hayward",
    "Union City",
    "Fremont",
    "Newark",
    "San Ramon",
    "Dublin",
    "Pleasanton",
    "Walnut Creek",
    "Concord",
  ]),
};

export function regionForCity(city) {
  const match = Object.entries(citiesByRegion).find(([, cities]) =>
    cities.has(city),
  );
  if (!match) throw new Error(`No Bay Area region is configured for ${city}`);
  return match[0];
}

function equityProperty(property) {
  return {
    year: null,
    qualification: "established",
    qualityNote: "Equity Residential 官方租赁社区；户型和实时库存由官网每日更新。",
    inventoryStatus: "onboarding",
    management: "Equity Residential",
    tracked: true,
    airConditioning: false,
    inUnitWasherDryer: false,
    region: regionForCity(property.city),
    ...property,
  };
}

export const officialCatalogProperties = [
  equityProperty({
    id: "canyon-creek",
    name: "Canyon Creek",
    city: "San Ramon",
    address: "1000 Canyon Village Circle, San Ramon",
    latitude: 37.7719276,
    longitude: -121.9763789,
    website:
      "https://www.equityapartments.com/san-francisco-bay/san-ramon/canyon-creek-ca-apartments",
    bedroomTypes: [1, 2],
  }),
  equityProperty({
    id: "parkside-union-city",
    name: "Parkside",
    city: "Union City",
    address: "1501 Decoto Road, Union City",
    latitude: 37.5904833,
    longitude: -122.0215487,
    website:
      "https://www.equityapartments.com/san-francisco-bay/union-city/parkside-apartments",
    bedroomTypes: [0, 1, 2],
  }),
  equityProperty({
    id: "skylark",
    name: "Skylark",
    city: "Union City",
    address: "34655 Skylark Drive, Union City",
    latitude: 37.5852273,
    longitude: -122.0204157,
    website:
      "https://www.equityapartments.com/san-francisco-bay/union-city/skylark-apartments",
    bedroomTypes: [1, 2, 3],
  }),
  equityProperty({
    id: "alborada",
    name: "Alborada",
    city: "Fremont",
    address: "1001 Beethoven Common, Fremont",
    latitude: 37.557914,
    longitude: -121.964295,
    website:
      "https://www.equityapartments.com/san-francisco-bay/fremont/alborada-apartments",
    bedroomTypes: [1, 2, 3],
  }),
  equityProperty({
    id: "archstone-fremont-center",
    name: "Archstone Fremont Center",
    city: "Fremont",
    address: "39410 Civic Center Drive, Fremont",
    latitude: 37.5531953,
    longitude: -121.9735743,
    website:
      "https://www.equityapartments.com/san-francisco-bay/fremont/archstone-fremont-center-apartments",
    bedroomTypes: [1, 2, 3],
  }),
  equityProperty({
    id: "artistry-emeryville",
    name: "Artistry Emeryville",
    city: "Emeryville",
    address: "6401 Shellmound Street, Emeryville",
    latitude: 37.8451486,
    longitude: -122.2946688,
    website:
      "https://www.equityapartments.com/san-francisco-bay/emeryville/artistry-emeryville-apartments",
    bedroomTypes: [0, 1, 2, 3],
  }),
  equityProperty({
    id: "parc-on-powell",
    name: "Parc on Powell",
    city: "Emeryville",
    address: "1333 Powell Street, Emeryville",
    latitude: 37.8400095,
    longitude: -122.2861193,
    website:
      "https://www.equityapartments.com/san-francisco-bay/emeryville/parc-on-powell-apartments",
    bedroomTypes: [0, 1, 2, 3],
  }),
  equityProperty({
    id: "aero",
    name: "Aero",
    city: "Alameda",
    address: "2000 Ardent Way, Alameda",
    latitude: 37.7810549,
    longitude: -122.2960335,
    website:
      "https://www.equityapartments.com/san-francisco/alameda/aero-apartments",
    bedroomTypes: [0, 1, 2],
  }),
  equityProperty({
    id: "77-bluxome",
    name: "77 Bluxome",
    city: "San Francisco",
    address: "77 Bluxome Street, San Francisco",
    latitude: 37.7762841,
    longitude: -122.3970425,
    website:
      "https://www.equityapartments.com/san-francisco-bay/soma/77-bluxome-apartments",
    bedroomTypes: [0],
  }),
  equityProperty({
    id: "soma-square",
    name: "SoMa Square",
    city: "San Francisco",
    address: "1 Saint Francis Place, San Francisco",
    latitude: 37.783182,
    longitude: -122.3977598,
    website:
      "https://www.equityapartments.com/san-francisco-bay/soma/soma-square-apartments",
    bedroomTypes: [0, 1, 2, 3],
  }),
  equityProperty({
    id: "azure",
    name: "Azure",
    city: "San Francisco",
    address: "690 Long Bridge Street, San Francisco",
    latitude: 37.772857,
    longitude: -122.3928985,
    website:
      "https://www.equityapartments.com/san-francisco-bay/mission-bay/azure-apartments",
    bedroomTypes: [1, 2],
  }),
  equityProperty({
    id: "potrero-1010",
    name: "Potrero 1010",
    city: "San Francisco",
    address: "1010 16th Street, San Francisco",
    latitude: 37.7664978,
    longitude: -122.3971269,
    website:
      "https://www.equityapartments.com/san-francisco/potrero-hill/potrero-1010-apartments",
    bedroomTypes: [0, 1, 2],
  }),
  equityProperty({
    id: "340-fremont",
    name: "340 Fremont",
    city: "San Francisco",
    address: "340 Fremont Street, San Francisco",
    latitude: 37.7870554,
    longitude: -122.3929584,
    website:
      "https://www.equityapartments.com/san-francisco/rincon-hill/340-fremont-apartments",
    bedroomTypes: [0, 1, 2, 3],
  }),
  equityProperty({
    id: "one-henry-adams",
    name: "One Henry Adams",
    city: "San Francisco",
    address: "1 Henry Adams Street, San Francisco",
    latitude: 37.7690643,
    longitude: -122.4033639,
    website:
      "https://www.equityapartments.com/san-francisco/design-district/one-henry-adams-apartments",
    bedroomTypes: [0, 1, 2, 3],
  }),
  equityProperty({
    id: "855-brannan",
    name: "855 Brannan",
    city: "San Francisco",
    address: "855 Brannan Street, San Francisco",
    latitude: 37.7718451,
    longitude: -122.4045834,
    website:
      "https://www.equityapartments.com/san-francisco/soma/855-brannan-apartments",
    bedroomTypes: [0, 1, 2, 3],
  }),
  equityProperty({
    id: "woodleaf",
    name: "Woodleaf",
    city: "Campbell",
    address: "325 Union Avenue, Campbell",
    latitude: 37.2827414,
    longitude: -121.935525,
    website:
      "https://www.equityapartments.com/san-francisco-bay/campbell/woodleaf-apartments",
    bedroomTypes: [1, 2],
  }),
  equityProperty({
    id: "mill-creek",
    name: "Mill Creek",
    city: "Milpitas",
    address: "440 Dixon Landing Road, Milpitas",
    latitude: 37.4549875,
    longitude: -121.9186657,
    website:
      "https://www.equityapartments.com/san-francisco-bay/milpitas/mill-creek-apartments",
    bedroomTypes: [1, 2, 3],
  }),
  equityProperty({
    id: "lorien-ivy",
    name: "Lorien Ivy",
    city: "Santa Clara",
    address: "3131 Homestead Road, Santa Clara",
    latitude: 37.3379897,
    longitude: -121.9833448,
    website:
      "https://www.equityapartments.com/san-francisco-bay/santa-clara/lorien-ivy-apartments",
    bedroomTypes: [1, 2, 3],
  }),
  equityProperty({
    id: "estancia-santa-clara",
    name: "Estancia at Santa Clara",
    city: "Santa Clara",
    address: "1650 Hope Drive, Santa Clara",
    latitude: 37.3992024,
    longitude: -121.9564515,
    website:
      "https://www.equityapartments.com/san-francisco-bay/santa-clara/estancia-at-santa-clara-apartments",
    bedroomTypes: [1, 2, 3],
  }),
  equityProperty({
    id: "lorien",
    name: "Lorien",
    city: "Santa Clara",
    address: "3131 Homestead Road, Building 25, Santa Clara",
    latitude: 37.338538,
    longitude: -121.9849689,
    website:
      "https://www.equityapartments.com/san-francisco-bay/santa-clara/lorien-apartments",
    bedroomTypes: [0, 1, 2],
  }),
  equityProperty({
    id: "arbor-terrace",
    name: "Arbor Terrace",
    city: "Sunnyvale",
    address: "555 East El Camino Real, Sunnyvale",
    latitude: 37.3692122,
    longitude: -122.0382329,
    website:
      "https://www.equityapartments.com/san-francisco-bay/sunnyvale/arbor-terrace-apartments",
    bedroomTypes: [0, 1, 2],
  }),
  equityProperty({
    id: "briarwood",
    name: "Briarwood",
    city: "Sunnyvale",
    address: "180 Pasito Terrace, Sunnyvale",
    latitude: 37.3827547,
    longitude: -122.0403955,
    website:
      "https://www.equityapartments.com/san-francisco-bay/sunnyvale/briarwood-apartments",
    bedroomTypes: [1, 2],
  }),
  equityProperty({
    id: "the-arches",
    name: "The Arches",
    city: "Sunnyvale",
    address: "1235 Wildwood Avenue, Sunnyvale",
    latitude: 37.3894509,
    longitude: -121.9891997,
    website:
      "https://www.equityapartments.com/san-francisco-bay/sunnyvale/the-arches-apartments",
    bedroomTypes: [1, 2, 3],
  }),
  equityProperty({
    id: "verde",
    name: "Verde",
    city: "San Jose",
    address: "5322 Wong Drive, San Jose",
    latitude: 37.2569304,
    longitude: -121.8299417,
    website:
      "https://www.equityapartments.com/san-francisco-bay/san-jose/verde-apartments",
    bedroomTypes: [1, 2],
  }),
  equityProperty({
    id: "vista-99",
    name: "Vista 99",
    city: "San Jose",
    address: "99 Vista Montaña, San Jose",
    latitude: 37.4121555,
    longitude: -121.9565308,
    website:
      "https://www.equityapartments.com/san-francisco-bay/north-san-jose/vista-99-apartments",
    bedroomTypes: [1, 2, 3],
  }),
  equityProperty({
    id: "the-lex",
    name: "The Lex",
    city: "San Jose",
    address: "5560 Lexington Avenue, San Jose",
    latitude: 37.2522196,
    longitude: -121.8000213,
    website:
      "https://www.equityapartments.com/san-francisco-bay/san-jose/the-lex-apartments",
    bedroomTypes: [0, 1, 2],
  }),
  equityProperty({
    id: "city-gate-cupertino",
    name: "City Gate at Cupertino",
    city: "Cupertino",
    address: "5608 Stevens Creek Boulevard, Cupertino",
    latitude: 37.3225492,
    longitude: -122.0018172,
    website:
      "https://www.equityapartments.com/san-francisco-bay/cupertino/city-gate-at-cupertino-apartments",
    bedroomTypes: [1, 2, 3],
  }),
  equityProperty({
    id: "reserve-mountain-view",
    name: "Reserve at Mountain View",
    city: "Mountain View",
    address: "870 East El Camino Real, Mountain View",
    latitude: 37.375247,
    longitude: -122.06029,
    website:
      "https://www.equityapartments.com/san-francisco-bay/mountain-view/reserve-at-mountain-view-apartments",
    bedroomTypes: [1, 2],
  }),
  equityProperty({
    id: "la-terrazza",
    name: "La Terrazza",
    city: "Colma",
    address: "7800 El Camino Real, Colma",
    latitude: 37.6838234,
    longitude: -122.4638616,
    website:
      "https://www.equityapartments.com/san-francisco-bay/colma/la-terrazza-apartments",
    bedroomTypes: [0, 1, 2, 3],
  }),
  equityProperty({
    id: "south-city-station",
    name: "South City Station",
    city: "South San Francisco",
    address: "101 McLellan Drive, South San Francisco",
    latitude: 37.6642251,
    longitude: -122.4467868,
    website:
      "https://www.equityapartments.com/san-francisco-bay/south-san-francisco/south-city-station-apartments",
    bedroomTypes: [0, 1, 2],
  }),
  equityProperty({
    id: "west-5th",
    name: "West 5th",
    city: "San Mateo",
    address: "85 West 5th Avenue, San Mateo",
    latitude: 37.5606881,
    longitude: -122.3256862,
    website:
      "https://www.equityapartments.com/san-francisco-bay/san-mateo/west-5th-apartments",
    bedroomTypes: [1, 2, 3],
  }),
];

export const equityBedroomTypes = {
  northpark: [0, 1, 2],
  "park-place-san-mateo": [1, 2, 3],
  "55-west-fifth": [0, 1, 2, 3],
  "creekside-san-mateo": [1, 2],
  "schooner-bay": [1, 2],
  "lantern-cove": [1, 2],
  huxley: [0, 1, 2],
  "riva-terra": [1, 2],
  ...Object.fromEntries(
    officialCatalogProperties.map((property) => [
      property.id,
      property.bedroomTypes,
    ]),
  ),
};

export const officialEquityPropertyIds = Object.keys(equityBedroomTypes);

// Official portfolio-page starting rents captured on 2026-08-09. These are used
// only as floorplan-level fallbacks when a community's unit page blocks the
// monitor. A successful unit scrape always replaces these snapshots.
export const equityStartingRents = {
  "canyon-creek": { 1: 2403, 2: 2760 },
  "parkside-union-city": { 0: 2166, 1: 2290, 2: 2723 },
  skylark: { 1: 2304, 2: 2807 },
  alborada: { 1: 2725, 2: 3276, 3: 3721 },
  "archstone-fremont-center": { 1: 3048, 3: 4779 },
  "artistry-emeryville": { 0: 2393, 1: 2680, 3: 3722 },
  "parc-on-powell": { 1: 3075 },
  aero: { 1: 2950, 2: 3750 },
  "soma-square": { 1: 4456 },
  azure: { 1: 5128, 2: 6660 },
  "potrero-1010": { 1: 4208, 2: 6215 },
  "340-fremont": { 0: 4366, 2: 7155 },
  "one-henry-adams": { 0: 3842, 1: 4967, 2: 6673 },
  "855-brannan": { 1: 4110, 2: 6280 },
  woodleaf: { 2: 3719 },
  "mill-creek": { 1: 2870, 2: 3455, 3: 4303 },
  "lorien-ivy": { 1: 3577 },
  "estancia-santa-clara": { 1: 3687, 2: 4026, 3: 4986 },
  lorien: { 1: 4125, 2: 5110 },
  "arbor-terrace": { 1: 3198, 2: 3998 },
  briarwood: { 1: 3241, 2: 3985 },
  "the-arches": { 1: 3190, 2: 3881 },
  verde: { 1: 2814, 2: 3073 },
  "vista-99": { 1: 3323, 2: 4103, 3: 5183 },
  "the-lex": { 1: 3130, 2: 3445 },
  "city-gate-cupertino": { 1: 3301, 2: 3952 },
  "reserve-mountain-view": { 1: 3435, 2: 4540 },
  "la-terrazza": { 1: 3405, 2: 4520, 3: 5406 },
  "south-city-station": { 1: 3769, 2: 4564 },
  "west-5th": { 3: 5196 },
};
