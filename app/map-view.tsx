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
import { copy, type Language } from "./i18n";

type MapViewProps = {
  properties: ApartmentProperty[];
  listings: ApartmentListing[];
  activePropertyId: string | null;
  onSelect: (propertyId: string) => void;
  language: Language;
};

function mapEra(property: ApartmentProperty, language: Language) {
  const t = copy[language];
  if (property.qualification === "renovated") {
    if (!property.year) return t.renovatedQuality;
    return language === "zh"
      ? `${property.year} ${t.renovated}`
      : `${t.renovated} ${property.year}`;
  }
  if (property.qualification === "built" && property.year) {
    return language === "zh"
      ? `${property.year} ${t.built}`
      : `${t.built} ${property.year}`;
  }
  return t.established;
}

function mapInventoryLabel(
  property: ApartmentProperty,
  count: number,
  language: Language,
  long = false,
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
    if (language === "zh" && long && property.inventoryNote) {
      return property.inventoryNote;
    }
    return long
      ? t.officialInventoryUnavailableLong
      : t.officialInventoryUnavailable;
  }
  return t.inventoryConnecting;
}

function mapPropertyNote(property: ApartmentProperty, language: Language) {
  if (property.airConditioning === null) {
    return copy[language].unverifiedCriteriaNote;
  }
  if (language === "zh") return property.qualityNote;
  return `${copy.en.verifiedCommunityNote} ${property.management}. ${copy.en.verifiedCriteriaNote}`;
}

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
  language,
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
        const era = mapEra(property, language);

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
                {mapInventoryLabel(property, count, language)}
              </span>
            </Tooltip>
            <Popup>
              <div className="map-popup">
                <span>{property.city}</span>
                <strong>{property.name}</strong>
                <p>{era} · {mapPropertyNote(property, language)}</p>
                <p>{mapInventoryLabel(property, count, language, true)}</p>
                <a href={property.website} target="_blank" rel="noreferrer">
                  {copy[language].officialSite}
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
