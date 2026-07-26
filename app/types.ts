export type SourcePrecision = "unit" | "floorplan";

export type FeeLine = {
  label: string;
  amount: number | null;
  amountMax?: number | null;
  note?: string;
};

export type LeaseTermOption = {
  months: number;
  baseRent: number;
};

export type ApartmentProperty = {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  year: number | null;
  qualification: "built" | "renovated" | "established";
  qualityNote: string;
  inventoryStatus: "live" | "onboarding" | "manual" | "blocked";
  inventoryNote?: string;
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
  totalMonthlyPrice?: number | null;
  availableDate: string;
  recommendedLeaseMonths?: number | null;
  leaseTerms?: LeaseTermOption[];
  mandatoryMonthlyFees?: FeeLine[];
  optionalMonthlyFees?: FeeLine[];
  oneTimeFees?: FeeLine[];
  sourceUrl: string;
  precision: SourcePrecision;
  capturedAt: string;
};

export type InventorySource = {
  id: string;
  label: string;
  status: "live" | "snapshot" | "watching";
  lastSuccessAt: string | null;
  lastAttemptAt?: string;
  lastError?: string;
};

export type InventoryData = {
  updatedAt: string;
  timezone: string;
  properties: ApartmentProperty[];
  listings: ApartmentListing[];
  sources: InventorySource[];
};
