"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Search,
  Loader2,
  Compass,
  Layers,
  X,
  CheckCircle2,
  Crosshair,
  Laptop,
} from "lucide-react";
import toast from "react-hot-toast";

export interface AddressAutoFillDetails {
  city?: string;
  state?: string;
  pincode?: string;
  formattedAddress?: string;
  landmark?: string;
  houseNumber?: string;
  rawAddress?: any;
}

interface CustomerLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (
    lat: number,
    lng: number,
    details?: AddressAutoFillDetails
  ) => void;
  onGeocodingChange?: (isGeocoding: boolean) => void;
}

interface SuggestionItem {
  lat: number;
  lon: number;
  title: string;
  subtitle: string;
  display_name: string;
}

// Crisp customer delivery pin
const createDeliveryPinIcon = () =>
  L.divIcon({
    className: "customer-delivery-pin",
    html: `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e11d48;
        color: white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #ffffff;
        box-shadow: 0 4px 14px rgba(225, 29, 72, 0.55), 0 2px 6px rgba(0,0,0,0.35);
        cursor: grab;
      ">
        <svg style="transform: rotate(45deg); width: 18px; height: 18px; fill: white;" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
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

export default function CustomerLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onGeocodingChange,
}: CustomerLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);

  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

  const onGeocodingChangeRef = useRef(onGeocodingChange);
  onGeocodingChangeRef.current = onGeocodingChange;

  const activeGeocodeIdRef = useRef(0);
  const geocodeCacheRef = useRef<Map<string, AddressAutoFillDetails>>(new Map());
  const fetchAddressDetailsRef = useRef<((lat: number, lng: number) => Promise<AddressAutoFillDetails | null>) | null>(null);

  const defaultLat = 26.9124; // Jaipur fallback
  const defaultLng = 75.7873;

  const initialLat =
    latitude != null && !isNaN(Number(latitude)) && Number(latitude) !== 0
      ? Number(latitude)
      : defaultLat;
  const initialLng =
    longitude != null && !isNaN(Number(longitude)) && Number(longitude) !== 0
      ? Number(longitude)
      : defaultLng;

  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);
  const [mapType, setMapType] = useState<"satellite" | "streets">("satellite");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [searchResults, setSearchResults] = useState<SuggestionItem[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [resolvedSpot, setResolvedSpot] = useState<string>("");

  // Detect whether device has hardware GPS (Mobile / Tablet vs Laptop / PC)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isClientMobile = Boolean((navigator as any).userAgentData?.mobile);
    const isSmallTouchDevice = Boolean(navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

    setIsMobileDevice(Boolean(isMobileUa || isClientMobile || isSmallTouchDevice));
  }, []);

  // Sync internal state if external lat/lng changes
  useEffect(() => {
    if (latitude != null && longitude != null && latitude !== 0 && longitude !== 0) {
      if (
        Math.abs(latitude - currentLat) > 0.00001 ||
        Math.abs(longitude - currentLng) > 0.00001
      ) {
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([latitude, longitude]);
        }
      }
    }
  }, [latitude, longitude]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setShowResultsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live debounced search suggestions as user types
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchLiveSuggestions(q);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fast fetch helper with timeout to prevent long hangs
  const fetchWithTimeout = async (url: string, headers: HeadersInit = {}, timeoutMs = 2800) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  const fetchLiveSuggestions = async (queryText: string) => {
    setSearching(true);
    try {
      // 1. Try Photon (fast autocomplete)
      let items: SuggestionItem[] = [];
      try {
        const photonRes = await fetchWithTimeout(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(queryText)}&limit=6`
        );
        if (photonRes.ok) {
          const photonData = await photonRes.json();
          if (photonData?.features && photonData.features.length > 0) {
            items = photonData.features.map((f: any) => {
              const props = f.properties || {};
              const title = props.name || props.street || queryText;
              const subtitleParts = [
                props.city || props.district || props.county,
                props.state,
                props.postcode,
              ].filter(Boolean);
              const subtitle = subtitleParts.join(", ") || props.country || "";
              return {
                lat: f.geometry.coordinates[1],
                lon: f.geometry.coordinates[0],
                title,
                subtitle,
                display_name: [title, subtitle].filter(Boolean).join(", "),
              };
            });
          }
        }
      } catch {
        // fallback to Nominatim
      }

      // 2. If Photon had no results or failed, fallback to Nominatim
      if (items.length === 0) {
        try {
          const nomRes = await fetchWithTimeout(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              queryText
            )}&countrycodes=in&limit=6&addressdetails=1`,
            { Accept: "application/json" }
          );
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
              items = nomData.map((item: any) => {
                const parts = (item.display_name || "").split(",");
                const title = parts[0]?.trim() || item.name;
                const subtitle = parts.slice(1, 4).join(", ").trim();
                return {
                  lat: parseFloat(item.lat),
                  lon: parseFloat(item.lon),
                  title,
                  subtitle,
                  display_name: item.display_name,
                };
              });
            }
          }
        } catch {
          // ignore
        }
      }

      setSearchResults(items);
      setShowResultsDropdown(items.length > 0);
    } catch {
      // ignore network errors
    } finally {
      setSearching(false);
    }
  };

  // Ultra-fast reverse geocoding with caching, timeouts, and race-condition prevention
  const fetchAddressDetails = useCallback(
    async (lat: number, lng: number): Promise<AddressAutoFillDetails | null> => {
      const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      if (geocodeCacheRef.current.has(cacheKey)) {
        const cached = geocodeCacheRef.current.get(cacheKey)!;
        setResolvedSpot(cached.formattedAddress || cached.city || "Selected Location");
        setGeocoding(false);
        onGeocodingChangeRef.current?.(false);
        return cached;
      }

      const reqId = ++activeGeocodeIdRef.current;
      setGeocoding(true);
      onGeocodingChangeRef.current?.(true);

      try {
        // 1. Try BigDataCloud (Very fast for India coordinates, typically < 300ms)
        try {
          const bdcRes = await fetchWithTimeout(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            {},
            2400
          );
          if (bdcRes.ok && activeGeocodeIdRef.current === reqId) {
            const bdc = await bdcRes.json();
            const detectedCity = bdc.locality || bdc.city || "Jaipur";
            const detectedState = bdc.principalSubdivision || "Rajasthan";
            const detectedPincode = bdc.postcode || "";
            const spotName = [bdc.locality, bdc.city].filter(Boolean).join(", ") || "Selected Location";

            if (detectedCity && spotName !== "Selected Location") {
              const result: AddressAutoFillDetails = {
                city: detectedCity,
                state: detectedState,
                pincode: detectedPincode,
                formattedAddress: spotName,
                landmark: "",
                houseNumber: "",
                rawAddress: bdc,
              };
              setResolvedSpot(spotName);
              geocodeCacheRef.current.set(cacheKey, result);
              return result;
            }
          }
        } catch {
          // fallback to next
        }

        // 2. Try Photon reverse geocoding
        if (activeGeocodeIdRef.current === reqId) {
          try {
            const photonRes = await fetchWithTimeout(
              `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
              {},
              2600
            );
            if (photonRes.ok && activeGeocodeIdRef.current === reqId) {
              const pData = await photonRes.json();
              const props = pData?.features?.[0]?.properties;
              if (props) {
                const detectedCity =
                  props.city || props.district || props.county || "Jaipur";
                const detectedState = props.state || "Rajasthan";
                const detectedPincode = props.postcode || "";

                const roadParts = [
                  props.name,
                  props.street && props.name !== props.street ? props.street : null,
                  props.district && props.district !== props.name ? props.district : null,
                ]
                  .filter(Boolean)
                  .filter((val, idx, arr) => arr.indexOf(val) === idx);

                const detailedAddress =
                  roadParts.length > 0
                    ? roadParts.join(", ")
                    : props.name || "Selected Location";

                const result: AddressAutoFillDetails = {
                  city: detectedCity,
                  state: detectedState,
                  pincode: detectedPincode,
                  formattedAddress: detailedAddress,
                  landmark: props.name || "",
                  houseNumber: props.housenumber || "",
                  rawAddress: props,
                };

                setResolvedSpot(detailedAddress);
                geocodeCacheRef.current.set(cacheKey, result);
                return result;
              }
            }
          } catch {
            // fallback
          }
        }

        // 3. Fallback to OpenStreetMap Nominatim
        if (activeGeocodeIdRef.current === reqId) {
          try {
            const res = await fetchWithTimeout(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { Accept: "application/json" },
              2800
            );
            if (res.ok && activeGeocodeIdRef.current === reqId) {
              const data = await res.json();
              if (data?.address) {
                const addr = data.address;
                const detectedCity =
                  addr.city ||
                  addr.town ||
                  addr.village ||
                  addr.county ||
                  addr.state_district ||
                  "Jaipur";
                const detectedState = addr.state || "Rajasthan";
                const detectedPincode = addr.postcode || "";

                const roadParts = [
                  addr.amenity || addr.shop || addr.building,
                  addr.road,
                  addr.suburb || addr.neighbourhood || addr.residential,
                  addr.city_district || addr.subdistrict,
                ]
                  .filter(Boolean)
                  .filter((val, idx, arr) => arr.indexOf(val) === idx);

                const detailedAddress =
                  roadParts.length > 0
                    ? roadParts.join(", ")
                    : data.display_name
                    ? data.display_name.split(",").slice(0, 3).join(", ").trim()
                    : "";

                const spotName =
                  detailedAddress || data.display_name?.split(",")[0] || "Selected Location";

                const result: AddressAutoFillDetails = {
                  city: detectedCity,
                  state: detectedState,
                  pincode: detectedPincode,
                  formattedAddress: detailedAddress || spotName,
                  landmark: addr.amenity || addr.shop || addr.building || "",
                  houseNumber: addr.house_number || "",
                  rawAddress: addr,
                };

                setResolvedSpot(spotName);
                geocodeCacheRef.current.set(cacheKey, result);
                return result;
              }
            }
          } catch {
            // ignore network error
          }
        }
      } finally {
        if (activeGeocodeIdRef.current === reqId) {
          setGeocoding(false);
          onGeocodingChangeRef.current?.(false);
        }
      }
      return null;
    },
    []
  );

  fetchAddressDetailsRef.current = fetchAddressDetails;

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

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: true,
      scrollWheelZoom: false, // Prevent wheel trapping modal scroll
    });

    const initialConfig = TILE_LAYERS.satellite;
    const tileLayer = L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);
    activeTileLayerRef.current = tileLayer;

    const marker = L.marker([initialLat, initialLng], {
      icon: createDeliveryPinIcon(),
      draggable: true,
    }).addTo(map);

    marker.bindPopup("<b>Your Delivery Spot</b><br/>Drag pin onto your house rooftop").openPopup();

    const handleNewCoords = async (lat: number, lng: number) => {
      const cleanLat = Math.round(lat * 1000000) / 1000000;
      const cleanLng = Math.round(lng * 1000000) / 1000000;
      setCurrentLat(cleanLat);
      setCurrentLng(cleanLng);
      // Immediately notify parent of coordinates so selection is never empty or stale
      onLocationChangeRef.current(cleanLat, cleanLng);
      if (fetchAddressDetailsRef.current) {
        const details = await fetchAddressDetailsRef.current(cleanLat, cleanLng);
        if (details) {
          onLocationChangeRef.current(cleanLat, cleanLng, details);
        }
      }
    };

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      handleNewCoords(pos.lat, pos.lng);
    });

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      handleNewCoords(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    // Initial mount reverse-geocode
    if (fetchAddressDetailsRef.current) {
      fetchAddressDetailsRef.current(initialLat, initialLng).then((details) => {
        if (details) {
          onLocationChangeRef.current(initialLat, initialLng, details);
        }
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      activeTileLayerRef.current = null;
    };
  }, []);

  // Jump to spot from clicked suggestion
  const handleSelectSuggestion = async (item: SuggestionItem) => {
    const cleanLat = Math.round(item.lat * 1000000) / 1000000;
    const cleanLng = Math.round(item.lon * 1000000) / 1000000;

    setCurrentLat(cleanLat);
    setCurrentLng(cleanLng);
    setSearchQuery(item.title);
    setShowResultsDropdown(false);
    setResolvedSpot(item.title);

    if (markerRef.current) {
      markerRef.current.setLatLng([cleanLat, cleanLng]);
      markerRef.current.bindPopup(`<b>Delivery Spot</b><br/>${item.title}`).openPopup();
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([cleanLat, cleanLng], 17, { duration: 1.2 });
    }

    // Immediately notify with suggestion title so fields are not empty
    const suggestionDetails: AddressAutoFillDetails = {
      formattedAddress: item.title,
      landmark: item.title,
      city: item.subtitle?.split(",")?.[0]?.trim() || "Jaipur",
    };
    onLocationChangeRef.current(cleanLat, cleanLng, suggestionDetails);

    if (fetchAddressDetailsRef.current) {
      const details = await fetchAddressDetailsRef.current(cleanLat, cleanLng);
      if (details) {
        onLocationChangeRef.current(cleanLat, cleanLng, details);
      }
    }
    toast.success(`Selected: ${item.title}`);
  };

  const handleManualSearch = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (searchQuery.trim().length >= 2) {
      fetchLiveSuggestions(searchQuery.trim());
    } else {
      toast.error("Please type at least 2 letters of your area or colony");
    }
  };

  // Device GPS Location Handler (Only for Mobile devices with hardware GPS)
  const handleLocateMe = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
          const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;

          setCurrentLat(lat);
          setCurrentLng(lng);

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            markerRef.current
              .bindPopup("<b>Your GPS Location</b><br/>Drag pin onto your exact door")
              .openPopup();
          }

          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
          }

          onLocationChangeRef.current(lat, lng);
          if (fetchAddressDetailsRef.current) {
            const details = await fetchAddressDetailsRef.current(lat, lng);
            if (details) {
              onLocationChangeRef.current(lat, lng, details);
            }
          }
          toast.success("Current GPS location detected!");
        } catch {
          toast.error("Could not fetch address for this location");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        let msg = "Could not fetch device location";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access in your browser.";
        } else if (err.code === 2) {
          msg = "Position unavailable. Please ensure your device GPS is turned on.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please try again.";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return (
    <div className="customer-location-picker rounded-2xl border border-stone-200 bg-stone-50/80 p-3">
      {/* Notice for Laptop / Desktop Users (No GPS Hardware) */}
      {!isMobileDevice && (
        <div className="mb-2.5 flex items-start gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/80 p-2.5 text-stone-800 shadow-2xs">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
            <Laptop size={13} />
          </div>
          <div className="text-xs">
            <p className="font-bold text-amber-950 leading-tight">
              Laptop / Desktop Detected (No Hardware GPS)
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-amber-900/90 leading-tight">
              Laptops and PCs lack physical GPS chips. To set your delivery location accurately, search your colony/area in the search box, or drag the red pin directly to your building on the map.
            </p>
          </div>
        </div>
      )}

      {/* Header bar with controls */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
          <MapPin size={15} className="text-[var(--color-primary)]" />
          <span>Pin Delivery Location on Map</span>
        </div>

        {/* View Toggle & Locate Button */}
        <div className="flex items-center gap-1.5">
          {/* Only show Locate Me button on Mobile devices with hardware GPS */}
          {isMobileDevice && (
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary)] shadow-2xs transition hover:bg-rose-50 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Detect current GPS location"
            >
              {locating ? (
                <Loader2 size={12} className="animate-spin text-[var(--color-primary)]" />
              ) : (
                <Crosshair size={12} className="text-[var(--color-primary)]" />
              )}
              <span>{locating ? "Locating..." : "Locate Me"}</span>
            </button>
          )}

          <div className="inline-flex overflow-hidden rounded-lg border border-stone-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => switchTileLayer("satellite")}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold transition-all ${
                mapType === "satellite"
                  ? "bg-stone-900 text-white shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Compass size={11} />
              <span>Satellite</span>
            </button>
            <button
              type="button"
              onClick={() => switchTileLayer("streets")}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold transition-all ${
                mapType === "streets"
                  ? "bg-stone-900 text-white shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Layers size={11} />
              <span>Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Case A: Mobile Phone with GPS -> Show Quick 1-Tap GPS Action Banner */}
      {isMobileDevice && (
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="mb-2.5 flex w-full items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-left transition hover:bg-rose-100/80 hover:border-rose-300 active:scale-[0.99] disabled:opacity-60 cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-2xs">
              {locating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Crosshair size={14} />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 leading-tight flex items-center gap-1">
                <span>{locating ? "Detecting GPS location..." : "Use Current Location"}</span>
                <span className="text-[10px] text-rose-600 font-semibold">(GPS)</span>
              </p>
              <p className="text-[10.5px] font-medium text-stone-500 leading-tight">
                Tap to auto-detect your delivery address & pinpoint on map
              </p>
            </div>
          </div>
          <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--color-primary)] shadow-2xs border border-rose-200 shrink-0">
            {locating ? "Locating..." : "Locate Me"}
          </span>
        </button>
      )}

      {/* Search Input Bar with Live Suggestions Dropdown */}
      <div ref={searchWrapperRef} className="relative mb-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowResultsDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleManualSearch(e);
                }
              }}
              placeholder="Type your colony, society, landmark or area..."
              className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-8.5 pr-8 text-xs font-medium text-stone-800 placeholder-stone-400 shadow-xs focus:border-[var(--color-primary)] focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowResultsDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleManualSearch}
            disabled={searching}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white shadow-2xs transition hover:opacity-90 disabled:opacity-50"
          >
            {searching ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <span>Search</span>
            )}
          </button>
        </div>

        {/* Live Swiggy-Style Suggestions Dropdown */}
        {showResultsDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl">
            <div className="mb-1 flex items-center justify-between border-b border-stone-100 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-stone-400">
              <span>Matching Locations (Select one)</span>
              <button
                type="button"
                onClick={() => setShowResultsDropdown(false)}
                className="text-stone-400 hover:text-stone-700 font-normal normal-case"
              >
                Close
              </button>
            </div>
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="group flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-stone-50 active:bg-stone-100"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary)] transition group-hover:bg-[var(--color-primary)] group-hover:text-white">
                  <MapPin size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-stone-900 group-hover:text-[var(--color-primary)]">
                    {item.title}
                  </p>
                  <p className="truncate text-[11px] font-medium text-stone-500">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div
        className="relative overflow-hidden rounded-xl border border-stone-300 shadow-inner isolate"
        style={{ height: "260px" }}
      >
        <div ref={mapContainerRef} style={{ height: "100%", width: "100%", zIndex: 1 }} />

        {/* Floating loading overlay when geocoding is active */}
        {geocoding && (
          <div className="absolute inset-x-0 top-3 z-10 flex justify-center px-3 pointer-events-none">
            <div className="flex items-center gap-2 rounded-full bg-stone-900/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-xs animate-pulse border border-stone-700">
              <Loader2 size={13} className="animate-spin text-amber-400" />
              <span>Fetching exact address for pinned location...</span>
            </div>
          </div>
        )}

        {/* Satellite/Street floating pill */}
        <div className="pointer-events-none absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              mapType === "satellite" ? "bg-emerald-400" : "bg-sky-400"
            }`}
          />
          <span>{mapType === "satellite" ? "Satellite View" : "Road Map"}</span>
        </div>
      </div>

      {/* Bottom helper & spot status */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold text-stone-800">
          {geocoding ? (
            <>
              <Loader2 size={13} className="animate-spin text-amber-600 shrink-0" />
              <span className="text-amber-700">Reading exact address for pin...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span className="text-emerald-800 truncate">
                {resolvedSpot
                  ? `Pin set: ${resolvedSpot}`
                  : `Pin at ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`}
              </span>
            </>
          )}
        </div>
        <span className="text-[10px] text-stone-500">
          Drag red pin onto your exact building or gate
        </span>
      </div>
    </div>
  );
}
