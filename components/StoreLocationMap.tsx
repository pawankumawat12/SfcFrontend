"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, ExternalLink, MapPin, Compass, Layers } from "lucide-react";

interface StoreLocationMapProps {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  storeName?: string;
  height?: string;
  showDirectionsBar?: boolean;
  className?: string;
  defaultView?: "satellite" | "streets";
}

// Crisp, custom Bakery location pin for Leaflet
const createBakeryPin = (storeName: string) =>
  L.divIcon({
    className: "sfc-bakery-pin",
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e11d48;
        color: white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #ffffff;
        box-shadow: 0 6px 18px rgba(225, 29, 72, 0.55), 0 2px 6px rgba(0,0,0,0.35);
      ">
        <svg style="transform: rotate(45deg); width: 22px; height: 22px; fill: white;" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });

const TILE_LAYERS = {
  satellite: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    options: {
      attribution: "&copy; Google Maps Hybrid",
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },
  },
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    },
  },
};

export default function StoreLocationMap({
  latitude,
  longitude,
  address,
  storeName = "SFC Bakers",
  height = "280px",
  showDirectionsBar = true,
  className = "",
  defaultView = "satellite",
}: StoreLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mapType, setMapType] = useState<"satellite" | "streets">(defaultView);

  // Safe fallback coordinates (Jaipur)
  const defaultLat = 26.9124;
  const defaultLng = 75.7873;

  const validLat =
    latitude != null && !isNaN(Number(latitude)) && Number(latitude) !== 0
      ? Number(latitude)
      : defaultLat;
  const validLng =
    longitude != null && !isNaN(Number(longitude)) && Number(longitude) !== 0
      ? Number(longitude)
      : defaultLng;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${validLat},${validLng}&travelmode=driving`;

  const switchTileLayer = useCallback((type: "satellite" | "streets") => {
    if (!mapInstanceRef.current) return;
    if (activeTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(activeTileLayerRef.current);
    }
    const config = TILE_LAYERS[type];
    const newLayer = L.tileLayer(config.url, config.options);
    newLayer.addTo(mapInstanceRef.current);
    activeTileLayerRef.current = newLayer;
    setMapType(type);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [validLat, validLng],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: false, // Prevent page scroll trapping
      });

      // Default to Satellite (Hybrid) view matching Google Maps screenshot
      const initialConfig = TILE_LAYERS[defaultView];
      const tileLayer = L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);
      activeTileLayerRef.current = tileLayer;

      const marker = L.marker([validLat, validLng], {
        icon: createBakeryPin(storeName),
      }).addTo(map);

      const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 180px;">
          <strong style="color: #e11d48; font-size: 14px; display: block; margin-bottom: 2px;">${storeName}</strong>
          <p style="margin: 0 0 8px 0; color: #374151; font-size: 12px; font-weight: 500;">${address || "Visit us today!"}</p>
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #e11d48;
            color: white;
            padding: 5px 12px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 11px;
            box-shadow: 0 2px 4px rgba(225, 29, 72, 0.3);
          ">
            Get Directions &rarr;
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml).openPopup();

      mapInstanceRef.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } else {
      mapInstanceRef.current.setView([validLat, validLng], 16);
      if (markerRef.current) {
        markerRef.current.setLatLng([validLat, validLng]);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        activeTileLayerRef.current = null;
      }
    };
  }, [mounted, validLat, validLng, address, storeName, directionsUrl, defaultView]);

  if (!mounted) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-900 text-stone-300 text-sm ${className}`}
        style={{ height }}
      >
        <span className="flex items-center gap-2">
          <MapPin size={16} className="animate-bounce text-[var(--color-primary)]" />
          Loading satellite map...
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-stone-900 shadow-md isolate ${className}`}
    >
      {/* Floating Map Mode Toggle */}
      <div className="absolute right-3 top-3 z-10 flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/60 p-0.5 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => switchTileLayer("satellite")}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold transition-all rounded-lg ${
            mapType === "satellite"
              ? "bg-white text-stone-900 shadow-xs"
              : "text-white/80 hover:text-white"
          }`}
          title="Satellite view with real imagery"
        >
          <Compass size={12} />
          <span>Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => switchTileLayer("streets")}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold transition-all rounded-lg ${
            mapType === "streets"
              ? "bg-white text-stone-900 shadow-xs"
              : "text-white/80 hover:text-white"
          }`}
          title="Standard street map"
        >
          <Layers size={12} />
          <span>Map</span>
        </button>
      </div>

      <div
        ref={mapContainerRef}
        style={{ height, width: "100%", zIndex: 1 }}
        className="w-full"
      />

      {showDirectionsBar && (
        <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-white px-4 py-2.5 text-xs">
          <span className="truncate font-semibold text-[var(--color-text-secondary)]">
            {address || `${storeName} (${validLat.toFixed(4)}, ${validLng.toFixed(4)})`}
          </span>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 inline-flex shrink-0 items-center gap-1.5 font-bold text-[var(--color-primary)] hover:underline"
          >
            <Navigation size={13} />
            <span>Get Directions</span>
            <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  );
}
