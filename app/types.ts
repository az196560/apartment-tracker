export type SourcePrecision = "unit" | "floorplan";

export type ApartmentProperty = {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  year: number;
  qualification: "built" | "renovated";
  management: string;
  website: string;
  tracked: boolean;
};

export type ApartmentListing = {
  id: string;
  propertyId: string;
  unit: string;
  floorplan: string;
  beds: 1;
  baths: 1;
  sqft: number;
  rent: number;
  availableDate: string;
  sourceUrl: string;
  precision: SourcePrecision;
  capturedAt: string;
};

export type InventorySource = {
  id: string;
  label: string;
  status: "live" | "snapshot" | "watching";
  lastSuccessAt: string | null;
};

export type InventoryData = {
  updatedAt: string;
  timezone: string;
  properties: ApartmentProperty[];
  listings: ApartmentListing[];
  sources: InventorySource[];
};
