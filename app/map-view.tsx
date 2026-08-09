"use client";

import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";
import type {
  ApartmentListing,
  ApartmentProperty,
} from "./types";

type MapViewProps = {
  properties: ApartmentProperty[];
  listings: ApartmentListing[];
  activePropertyId: string | null;
  onSelect: (propertyId: string) => void;
};

function FitProperties({ properties }: { properties: ApartmentProperty[] }) {
  const map = useMap();

  useEffect(() => {
    if (!properties.length) return;
    if (properties.length === 1) {
      map.setView([properties[0].latitude, properties[0].longitude], 13, {
        animate: true,
      });
      return;
    }
    map.fitBounds(
      properties.map(
        (property) => [property.latitude, property.longitude] as [number, number],
      ),
      { padding: [36, 36], maxZoom: 12, animate: true },
    );
  }, [map, properties]);

  return null;
}

export default function MapView({
  properties,
  listings,
  activePropertyId,
  onSelect,
}: MapViewProps) {
  const countByProperty = listings.reduce<Record<string, number>>(
    (counts, listing) => {
      counts[listing.propertyId] = (counts[listing.propertyId] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return (
    <MapContainer
      center={[37.58, -122.08]}
      zoom={9}
      minZoom={8}
      maxZoom={16}
      scrollWheelZoom
      zoomControl
      className="map-canvas"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitProperties properties={properties} />
      {properties.map((property) => {
        const count = countByProperty[property.id] ?? 0;
        const active = activePropertyId === property.id;
        const fillColor =
          count > 0
            ? "#f16b3a"
            : property.inventoryStatus === "manual"
              ? "#87908b"
              : property.inventoryStatus === "blocked"
                ? "#b08752"
              : "#263b36";
        const era =
          property.qualification === "renovated"
            ? property.year
              ? `${property.year} 翻新`
              : "翻新品质"
            : property.qualification === "built" && property.year
              ? `${property.year} 建成`
              : "成熟品质社区";

        return (
          <CircleMarker
            key={property.id}
            center={[property.latitude, property.longitude]}
            radius={active ? 14 : count > 0 ? 11 : 8}
            pathOptions={{
              color: "#ffffff",
              weight: active ? 4 : 3,
              fillColor,
              fillOpacity: active ? 1 : 0.92,
            }}
            eventHandlers={{ click: () => onSelect(property.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <strong>{property.name}</strong>
              <span className="map-tooltip-meta">
                {count > 0
                  ? `${count} 套可租`
                  : property.inventoryStatus === "live"
                    ? "暂无房源"
                  : property.inventoryStatus === "manual"
                    ? "人工关注"
                    : property.inventoryStatus === "blocked"
                      ? "官网暂未开放库存"
                    : "库存接入中"}
              </span>
            </Tooltip>
            <Popup>
              <div className="map-popup">
                <span>{property.city}</span>
                <strong>{property.name}</strong>
                <p>{era} · {property.qualityNote}</p>
                <p>
                  {count > 0
                    ? `${count} 套可租`
                    : property.inventoryStatus === "live"
                      ? "暂无房源"
                    : property.inventoryStatus === "manual"
                      ? "人工关注"
                      : property.inventoryStatus === "blocked"
                        ? property.inventoryNote ?? "官网暂未开放实时库存"
                      : "官方库存接入中"}
                </p>
                <a href={property.website} target="_blank" rel="noreferrer">
                  查看官网
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
