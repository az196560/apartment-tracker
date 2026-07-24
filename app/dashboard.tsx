"use client";

import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
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
  InventoryData,
} from "./types";

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" aria-live="polite">
      <LocateFixed size={20} />
      正在加载半岛地图…
    </div>
  ),
});

const inventory = inventoryJson as InventoryData;
const corridorCities = [
  "全部城市",
  "Burlingame",
  "San Mateo",
  "Belmont",
  "San Carlos",
  "Redwood City",
  "Menlo Park",
];

type SortMode = "price" | "date" | "size";
type MobileView = "map" | "list";

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
  }).format(new Date(value));
}

export default function Dashboard() {
  const [city, setCity] = useState("全部城市");
  const [maxRent, setMaxRent] = useState(4300);
  const [availableNow, setAvailableNow] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("price");
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("map");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredListings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows = inventory.listings.filter((listing) => {
      const property = getProperty(listing);
      const matchesQuery =
        !normalizedQuery ||
        property.name.toLowerCase().includes(normalizedQuery) ||
        property.city.toLowerCase().includes(normalizedQuery) ||
        listing.unit.toLowerCase().includes(normalizedQuery);

      return (
        (city === "全部城市" || property.city === city) &&
        listing.rent <= maxRent &&
        (!availableNow || listing.availableDate <= "2026-07-23") &&
        matchesQuery
      );
    });

    return [...rows].sort((a, b) => {
      if (sort === "date") {
        return a.availableDate.localeCompare(b.availableDate);
      }
      if (sort === "size") return b.sqft - a.sqft;
      return a.rent - b.rent;
    });
  }, [availableNow, city, maxRent, query, sort]);

  const visiblePropertyIds = new Set(
    filteredListings.map((listing) => listing.propertyId),
  );
  const visibleProperties = inventory.properties.filter(
    (property) =>
      visiblePropertyIds.has(property.id) ||
      (city === "全部城市" || property.city === city),
  );
  const averageRent = Math.round(
    filteredListings.reduce((sum, listing) => sum + listing.rent, 0) /
      Math.max(filteredListings.length, 1),
  );
  const exactLinks = filteredListings.filter(
    (listing) => listing.precision === "unit",
  ).length;

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
    setCity("全部城市");
    setMaxRent(4300);
    setAvailableNow(false);
    setQuery("");
  }

  const hasFilters =
    city !== "全部城市" || maxRent < 4300 || availableNow || query.length > 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Peninsula One 首页">
          <span className="brand-mark">P1</span>
          <span>
            <strong>Peninsula One</strong>
            <small>半岛 1B1B 房源雷达</small>
          </span>
        </a>
        <div className="topbar-actions">
          <span className="sync-pill">
            <span className="sync-dot" />
            每日自动检查 · 06:17
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
            Burlingame → Menlo Park · US-101 走廊
          </div>
          <h1>
            新公寓，<span>先一步看到。</span>
          </h1>
          <p>
            只追踪近 10 年建成或翻新的公寓，每天从官方租赁网站收集
            1B1B 可租信息，并尽可能直达具体房号。
          </p>
        </div>
        <div className="hero-stats" aria-label="房源概览">
          <div className="stat">
            <span>当前房源</span>
            <strong>{inventory.listings.length}</strong>
            <small>套 1B1B</small>
          </div>
          <div className="stat">
            <span>监控公寓</span>
            <strong>{inventory.properties.length}</strong>
            <small>个社区</small>
          </div>
          <div className="stat">
            <span>精确直达</span>
            <strong>
              {inventory.listings.filter((item) => item.precision === "unit").length}
            </strong>
            <small>个房号</small>
          </div>
        </div>
      </section>

      <section className="city-rail" aria-label="城市筛选">
        {corridorCities.map((item) => (
          <button
            key={item}
            type="button"
            className={city === item ? "city-chip active" : "city-chip"}
            onClick={() => setCity(item)}
          >
            {city === item && <Check size={13} />}
            {item}
          </button>
        ))}
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
              placeholder="公寓、城市或房号"
            />
          </label>

          <div className="filter-group">
            <div className="filter-label">
              <span>月租上限</span>
              <strong>${maxRent.toLocaleString()}</strong>
            </div>
            <input
              className="range"
              type="range"
              min="3600"
              max="4300"
              step="50"
              value={maxRent}
              onChange={(event) => setMaxRent(Number(event.target.value))}
              aria-label="月租上限"
            />
            <div className="range-ends">
              <span>$3,600</span>
              <span>$4,300+</span>
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-title">户型</span>
            <button className="locked-filter" type="button">
              <Building2 size={17} />
              <span>1 Bedroom · 1 Bathroom</span>
              <Check size={16} />
            </button>
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

          <div className="criteria-card">
            <span className="criteria-icon">
              <Clock3 size={18} />
            </span>
            <div>
              <strong>10 年新房标准</strong>
              <p>2016 年后建成或完成整体翻新，且位于 101 沿线城市。</p>
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
              <span className="overline">LIVE INVENTORY</span>
              <h2>
                找到 <strong>{filteredListings.length}</strong> 套房源
              </h2>
            </div>
            <div className="toolbar-actions">
              <button
                className="filter-trigger"
                type="button"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={16} />
                筛选
              </button>
              <label className="sort-select">
                <span>排序</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                >
                  <option value="price">价格最低</option>
                  <option value="date">最早入住</option>
                  <option value="size">面积最大</option>
                </select>
                <ChevronDown size={15} />
              </label>
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
            <div className={`map-panel ${mobileView === "map" ? "mobile-active" : ""}`}>
              <MapView
                properties={visibleProperties}
                listings={filteredListings}
                activePropertyId={activePropertyId}
                onSelect={selectProperty}
              />
              <div className="map-legend">
                <span>
                  <i className="available-marker" /> 有可租房源
                </span>
                <span>
                  <i className="watching-marker" /> 监控中
                </span>
              </div>
            </div>

            <div
              className={`listing-panel ${
                mobileView === "list" ? "mobile-active" : ""
              }`}
            >
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
                    return (
                      <article
                        key={listing.id}
                        data-property={property.id}
                        className={
                          activePropertyId === property.id
                            ? "listing-card active"
                            : "listing-card"
                        }
                        onMouseEnter={() => setActivePropertyId(property.id)}
                      >
                        <div className="listing-main">
                          <div className="listing-location">
                            <span>{property.city}</span>
                            <small>
                              {property.year}
                              {property.qualification === "built" ? " 建成" : " 翻新"}
                            </small>
                          </div>
                          <h3>{property.name}</h3>
                          <p>{property.address}</p>
                          <div className="unit-line">
                            <strong>{listing.unit}</strong>
                            <span>{listing.floorplan}</span>
                            <span>{listing.sqft} ft²</span>
                          </div>
                        </div>
                        <div className="listing-price">
                          <strong>${listing.rent.toLocaleString()}</strong>
                          <span>/ 月起</span>
                        </div>
                        <div className="listing-footer">
                          <div>
                            <CalendarDays size={15} />
                            <span>{displayDate(listing.availableDate)}</span>
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
                          {listing.precision === "unit" ? "精确房号" : "户型页"}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <Building2 size={28} />
                  <h3>这个组合暂时没有房源</h3>
                  <p>可以提高预算上限，或关闭“现在可入住”。</p>
                  <button type="button" onClick={clearFilters}>
                    重置筛选
                  </button>
                </div>
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
          价格和可租状态可能随时变化；最终信息以公寓官网为准。本站与所列物业公司无隶属关系。
        </p>
      </footer>
    </main>
  );
}
