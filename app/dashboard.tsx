"use client";

import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  CircleDollarSign,
  ExternalLink,
  Filter,
  LocateFixed,
  Languages,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import inventoryJson from "../public/data/inventory.json";
import { copy, type Language } from "./i18n";
import type {
  ApartmentListing,
  ApartmentProperty,
  BayAreaRegion,
  InventoryData,
} from "./types";

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" aria-live="polite">
      <LocateFixed size={20} />
      {copy.en.loadingMap}
    </div>
  ),
});

const inventory = inventoryJson as InventoryData;
const regionOptions: Array<{
  value: "all" | BayAreaRegion;
}> = [
  { value: "all" },
  { value: "sf" },
  { value: "peninsula" },
  { value: "south-bay" },
  { value: "east-bay" },
];
const bedroomOptions = [
  { value: "all", label: "All" },
  { value: "0", label: "Studio" },
  { value: "1", label: "1BR" },
  { value: "2", label: "2BR" },
  { value: "3", label: "3BR+" },
] as const;

type SortMode = "price" | "date" | "size";
type MobileView = "map" | "list";
type ResultMode = "directory" | "availability";
type RegionFilter = "all" | BayAreaRegion;
type BedroomFilter = (typeof bedroomOptions)[number]["value"];
const recentListingWindowMs = 3 * 86_400_000;
const allCities = "__all__";

function bedroomLabel(beds: number) {
  return beds === 0 ? "Studio" : `${beds}BR`;
}

function bedBathLabel(listing: ApartmentListing) {
  return `${bedroomLabel(listing.beds)}${
    listing.baths === null ? "" : ` · ${listing.baths}BA`
  }`;
}

function matchesBedroom(beds: number, bedroom: BedroomFilter) {
  if (bedroom === "all") return true;
  const requested = Number(bedroom);
  return requested === 3 ? beds >= 3 : beds === requested;
}

function matchesAirConditioning(
  property: ApartmentProperty,
  includeUnverified: boolean,
) {
  return (
    property.airConditioning === true ||
    (includeUnverified && property.airConditioning === null)
  );
}

function propertySearchText(property: ApartmentProperty) {
  return [
    property.name,
    property.city,
    property.address,
    property.management,
    property.qualityNote,
    copy.en.region[property.region],
    copy.zh.region[property.region],
    copy.en.regionShort[property.region],
    copy.zh.regionShort[property.region],
    copy.en.airConditioning,
    copy.en.inUnitLaundry,
    copy.zh.airConditioning,
    copy.zh.inUnitLaundry,
    ...(property.airConditioning === null
      ? [copy.en.airConditioningUnverified, copy.zh.airConditioningUnverified]
      : []),
    ...property.bedroomTypes.map(bedroomLabel),
  ]
    .join(" ")
    .toLowerCase();
}

function listingSearchText(listing: ApartmentListing) {
  return [
    listing.unit,
    listing.floorplan,
    listing.unit.replace("官方起租价", "Official starting price"),
    listing.floorplan.replace("官方起租价", "Official starting price"),
    bedBathLabel(listing),
  ]
    .join(" ")
    .toLowerCase();
}

function localizedListingText(value: string, language: Language) {
  return language === "en"
    ? value.replace("官方起租价", "Official starting price")
    : value;
}

function getProperty(listing: ApartmentListing) {
  return inventory.properties.find(
    (property) => property.id === listing.propertyId,
  )!;
}

function displayDate(value: string, language: Language) {
  const t = copy[language];
  const today = new Date(inventory.updatedAt);
  const date = new Date(`${value}T12:00:00-07:00`);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (days <= 0) return t.availableNow;
  if (days === 1) return t.availableTomorrow;
  if (language === "zh") {
    return `${date.getMonth() + 1}月${date.getDate()}日${t.availableOn}`;
  }
  return `${t.availableOn} ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)}`;
}

function capturedLabel(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: inventory.timezone,
  }).format(new Date(value));
}

function isRecentlyListed(listing: ApartmentListing) {
  const firstSeenAt = Date.parse(listing.firstSeenAt);
  const updatedAt = Date.parse(inventory.updatedAt);
  return (
    Number.isFinite(firstSeenAt) &&
    Number.isFinite(updatedAt) &&
    firstSeenAt <= updatedAt &&
    updatedAt - firstSeenAt <= recentListingWindowMs
  );
}

function propertyEra(property: ApartmentProperty, language: Language) {
  const t = copy[language];
  if (property.qualification === "renovated") {
    return property.year
      ? language === "zh"
        ? `${property.year} ${t.renovated}`
        : `${t.renovated} ${property.year}`
      : t.renovatedQuality;
  }
  if (property.qualification === "built" && property.year) {
    return language === "zh"
      ? `${property.year} ${t.built}`
      : `${t.built} ${property.year}`;
  }
  return t.established;
}

function inventoryLabel(
  property: ApartmentProperty,
  count: number,
  language: Language,
) {
  const t = copy[language];
  if (count > 0) {
    return language === "en" && count === 1
      ? "1 home available"
      : `${count} ${t.homesAvailable}`;
  }
  if (property.inventoryStatus === "live") return t.noneAvailable;
  if (property.inventoryStatus === "manual") return t.manualMonitoring;
  if (property.inventoryStatus === "blocked") {
    return t.officialInventoryUnavailable;
  }
  return t.inventoryConnecting;
}

function propertyNote(property: ApartmentProperty, language: Language) {
  if (property.airConditioning === null) {
    return copy[language].unverifiedCriteriaNote;
  }
  if (language === "zh") {
    return property.inventoryNote ?? property.qualityNote;
  }
  if (property.inventoryStatus === "blocked") return copy.en.blockedCommunityNote;
  if (property.inventoryStatus === "manual") return copy.en.manualCommunityNote;
  if (property.inventoryStatus === "onboarding") {
    return copy.en.onboardingCommunityNote;
  }
  return `${copy.en.verifiedCommunityNote} ${property.management}. ${copy.en.verifiedCriteriaNote}`;
}

function AmenityStatus({
  property,
  language,
}: {
  property: ApartmentProperty;
  language: Language;
}) {
  const t = copy[language];
  return (
    <div
      className="amenity-statuses"
      aria-label={`${property.name}: ${t.amenityAria}`}
    >
      <span
        className={
          property.airConditioning === true ? "confirmed" : "unverified"
        }
      >
        {property.airConditioning === true
          ? t.airConditioning
          : t.airConditioningUnverified}
      </span>
      <span className="confirmed">{t.inUnitLaundry}</span>
      <span className="confirmed">{t.marketRate}</span>
    </div>
  );
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  })}`;
}

function feeAmount(
  fee: NonNullable<ApartmentListing["mandatoryMonthlyFees"]>[number],
  language: Language,
) {
  if (fee.amount === null) return fee.note ?? copy[language].amountVaries;
  if (fee.amountMax && fee.amountMax !== fee.amount) {
    return `${formatMoney(fee.amount)}–${formatMoney(fee.amountMax)}`;
  }
  return formatMoney(fee.amount);
}

function fixedMonthlyFees(listing: ApartmentListing) {
  const known = (listing.mandatoryMonthlyFees ?? []).filter(
    (fee) => fee.amount !== null,
  );
  return known.reduce((sum, fee) => sum + (fee.amount ?? 0), 0);
}

function numericFilterValue(value: string, fallback: number) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export default function Dashboard() {
  const [language, setLanguage] = useState<Language>("en");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [city, setCity] = useState(allCities);
  const [bedroom, setBedroom] = useState<BedroomFilter>("all");
  const [includeUnverifiedAirConditioning, setIncludeUnverifiedAirConditioning] =
    useState(false);
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [minSqft, setMinSqft] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [recentlyListedOnly, setRecentlyListedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("price");
  const [resultMode, setResultMode] = useState<ResultMode>("directory");
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("map");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const t = copy[language];
  const minimumRent = numericFilterValue(minRent, 0);
  const maximumRent = numericFilterValue(maxRent, Number.POSITIVE_INFINITY);
  const minimumSqft = numericFilterValue(minSqft, 0);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(
      "apartment-radar-language",
    );
    const preferredLanguage: Language = savedLanguage === "zh" ? "zh" : "en";
    document.documentElement.lang = preferredLanguage === "zh" ? "zh-CN" : "en";
    const languageTimer = window.setTimeout(
      () => setLanguage(preferredLanguage),
      0,
    );
    return () => window.clearTimeout(languageTimer);
  }, []);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("apartment-radar-language", nextLanguage);
    document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en";
  }

  const cities = useMemo(
    () => [
      allCities,
      ...new Set(
        inventory.properties
          .filter(
            (property) =>
              (region === "all" || property.region === region) &&
              matchesAirConditioning(
                property,
                includeUnverifiedAirConditioning,
              ),
          )
          .map((property) => property.city)
          .sort(),
      ),
    ],
    [includeUnverifiedAirConditioning, region],
  );

  const listingsByProperty = useMemo(() => {
    const grouped = new Map<string, ApartmentListing[]>();
    for (const listing of inventory.listings) {
      const rows = grouped.get(listing.propertyId) ?? [];
      rows.push(listing);
      grouped.set(listing.propertyId, rows);
    }
    return grouped;
  }, []);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return inventory.properties.filter((property) => {
      const matchesRegion = region === "all" || property.region === region;
      const matchesCity = city === allCities || property.city === city;
      const matchesAirConditioningStatus = matchesAirConditioning(
        property,
        includeUnverifiedAirConditioning,
      );
      const matchesFloorplan = property.bedroomTypes.some((beds) =>
        matchesBedroom(beds, bedroom),
      );
      const matchesQuery =
        !normalizedQuery ||
        propertySearchText(property).includes(normalizedQuery) ||
        (listingsByProperty.get(property.id) ?? []).some((listing) =>
          listingSearchText(listing).includes(normalizedQuery),
        );

      return (
        matchesRegion &&
        matchesCity &&
        matchesAirConditioningStatus &&
        matchesFloorplan &&
        matchesQuery
      );
    });
  }, [
    bedroom,
    city,
    includeUnverifiedAirConditioning,
    listingsByProperty,
    query,
    region,
  ]);

  const filteredListings = useMemo(() => {
    const visiblePropertyIds = new Set(
      filteredProperties.map((property) => property.id),
    );
    const rows = inventory.listings.filter(
      (listing) => {
        const property = getProperty(listing);
        const normalizedQuery = query.trim().toLowerCase();
        return (
          visiblePropertyIds.has(listing.propertyId) &&
          matchesBedroom(listing.beds, bedroom) &&
          listing.rent >= minimumRent &&
          listing.rent <= maximumRent &&
          listing.sqft >= minimumSqft &&
          (!availableNow ||
            listing.availableDate <= inventory.updatedAt.slice(0, 10)) &&
          (!recentlyListedOnly || isRecentlyListed(listing)) &&
          (!normalizedQuery ||
            propertySearchText(property).includes(normalizedQuery) ||
            listingSearchText(listing).includes(normalizedQuery))
        );
      },
    );

    return [...rows].sort((a, b) => {
      if (sort === "date") {
        return a.availableDate.localeCompare(b.availableDate);
      }
      if (sort === "size") return b.sqft - a.sqft;
      return a.rent - b.rent;
    });
  }, [
    availableNow,
    bedroom,
    filteredProperties,
    maximumRent,
    minimumRent,
    minimumSqft,
    query,
    recentlyListedOnly,
    sort,
  ]);

  const listingCountByProperty = useMemo(
    () =>
      filteredListings.reduce<Record<string, number>>((counts, listing) => {
        counts[listing.propertyId] = (counts[listing.propertyId] ?? 0) + 1;
        return counts;
      }, {}),
    [filteredListings],
  );

  const averageRent = Math.round(
    filteredListings.reduce((sum, listing) => sum + listing.rent, 0) /
      Math.max(filteredListings.length, 1),
  );
  const exactLinks = filteredListings.filter(
    (listing) => listing.precision === "unit",
  ).length;
  const livePropertyCount = new Set(
    inventory.listings.map((listing) => listing.propertyId),
  ).size;
  const recentlyListedCount = inventory.listings.filter((listing) => {
    const property = getProperty(listing);
    return (
      isRecentlyListed(listing) &&
      matchesAirConditioning(property, includeUnverifiedAirConditioning)
    );
  }).length;

  function selectProperty(propertyId: string) {
    setActivePropertyId(propertyId);
    if (window.innerWidth < 900) setMobileView("list");
    window.setTimeout(() => {
      document
        .querySelector(`[data-property="${propertyId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  function clearFilters() {
    setRegion("all");
    setCity(allCities);
    setBedroom("all");
    setIncludeUnverifiedAirConditioning(false);
    setMinRent("");
    setMaxRent("");
    setMinSqft("");
    setAvailableNow(false);
    setRecentlyListedOnly(false);
    setQuery("");
  }

  const hasFilters =
    region !== "all" ||
    city !== allCities ||
    bedroom !== "all" ||
    includeUnverifiedAirConditioning ||
    (resultMode === "availability" && minRent !== "") ||
    (resultMode === "availability" && maxRent !== "") ||
    (resultMode === "availability" && minSqft !== "") ||
    (resultMode === "availability" && availableNow) ||
    (resultMode === "availability" && recentlyListedOnly) ||
    query.length > 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label={t.homeAria}>
          <span className="brand-mark">BA</span>
          <span>
            <strong>Bay Area Apartment Radar</strong>
            <small>{t.brandSubtitle}</small>
          </span>
        </a>
        <div className="topbar-actions">
          <span className="sync-pill">
            <span className="sync-dot" />
            {t.dailySync}
          </span>
          <div
            className="language-switch"
            role="group"
            aria-label="Language / 语言"
          >
            <Languages size={15} aria-hidden="true" />
            <button
              type="button"
              className={language === "en" ? "active" : ""}
              aria-pressed={language === "en"}
              onClick={() => changeLanguage("en")}
            >
              EN
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              className={language === "zh" ? "active" : ""}
              aria-pressed={language === "zh"}
              onClick={() => changeLanguage("zh")}
            >
              中文
            </button>
          </div>
          <a
            className="source-link"
            href="https://github.com/az196560/apartment-tracker"
            target="_blank"
            rel="noreferrer"
          >
            {t.dataRules}
            <ArrowUpRight size={15} />
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={15} />
            SF · Peninsula · South Bay · East Bay
          </div>
          <h1>
            {t.heroLead}{language === "en" ? " " : ""}<span>{t.heroAccent}</span>
          </h1>
          <p>{t.heroDescription}</p>
        </div>
        <div className="hero-stats" aria-label={t.statsAria}>
          <div className="stat">
            <span>{t.currentListings}</span>
            <strong>{inventory.listings.length}</strong>
            <small>{t.officialInventory}</small>
          </div>
          <div className="stat">
            <span>{t.officialApartments}</span>
            <strong>{inventory.properties.length}</strong>
            <small>{t.communities}</small>
          </div>
          <div className="stat">
            <span>{t.withInventory}</span>
            <strong>{livePropertyCount}</strong>
            <small>{t.communities}</small>
          </div>
        </div>
      </section>

      <section className="city-rail" aria-label={t.regionFilterAria}>
        {regionOptions.map((option) => {
          const regionCount =
            option.value === "all"
              ? inventory.properties.filter((property) =>
                  matchesAirConditioning(
                    property,
                    includeUnverifiedAirConditioning,
                  ),
                ).length
              : inventory.properties.filter(
                  (property) =>
                    property.region === option.value &&
                    matchesAirConditioning(
                      property,
                      includeUnverifiedAirConditioning,
                    ),
                ).length;

          return (
            <button
              key={option.value}
              type="button"
              className={region === option.value ? "city-chip active" : "city-chip"}
              onClick={() => {
                setRegion(option.value);
                setCity(allCities);
              }}
            >
              {region === option.value && <Check size={13} />}
              {t.region[option.value]}
              <small>{regionCount}</small>
            </button>
          );
        })}
      </section>

      <section className="workspace">
        <aside className={filtersOpen ? "filter-panel open" : "filter-panel"}>
          <div className="panel-heading">
            <div>
              <span className="overline">{t.searchParameters}</span>
              <h2>{t.filtersTitle}</h2>
            </div>
            <button
              className="icon-button filter-close"
              type="button"
              aria-label={t.closeFilters}
              onClick={() => setFiltersOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
            />
          </label>

          <div className="filter-group">
            <span className="filter-title">{t.city}</span>
            <label className="city-select-field">
              <select value={city} onChange={(event) => setCity(event.target.value)}>
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item === allCities ? t.allCities : item}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </label>
          </div>

          <div className="filter-group">
            <span className="filter-title">{t.bedroom}</span>
            <div className="bedroom-options" aria-label={t.bedroomFilterAria}>
              {bedroomOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={bedroom === option.value ? "bedroom-option active" : "bedroom-option"}
                  onClick={() => setBedroom(option.value)}
                >
                  {option.value === "all" ? t.allBedrooms : option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-title">{t.airConditioningFilter}</span>
            <label className="toggle-row">
              <span>
                <CircleHelp size={17} />
                {t.includeUnverifiedAirConditioning}
              </span>
              <input
                type="checkbox"
                checked={includeUnverifiedAirConditioning}
                onChange={(event) => {
                  setIncludeUnverifiedAirConditioning(event.target.checked);
                  setCity(allCities);
                }}
              />
              <i />
            </label>
            <p className="filter-hint">{t.unverifiedAirConditioningHint}</p>
          </div>

          {resultMode === "availability" && (
            <>
              <div className="filter-group">
                <span className="filter-title">{t.monthlyRent}</span>
                <div className="number-filter-grid">
                  <label className="number-filter-field">
                    <span>{t.minimum}</span>
                    <span className="number-input-shell">
                      <i aria-hidden="true">$</i>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        inputMode="numeric"
                        value={minRent}
                        onChange={(event) => setMinRent(event.target.value)}
                        placeholder={t.noMinimum}
                        aria-label={t.minimumRentAria}
                      />
                    </span>
                  </label>
                  <label className="number-filter-field">
                    <span>{t.maximum}</span>
                    <span className="number-input-shell">
                      <i aria-hidden="true">$</i>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        inputMode="numeric"
                        value={maxRent}
                        onChange={(event) => setMaxRent(event.target.value)}
                        placeholder={t.noMaximum}
                        aria-label={t.maximumRentAria}
                      />
                    </span>
                  </label>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-title">{t.minimumSize}</span>
                <label className="number-filter-field">
                  <span className="number-input-shell">
                    <input
                      type="number"
                      min="0"
                      step="25"
                      inputMode="numeric"
                      value={minSqft}
                      onChange={(event) => setMinSqft(event.target.value)}
                      placeholder={t.anySize}
                      aria-label={t.minimumSqftAria}
                    />
                    <i aria-hidden="true">ft²</i>
                  </span>
                </label>
                <p className="filter-hint">{t.sqftFilterHint}</p>
                </div>

              <div className="filter-group">
                <span className="filter-title">{t.moveInTiming}</span>
                <label className="toggle-row">
                  <span>
                    <CalendarDays size={17} />
                    {t.availableNowOnly}
                  </span>
                  <input
                    type="checkbox"
                    checked={availableNow}
                    onChange={(event) => setAvailableNow(event.target.checked)}
                  />
                  <i />
                </label>
              </div>

              <div className="filter-group">
                <span className="filter-title">{t.listedDate}</span>
                <label className="toggle-row">
                  <span>
                    <Sparkles size={17} />
                    {t.recentListings} · {recentlyListedCount} {t.listingCount}
                  </span>
                  <input
                    type="checkbox"
                    checked={recentlyListedOnly}
                    onChange={(event) =>
                      setRecentlyListedOnly(event.target.checked)
                    }
                  />
                  <i />
                </label>
              </div>
            </>
          )}

          <div className="criteria-card">
            <span className="criteria-icon">
              <Building2 size={18} />
            </span>
            <div>
              <strong>{t.qualityTitle}</strong>
              <p>{t.qualityBody}</p>
            </div>
          </div>

          {hasFilters && (
            <button className="clear-button" type="button" onClick={clearFilters}>
              {t.clearFilters}
            </button>
          )}
        </aside>

        <div className="results">
          <div className="results-toolbar">
            <div>
              <span className="overline">
                {resultMode === "directory"
                  ? t.directoryOverline
                  : t.inventoryOverline}
              </span>
              <h2>
                {resultMode === "directory" ? t.included : t.found}{" "}
                <strong>
                  {resultMode === "directory"
                    ? filteredProperties.length
                    : filteredListings.length}
                </strong>{" "}
                {resultMode === "directory"
                  ? t.officialApartmentCount
                  : t.listingCount}
              </h2>
            </div>
            <div className="toolbar-actions">
              <div className="result-mode" aria-label={t.resultModeAria}>
                <button
                  type="button"
                  className={resultMode === "directory" ? "active" : ""}
                  onClick={() => setResultMode("directory")}
                >
                  {t.directory}
                </button>
                <button
                  type="button"
                  className={resultMode === "availability" ? "active" : ""}
                  onClick={() => setResultMode("availability")}
                >
                  {t.liveInventory}
                  <small>{inventory.listings.length}</small>
                </button>
              </div>
              <button
                className="filter-trigger"
                type="button"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={16} />
                {t.filter}
              </button>
              {resultMode === "availability" && (
                <label className="sort-select">
                  <span>{t.sort}</span>
                  <select
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as SortMode)
                    }
                  >
                    <option value="price">{t.sortPrice}</option>
                    <option value="date">{t.sortDate}</option>
                    <option value="size">{t.sortSize}</option>
                  </select>
                  <ChevronDown size={15} />
                </label>
              )}
            </div>
          </div>

          <div className="mobile-view-toggle" aria-label={t.mobileViewAria}>
            <button
              className={mobileView === "map" ? "active" : ""}
              type="button"
              onClick={() => setMobileView("map")}
            >
              <MapIcon size={16} />
              {t.map}
            </button>
            <button
              className={mobileView === "list" ? "active" : ""}
              type="button"
              onClick={() => setMobileView("list")}
            >
              <Filter size={16} />
              {t.list}
            </button>
          </div>

          <div className="results-grid">
            <div
              className={`map-panel ${
                mobileView === "map" ? "mobile-active" : ""
              }`}
            >
              <MapView
                properties={filteredProperties}
                listings={filteredListings}
                activePropertyId={activePropertyId}
                onSelect={selectProperty}
                language={language}
              />
              <div className="map-legend">
                <span>
                  <i className="available-marker" /> {t.available}
                </span>
                <span>
                  <i className="watching-marker" /> {t.noAvailability}
                </span>
                <span>
                  <i className="blocked-marker" /> {t.siteUnavailable}
                </span>
                <span>
                  <i className="manual-marker" /> {t.manualWatch}
                </span>
              </div>
            </div>

            <div
              className={`listing-panel ${
                mobileView === "list" ? "mobile-active" : ""
              }`}
            >
              {resultMode === "directory" ? (
                <>
                  <div className="summary-strip">
                    <div>
                      <Building2 size={17} />
                      <span>{t.coveredCities}</span>
                      <strong>
                        {new Set(filteredProperties.map((property) => property.city)).size}
                      </strong>
                    </div>
                    <div>
                      <ExternalLink size={17} />
                      <span>{t.officialLinks}</span>
                      <strong>{t.officialChannels}</strong>
                    </div>
                  </div>

                  {filteredProperties.length > 0 ? (
                    <div className="property-list">
                      {filteredProperties.map((property) => {
                        const count = listingCountByProperty[property.id] ?? 0;
                        return (
                          <article
                            key={property.id}
                            data-property={property.id}
                            className={
                              activePropertyId === property.id
                                ? "property-card active"
                                : "property-card"
                            }
                            onMouseEnter={() =>
                              setActivePropertyId(property.id)
                            }
                          >
                            <div className="property-card-top">
                              <span>
                                {t.regionShort[property.region]} · {property.city}
                              </span>
                              <small>{propertyEra(property, language)}</small>
                            </div>
                            <h3>{property.name}</h3>
                            <p className="property-address">
                              {property.address}
                            </p>
                            <p className="quality-note">
                              {propertyNote(property, language)}
                            </p>
                            <div
                              className="floorplan-types"
                              aria-label={`${property.name} ${t.floorplanAria}`}
                            >
                              {property.bedroomTypes.map((beds) => (
                                <span key={beds}>{bedroomLabel(beds)}</span>
                              ))}
                            </div>
                            <AmenityStatus property={property} language={language} />
                            <div className="property-card-footer">
                              <span
                                className={`inventory-badge ${property.inventoryStatus}`}
                              >
                                {inventoryLabel(property, count, language)}
                              </span>
                              <a
                                href={property.website}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`${t.officialSiteAria} ${property.name}`}
                              >
                                {t.officialSite}
                                <ArrowUpRight size={15} />
                              </a>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Building2 size={28} />
                      <h3>{t.noApartments}</h3>
                      <p>{t.noApartmentsBody}</p>
                      <button type="button" onClick={clearFilters}>
                        {t.resetFilters}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="summary-strip">
                    <div>
                      <CircleDollarSign size={17} />
                      <span>{t.averageRent}</span>
                      <strong>${averageRent.toLocaleString()}</strong>
                    </div>
                    <div>
                      <ExternalLink size={17} />
                      <span>{t.exactUnitLinks}</span>
                      <strong>{exactLinks}</strong>
                    </div>
                  </div>

                  {filteredListings.length > 0 ? (
                    <div className="listing-list">
                      {filteredListings.map((listing) => {
                        const property = getProperty(listing);
                        const fixedFees = fixedMonthlyFees(listing);
                        const recentlyListed = isRecentlyListed(listing);
                        const hasFeeDetails =
                          (listing.mandatoryMonthlyFees?.length ?? 0) > 0 ||
                          (listing.optionalMonthlyFees?.length ?? 0) > 0 ||
                          (listing.oneTimeFees?.length ?? 0) > 0;
                        return (
                          <article
                            key={listing.id}
                            data-property={property.id}
                            className={
                              activePropertyId === property.id
                                ? "listing-card active"
                                : "listing-card"
                            }
                            onMouseEnter={() =>
                              setActivePropertyId(property.id)
                            }
                          >
                            <div className="listing-main">
                              <div className="listing-location">
                                <span>
                                  {t.regionShort[property.region]} · {property.city}
                                </span>
                                <small>{propertyEra(property, language)}</small>
                              </div>
                              <h3>{property.name}</h3>
                              <p>{property.address}</p>
                              <div className="unit-line">
                                <strong>{localizedListingText(listing.unit, language)}</strong>
                                <span className="bed-bath-label">
                                  {bedBathLabel(listing)}
                                </span>
                                <span>{localizedListingText(listing.floorplan, language)}</span>
                                {listing.sqft > 0 && <span>{listing.sqft} ft²</span>}
                                {recentlyListed && (
                                  <span className="recent-listing-badge">
                                    {t.recentBadge}
                                  </span>
                                )}
                              </div>
                              <AmenityStatus property={property} language={language} />
                            </div>
                            <div className="listing-price">
                              <strong>{formatMoney(listing.rent)}</strong>
                              <span>{t.baseRentMonth}</span>
                              {listing.totalMonthlyPrice && (
                                <small>
                                  {t.monthlyTotal}{" "}
                                  {formatMoney(listing.totalMonthlyPrice)}
                                </small>
                              )}
                            </div>
                            <div className="listing-facts">
                              <div>
                                <span>{t.moveIn}</span>
                                <strong>
                                  {displayDate(listing.availableDate, language)}
                                </strong>
                              </div>
                              <div>
                                <span>{t.recommendedLease}</span>
                                <strong>
                                  {listing.recommendedLeaseMonths
                                    ? `${listing.recommendedLeaseMonths} ${t.months}`
                                    : t.notPublished}
                                </strong>
                              </div>
                              <div>
                                <span>{t.knownFixedFees}</span>
                                <strong>
                                  {listing.totalMonthlyPrice
                                    ? formatMoney(
                                        listing.totalMonthlyPrice -
                                          listing.rent,
                                      )
                                    : fixedFees > 0
                                      ? formatMoney(fixedFees)
                                      : t.notPublished}
                                </strong>
                              </div>
                            </div>
                            <details className="fee-details">
                              <summary>
                                {hasFeeDetails
                                  ? t.feeSummary
                                  : t.feeInformation}
                              </summary>
                              <div className="fee-groups">
                                <div>
                                  <span>{t.fixedMonthlyFees}</span>
                                  {(listing.mandatoryMonthlyFees?.length ??
                                    0) > 0 ? (
                                    listing.mandatoryMonthlyFees?.map((fee, index) => (
                                      <p key={`${fee.label}-${index}`}>
                                        <span>{fee.label}</span>
                                        <strong>{feeAmount(fee, language)}</strong>
                                      </p>
                                    ))
                                  ) : (
                                    <p>{t.notDisclosed}</p>
                                  )}
                                </div>
                                <div>
                                  <span>{t.optionalMonthlyFees}</span>
                                  {(listing.optionalMonthlyFees?.length ??
                                    0) > 0 ? (
                                    listing.optionalMonthlyFees?.map((fee, index) => (
                                      <p key={`${fee.label}-${index}`}>
                                        <span>{fee.label}</span>
                                        <strong>{feeAmount(fee, language)}</strong>
                                      </p>
                                    ))
                                  ) : (
                                    <p>{t.notDisclosed}</p>
                                  )}
                                </div>
                                <div>
                                  <span>{t.oneTimeFees}</span>
                                  {(listing.oneTimeFees?.length ?? 0) > 0 ? (
                                    listing.oneTimeFees?.map((fee, index) => (
                                      <p key={`${fee.label}-${index}`}>
                                        <span>{fee.label}</span>
                                        <strong>{feeAmount(fee, language)}</strong>
                                      </p>
                                    ))
                                  ) : (
                                    <p>{t.notDisclosed}</p>
                                  )}
                                </div>
                              </div>
                            </details>
                            <div className="listing-footer">
                              <div>
                                <CalendarDays size={15} />
                                <span>
                                  {t.firstSeen} {capturedLabel(listing.firstSeenAt, language)}
                                  {" · "}
                                  {t.captured} {capturedLabel(listing.capturedAt, language)}
                                </span>
                              </div>
                              <a
                                href={listing.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`${t.officialSiteAria} ${property.name} ${listing.unit}`}
                              >
                                {listing.precision === "unit"
                                  ? t.unitSource
                                  : t.floorplanSource}
                                <ArrowUpRight size={16} />
                              </a>
                            </div>
                            <span
                              className={
                                listing.precision === "unit"
                                  ? "precision-badge exact"
                                  : "precision-badge"
                              }
                            >
                              {listing.precision === "unit"
                                ? t.exactUnit
                                : t.floorplanPage}
                            </span>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Building2 size={28} />
                      <h3>{t.noListings}</h3>
                      <p>{t.noListingsBody}</p>
                      <button
                        type="button"
                        onClick={() => setResultMode("directory")}
                      >
                        {t.viewDirectory}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="data-footer">
        <div>
          <span className="sync-dot" />
          {t.lastVerified}: {capturedLabel(inventory.updatedAt, language)} · Pacific Time
        </div>
        <p>{t.disclaimer}</p>
      </footer>
    </main>
  );
}
