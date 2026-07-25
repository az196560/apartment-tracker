"use client";

import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet";
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
      center={[37.525, -122.258]}
      zoom={11}
      minZoom={10}
      maxZoom={16}
      scrollWheelZoom
      zoomControl
      className="map-canvas"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {properties.map((property) => {
        const count = countByProperty[property.id] ?? 0;
        const active = activePropertyId === property.id;
        const fillColor =
          count > 0
            ? "#f16b3a"
            : property.inventoryStatus === "manual"
              ? "#87908b"
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
                  ? `${count} 套 1B1B`
                  : property.inventoryStatus === "manual"
                    ? "人工关注"
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
                    ? `${count} 套 1B1B 可租`
                    : property.inventoryStatus === "manual"
                      ? "人工关注"
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
