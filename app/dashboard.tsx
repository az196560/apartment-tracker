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
  "Foster City",
  "Belmont",
  "San Carlos",
  "Redwood City",
  "Menlo Park",
];

type SortMode = "price" | "date" | "size";
type MobileView = "map" | "list";
type ResultMode = "directory" | "availability";

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
  if (count > 0) return `${count} 套 1B1B`;
  if (property.inventoryStatus === "live") return "暂无房源";
  if (property.inventoryStatus === "manual") return "人工关注";
  if (property.inventoryStatus === "blocked") return "官网暂未开放库存";
  return "库存接入中";
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
  const [city, setCity] = useState("全部城市");
  const [maxRent, setMaxRent] = useState(6000);
  const [availableNow, setAvailableNow] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("price");
  const [resultMode, setResultMode] = useState<ResultMode>("directory");
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("map");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return inventory.properties.filter((property) => {
      const matchesQuery =
        !normalizedQuery ||
        property.name.toLowerCase().includes(normalizedQuery) ||
        property.city.toLowerCase().includes(normalizedQuery) ||
        property.address.toLowerCase().includes(normalizedQuery) ||
        property.qualityNote.toLowerCase().includes(normalizedQuery);

      return (
        (city === "全部城市" || property.city === city) && matchesQuery
      );
    });
  }, [city, query]);

  const filteredListings = useMemo(() => {
    const visiblePropertyIds = new Set(
      filteredProperties.map((property) => property.id),
    );
    const rows = inventory.listings.filter(
      (listing) =>
        visiblePropertyIds.has(listing.propertyId) &&
        listing.rent <= maxRent &&
        (!availableNow ||
          listing.availableDate <= inventory.updatedAt.slice(0, 10)),
    );

    return [...rows].sort((a, b) => {
      if (sort === "date") {
        return a.availableDate.localeCompare(b.availableDate);
      }
      if (sort === "size") return b.sqft - a.sqft;
      return a.rent - b.rent;
    });
  }, [availableNow, filteredProperties, maxRent, sort]);

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
    setMaxRent(6000);
    setAvailableNow(false);
    setQuery("");
  }

  const hasFilters =
    city !== "全部城市" ||
    (resultMode === "availability" && maxRent < 6000) ||
    (resultMode === "availability" && availableNow) ||
    query.length > 0;

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
            好公寓，<span>都放进雷达。</span>
          </h1>
          <p>
            不再只按房龄筛选。我们收录管理规范、维护良好、配套完整且有官方租赁渠道的
            品质公寓，每天检查 1B1B 库存，并尽可能直达具体房号。
          </p>
        </div>
        <div className="hero-stats" aria-label="房源概览">
          <div className="stat">
            <span>当前房源</span>
            <strong>{inventory.listings.length}</strong>
            <small>套 1B1B</small>
          </div>
          <div className="stat">
            <span>品质公寓</span>
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

      <section className="city-rail" aria-label="城市筛选">
        {corridorCities.map((item) => {
          const cityCount =
            item === "全部城市"
              ? inventory.properties.length
              : inventory.properties.filter(
                  (property) => property.city === item,
                ).length;

          return (
            <button
              key={item}
              type="button"
              className={city === item ? "city-chip active" : "city-chip"}
              onClick={() => setCity(item)}
            >
              {city === item && <Check size={13} />}
              {item}
              <small>{cityCount}</small>
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
              placeholder="公寓、城市或特色"
            />
          </label>

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
                  min="3000"
                  max="6000"
                  step="50"
                  value={maxRent}
                  onChange={(event) => setMaxRent(Number(event.target.value))}
                  aria-label="月租上限"
                />
                <div className="range-ends">
                  <span>$3,000</span>
                  <span>$6,000+</span>
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
            </>
          )}

          <div className="criteria-card">
            <span className="criteria-icon">
              <Building2 size={18} />
            </span>
            <div>
              <strong>品质公寓标准</strong>
              <p>
                专业管理、维护良好、配套完整并有稳定官网；不收录收入、雇主或身份资格受限社区。
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
                  ? "CURATED DIRECTORY"
                  : "LIVE INVENTORY"}
              </span>
              <h2>
                {resultMode === "directory" ? "收录" : "找到"}{" "}
                <strong>
                  {resultMode === "directory"
                    ? filteredProperties.length
                    : filteredListings.length}
                </strong>{" "}
                {resultMode === "directory" ? "个品质公寓" : "套房源"}
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
                      <strong>7</strong>
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
                              <span>{property.city}</span>
                              <small>{propertyEra(property)}</small>
                            </div>
                            <h3>{property.name}</h3>
                            <p className="property-address">
                              {property.address}
                            </p>
                            <p className="quality-note">
                              {property.inventoryNote ?? property.qualityNote}
                            </p>
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
                      <p>换一个城市或搜索词试试。</p>
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
                                <span>{property.city}</span>
                                <small>{propertyEra(property)}</small>
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
                                <span>抓取于 {capturedLabel(listing.capturedAt)}</span>
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
