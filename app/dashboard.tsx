"use client";

import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  Filter,
  LocateFixed,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import inventoryJson from "../public/data/inventory.json";
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
      正在加载湾区地图…
    </div>
  ),
});

const inventory = inventoryJson as InventoryData;
const regionOptions: Array<{
  value: "all" | BayAreaRegion;
  label: string;
  shortLabel: string;
}> = [
  { value: "all", label: "全部湾区", shortLabel: "全部" },
  { value: "sf", label: "San Francisco", shortLabel: "SF" },
  { value: "peninsula", label: "Peninsula", shortLabel: "半岛" },
  { value: "south-bay", label: "South Bay", shortLabel: "南湾" },
  { value: "east-bay", label: "East Bay", shortLabel: "东湾" },
];
const regionLabelByValue = Object.fromEntries(
  regionOptions.map((option) => [option.value, option.shortLabel]),
) as Record<"all" | BayAreaRegion, string>;
const bedroomOptions = [
  { value: "all", label: "全部" },
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
const allCities = "全部城市";

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

function propertySearchText(property: ApartmentProperty) {
  return [
    property.name,
    property.city,
    property.address,
    property.management,
    property.qualityNote,
    regionLabelByValue[property.region],
    ...property.bedroomTypes.map(bedroomLabel),
  ]
    .join(" ")
    .toLowerCase();
}

function listingSearchText(listing: ApartmentListing) {
  return [listing.unit, listing.floorplan, bedBathLabel(listing)].join(" ").toLowerCase();
}

function getProperty(listing: ApartmentListing) {
  return inventory.properties.find(
    (property) => property.id === listing.propertyId,
  )!;
}

function displayDate(value: string) {
  const today = new Date(inventory.updatedAt);
  const date = new Date(`${value}T12:00:00-07:00`);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (days <= 0) return "现在可入住";
  if (days === 1) return "明天可入住";
  return `${date.getMonth() + 1}月${date.getDate()}日可入住`;
}

function capturedLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
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

function propertyEra(property: ApartmentProperty) {
  if (property.qualification === "renovated") {
    return property.year ? `${property.year} 翻新` : "翻新品质";
  }
  if (property.qualification === "built" && property.year) {
    return `${property.year} 建成`;
  }
  return "成熟品质社区";
}

function inventoryLabel(property: ApartmentProperty, count: number) {
  if (count > 0) return `${count} 套可租`;
  if (property.inventoryStatus === "live") return "暂无房源";
  if (property.inventoryStatus === "manual") return "人工关注";
  if (property.inventoryStatus === "blocked") return "官网暂未开放库存";
  return "库存接入中";
}

function AmenityStatus({ property }: { property: ApartmentProperty }) {
  return (
    <div
      className="amenity-statuses"
      aria-label={`${property.name} 硬性条件已核验`}
    >
      <span className="confirmed">空调</span>
      <span className="confirmed">室内洗烘</span>
      <span className="confirmed">普通市场价</span>
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
) {
  if (fee.amount === null) return fee.note ?? "金额浮动";
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

export default function Dashboard() {
  const [region, setRegion] = useState<RegionFilter>("all");
  const [city, setCity] = useState(allCities);
  const [bedroom, setBedroom] = useState<BedroomFilter>("all");
  const [maxRent, setMaxRent] = useState(10000);
  const [availableNow, setAvailableNow] = useState(false);
  const [recentlyListedOnly, setRecentlyListedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("price");
  const [resultMode, setResultMode] = useState<ResultMode>("directory");
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("map");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cities = useMemo(
    () => [
      allCities,
      ...new Set(
        inventory.properties
          .filter((property) => region === "all" || property.region === region)
          .map((property) => property.city)
          .sort(),
      ),
    ],
    [region],
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
      const matchesFloorplan = property.bedroomTypes.some((beds) =>
        matchesBedroom(beds, bedroom),
      );
      const matchesQuery =
        !normalizedQuery ||
        propertySearchText(property).includes(normalizedQuery) ||
        (listingsByProperty.get(property.id) ?? []).some((listing) =>
          listingSearchText(listing).includes(normalizedQuery),
        );

      return matchesRegion && matchesCity && matchesFloorplan && matchesQuery;
    });
  }, [bedroom, city, listingsByProperty, query, region]);

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
          listing.rent <= maxRent &&
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
    maxRent,
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
  const recentlyListedCount =
    inventory.listings.filter(isRecentlyListed).length;

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
    setMaxRent(10000);
    setAvailableNow(false);
    setRecentlyListedOnly(false);
    setQuery("");
  }

  const hasFilters =
    region !== "all" ||
    city !== allCities ||
    bedroom !== "all" ||
    (resultMode === "availability" && maxRent < 10000) ||
    (resultMode === "availability" && availableNow) ||
    (resultMode === "availability" && recentlyListedOnly) ||
    query.length > 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Bay Area Apartment Radar 首页">
          <span className="brand-mark">BA</span>
          <span>
            <strong>Bay Area Apartment Radar</strong>
            <small>湾区官方公寓库存</small>
          </span>
        </a>
        <div className="topbar-actions">
          <span className="sync-pill">
            <span className="sync-dot" />
            每日自动检查 · 05:00 PT
          </span>
          <a
            className="source-link"
            href="https://github.com/az196560/apartment-tracker"
            target="_blank"
            rel="noreferrer"
          >
            数据与规则
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
            好公寓，<span>都放进雷达。</span>
          </h1>
          <p>
            只收录官网已核验空调、室内洗烘和普通市场价资格的专业公寓。
            按区域、城市和户型筛选，每天核对租金、入住日与官网直达链接。
          </p>
        </div>
        <div className="hero-stats" aria-label="房源概览">
          <div className="stat">
            <span>当前房源</span>
            <strong>{inventory.listings.length}</strong>
            <small>套官方库存</small>
          </div>
          <div className="stat">
            <span>官方公寓</span>
            <strong>{inventory.properties.length}</strong>
            <small>个社区</small>
          </div>
          <div className="stat">
            <span>已有库存</span>
            <strong>{livePropertyCount}</strong>
            <small>个社区</small>
          </div>
        </div>
      </section>

      <section className="city-rail" aria-label="区域筛选">
        {regionOptions.map((option) => {
          const regionCount =
            option.value === "all"
              ? inventory.properties.length
              : inventory.properties.filter(
                  (property) => property.region === option.value,
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
              {option.label}
              <small>{regionCount}</small>
            </button>
          );
        })}
      </section>

      <section className="workspace">
        <aside className={filtersOpen ? "filter-panel open" : "filter-panel"}>
          <div className="panel-heading">
            <div>
              <span className="overline">SEARCH PARAMETERS</span>
              <h2>你的筛选条件</h2>
            </div>
            <button
              className="icon-button filter-close"
              type="button"
              aria-label="关闭筛选"
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
              placeholder="搜索公寓、城市、户型或房号"
            />
          </label>

          <div className="filter-group">
            <span className="filter-title">城市</span>
            <label className="city-select-field">
              <select value={city} onChange={(event) => setCity(event.target.value)}>
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </label>
          </div>

          <div className="filter-group">
            <span className="filter-title">户型</span>
            <div className="bedroom-options" aria-label="户型筛选">
              {bedroomOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={bedroom === option.value ? "bedroom-option active" : "bedroom-option"}
                  onClick={() => setBedroom(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {resultMode === "availability" && (
            <>
              <div className="filter-group">
                <div className="filter-label">
                  <span>月租上限</span>
                  <strong>${maxRent.toLocaleString()}</strong>
                </div>
                <input
                  className="range"
                  type="range"
                  min="1500"
                  max="10000"
                  step="50"
                  value={maxRent}
                  onChange={(event) => setMaxRent(Number(event.target.value))}
                  aria-label="月租上限"
                />
                <div className="range-ends">
                  <span>$1,500</span>
                  <span>$10,000+</span>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-title">入住时间</span>
                <label className="toggle-row">
                  <span>
                    <CalendarDays size={17} />
                    仅看现在可入住
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
                <span className="filter-title">上架时间</span>
                <label className="toggle-row">
                  <span>
                    <Sparkles size={17} />
                    最近 3 天新上架 · {recentlyListedCount} 套
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
              <strong>品质公寓标准</strong>
              <p>
                仅采用物业官网公开目录和库存；设施尚未核实的社区会明确标注，
                价格与可租状态最终以官网为准。
              </p>
            </div>
          </div>

          {hasFilters && (
            <button className="clear-button" type="button" onClick={clearFilters}>
              清除全部筛选
            </button>
          )}
        </aside>

        <div className="results">
          <div className="results-toolbar">
            <div>
              <span className="overline">
                {resultMode === "directory"
                  ? "OFFICIAL PROPERTY DIRECTORY"
                  : "LIVE INVENTORY"}
              </span>
              <h2>
                {resultMode === "directory" ? "收录" : "找到"}{" "}
                <strong>
                  {resultMode === "directory"
                    ? filteredProperties.length
                    : filteredListings.length}
                </strong>{" "}
                {resultMode === "directory" ? "个官方公寓" : "套房源"}
              </h2>
            </div>
            <div className="toolbar-actions">
              <div className="result-mode" aria-label="切换目录与实时房源">
                <button
                  type="button"
                  className={resultMode === "directory" ? "active" : ""}
                  onClick={() => setResultMode("directory")}
                >
                  公寓目录
                </button>
                <button
                  type="button"
                  className={resultMode === "availability" ? "active" : ""}
                  onClick={() => setResultMode("availability")}
                >
                  实时房源
                  <small>{inventory.listings.length}</small>
                </button>
              </div>
              <button
                className="filter-trigger"
                type="button"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={16} />
                筛选
              </button>
              {resultMode === "availability" && (
                <label className="sort-select">
                  <span>排序</span>
                  <select
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as SortMode)
                    }
                  >
                    <option value="price">价格最低</option>
                    <option value="date">最早入住</option>
                    <option value="size">面积最大</option>
                  </select>
                  <ChevronDown size={15} />
                </label>
              )}
            </div>
          </div>

          <div className="mobile-view-toggle" aria-label="切换地图与列表">
            <button
              className={mobileView === "map" ? "active" : ""}
              type="button"
              onClick={() => setMobileView("map")}
            >
              <MapIcon size={16} />
              地图
            </button>
            <button
              className={mobileView === "list" ? "active" : ""}
              type="button"
              onClick={() => setMobileView("list")}
            >
              <Filter size={16} />
              列表
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
              />
              <div className="map-legend">
                <span>
                  <i className="available-marker" /> 已有房源
                </span>
                <span>
                  <i className="watching-marker" /> 暂无房源
                </span>
                <span>
                  <i className="blocked-marker" /> 官网暂未开放
                </span>
                <span>
                  <i className="manual-marker" /> 人工关注
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
                      <span>覆盖城市</span>
                      <strong>
                        {new Set(filteredProperties.map((property) => property.city)).size}
                      </strong>
                    </div>
                    <div>
                      <ExternalLink size={17} />
                      <span>均可跳转</span>
                      <strong>官方渠道</strong>
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
                                {regionLabelByValue[property.region]} · {property.city}
                              </span>
                              <small>{propertyEra(property)}</small>
                            </div>
                            <h3>{property.name}</h3>
                            <p className="property-address">
                              {property.address}
                            </p>
                            <p className="quality-note">
                              {property.inventoryNote ?? property.qualityNote}
                            </p>
                            <div
                              className="floorplan-types"
                              aria-label={`${property.name} 户型`}
                            >
                              {property.bedroomTypes.map((beds) => (
                                <span key={beds}>{bedroomLabel(beds)}</span>
                              ))}
                            </div>
                            <AmenityStatus property={property} />
                            <div className="property-card-footer">
                              <span
                                className={`inventory-badge ${property.inventoryStatus}`}
                              >
                                {inventoryLabel(property, count)}
                              </span>
                              <a
                                href={property.website}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`查看 ${property.name} 官方网站`}
                              >
                                查看官网
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
                      <h3>没有匹配的公寓</h3>
                        <p>换一个区域、城市、户型或搜索词试试。</p>
                      <button type="button" onClick={clearFilters}>
                        重置筛选
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="summary-strip">
                    <div>
                      <CircleDollarSign size={17} />
                      <span>筛选后均价</span>
                      <strong>${averageRent.toLocaleString()}</strong>
                    </div>
                    <div>
                      <ExternalLink size={17} />
                      <span>精确房号链接</span>
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
                                  {regionLabelByValue[property.region]} · {property.city}
                                </span>
                                <small>{propertyEra(property)}</small>
                              </div>
                              <h3>{property.name}</h3>
                              <p>{property.address}</p>
                              <div className="unit-line">
                                <strong>{listing.unit}</strong>
                                <span className="bed-bath-label">
                                  {bedBathLabel(listing)}
                                </span>
                                <span>{listing.floorplan}</span>
                                {listing.sqft > 0 && <span>{listing.sqft} ft²</span>}
                                {recentlyListed && (
                                  <span className="recent-listing-badge">
                                    最近 3 天新上架
                                  </span>
                                )}
                              </div>
                              <AmenityStatus property={property} />
                            </div>
                            <div className="listing-price">
                              <strong>{formatMoney(listing.rent)}</strong>
                              <span>base rent / 月</span>
                              {listing.totalMonthlyPrice && (
                                <small>
                                  月付合计{" "}
                                  {formatMoney(listing.totalMonthlyPrice)}
                                </small>
                              )}
                            </div>
                            <div className="listing-facts">
                              <div>
                                <span>MOVE-IN</span>
                                <strong>
                                  {displayDate(listing.availableDate)}
                                </strong>
                              </div>
                              <div>
                                <span>建议租期</span>
                                <strong>
                                  {listing.recommendedLeaseMonths
                                    ? `${listing.recommendedLeaseMonths} 个月`
                                    : "官网未公开"}
                                </strong>
                              </div>
                              <div>
                                <span>已知固定月费</span>
                                <strong>
                                  {listing.totalMonthlyPrice
                                    ? formatMoney(
                                        listing.totalMonthlyPrice -
                                          listing.rent,
                                      )
                                    : fixedFees > 0
                                      ? formatMoney(fixedFees)
                                      : "官网未公开"}
                                </strong>
                              </div>
                            </div>
                            <details className="fee-details">
                              <summary>
                                {hasFeeDetails
                                  ? "查看月费、停车与一次性费用"
                                  : "费用信息"}
                              </summary>
                              <div className="fee-groups">
                                <div>
                                  <span>固定月费</span>
                                  {(listing.mandatoryMonthlyFees?.length ??
                                    0) > 0 ? (
                                    listing.mandatoryMonthlyFees?.map((fee, index) => (
                                      <p key={`${fee.label}-${index}`}>
                                        <span>{fee.label}</span>
                                        <strong>{feeAmount(fee)}</strong>
                                      </p>
                                    ))
                                  ) : (
                                    <p>官网未明示</p>
                                  )}
                                </div>
                                <div>
                                  <span>停车 / 可选月费</span>
                                  {(listing.optionalMonthlyFees?.length ??
                                    0) > 0 ? (
                                    listing.optionalMonthlyFees?.map((fee, index) => (
                                      <p key={`${fee.label}-${index}`}>
                                        <span>{fee.label}</span>
                                        <strong>{feeAmount(fee)}</strong>
                                      </p>
                                    ))
                                  ) : (
                                    <p>官网未明示</p>
                                  )}
                                </div>
                                <div>
                                  <span>一次性费用</span>
                                  {(listing.oneTimeFees?.length ?? 0) > 0 ? (
                                    listing.oneTimeFees?.map((fee, index) => (
                                      <p key={`${fee.label}-${index}`}>
                                        <span>{fee.label}</span>
                                        <strong>{feeAmount(fee)}</strong>
                                      </p>
                                    ))
                                  ) : (
                                    <p>官网未明示</p>
                                  )}
                                </div>
                              </div>
                            </details>
                            <div className="listing-footer">
                              <div>
                                <CalendarDays size={15} />
                                <span>
                                  首次发现 {capturedLabel(listing.firstSeenAt)}
                                  {" · "}
                                  抓取 {capturedLabel(listing.capturedAt)}
                                </span>
                              </div>
                              <a
                                href={listing.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`在官网查看 ${property.name} ${listing.unit}`}
                              >
                                {listing.precision === "unit"
                                  ? "官网直达房号"
                                  : "查看官网户型"}
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
                                ? "精确房号"
                                : "户型页"}
                            </span>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Building2 size={28} />
                      <h3>这个组合暂时没有房源</h3>
                      <p>
                        目录中的公寓仍在持续接入库存，可以先从官网查看。
                      </p>
                      <button
                        type="button"
                        onClick={() => setResultMode("directory")}
                      >
                        查看公寓目录
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
          最近验证：{capturedLabel(inventory.updatedAt)} · Pacific Time
        </div>
        <p>
          “收录”不代表背书；价格和可租状态可能随时变化，最终以公寓官网为准。本站与所列物业公司无隶属关系。
        </p>
      </footer>
    </main>
  );
}
