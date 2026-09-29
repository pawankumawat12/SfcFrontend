"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  X,
  MapPin,
  Home,
  Briefcase,
  Building,
  Check,
  Loader2,
  ArrowRight,
  User,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  Address,
  CreateAddressPayload,
} from "@/redux/services/addressApi";
import { useLazyResolveStoreByLocationQuery } from "@/redux/services/branchStoreApi";
import {
  getStoredDeliveryLocation,
  setStoredDeliveryLocation,
  DeliveryLocation,
} from "@/lib/deliveryLocation";
import type { AddressAutoFillDetails } from "@/components/CustomerLocationPicker";
import { isValidIndianPhone, normalizeIndianPhone, sanitizePhoneInput } from "@/lib/phone";

const CustomerLocationPicker = dynamic(
  () => import("@/components/CustomerLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] w-full rounded-2xl bg-stone-100 flex items-center justify-center text-xs text-stone-400">
        Loading location map...
      </div>
    ),
  }
);

interface SelectLocationModalProps {
  open: boolean;
  onClose: () => void;
  canDismiss?: boolean;
}

export default function SelectLocationModal({
  open,
  onClose,
  canDismiss = true,
}: SelectLocationModalProps) {
  const user = useSelector((state: any) => state.auth?.user);
  const { data: addressesRes } = useGetAddressesQuery(undefined, {
    skip: !user,
  });
  const savedAddresses: Address[] = addressesRes?.data || [];
  const [createAddress, { isLoading: isSavingAddress }] =
    useCreateAddressMutation();
  const [updateAddress, { isLoading: isUpdatingAddress }] =
    useUpdateAddressMutation();

  const [triggerResolveStore, { isLoading: isResolving }] =
    useLazyResolveStoreByLocationQuery();

  // Location and address form state
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLng, setPickedLng] = useState<number | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState<number | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  const isLocationActionInProgress =
    isGeocoding || isResolving || isSavingAddress || isUpdatingAddress;

  // Address fields
  const [houseNumber, setHouseNumber] = useState<string>("");
  const [roadArea, setRoadArea] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [city, setCity] = useState<string>("Jaipur");
  const [state, setState] = useState<string>("Rajasthan");
  const [pincode, setPincode] = useState<string>("");
  const [receiverName, setReceiverName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [label, setLabel] = useState<string>("Home");
  const prevOpenRef = useRef(false);

  // Initialize with currently saved location ONLY once when modal opens
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const current = getStoredDeliveryLocation();
      if (current) {
        setPickedLat(current.lat);
        setPickedLng(current.lng);
        setHouseNumber(current.houseNumber || "");
        setRoadArea(current.roadArea || current.address || "");
        setLandmark(current.landmark || "");
        setCity(current.city || "Jaipur");
        setState(current.state || "Rajasthan");
        setPincode(current.pincode || "");
        setReceiverName(current.receiverName || user?.name || "");
        setPhone(sanitizePhoneInput(current.phone || user?.phone || user?.phone_number || ""));
        setLabel(current.label || "Home");
        setSelectedSavedId(current.addressId || null);
        setEditingAddressId(current.addressId || null);
      } else {
        const defaultAddr = savedAddresses?.find((a) => a.is_default) || savedAddresses?.[0];
        if (defaultAddr) {
          setEditingAddressId(defaultAddr.id);
        }
        setReceiverName(user?.name || "");
        setPhone(sanitizePhoneInput(user?.phone || user?.phone_number || ""));
      }
    }
    prevOpenRef.current = open;
  }, [open, user, savedAddresses]);

  const handleLocationPicked = (
    lat: number,
    lng: number,
    details?: AddressAutoFillDetails
  ) => {
    setPickedLat(lat);
    setPickedLng(lng);
    setSelectedSavedId(null);

    if (details) {
      if (details.city) setCity(details.city);
      if (details.state) setState(details.state);
      if (details.pincode) setPincode(details.pincode);
      if (details.formattedAddress) {
        setRoadArea(details.formattedAddress);
      }
      if (details.landmark && !landmark) {
        setLandmark(details.landmark);
      }
      if (details.houseNumber && !houseNumber) {
        setHouseNumber(details.houseNumber);
      }
    }

    if (!receiverName && user?.name) {
      setReceiverName(user.name);
    }
    if (!phone && (user?.phone || user?.phone_number)) {
      setPhone(sanitizePhoneInput(user.phone || user.phone_number));
    }
  };

  const handleSelectSavedAddress = (addr: Address) => {
    setIsGeocoding(false);
    setSelectedSavedId(addr.id);
    setEditingAddressId(addr.id);
    const lat = addr.latitude ? Number(addr.latitude) : 26.9124;
    const lng = addr.longitude ? Number(addr.longitude) : 75.7873;
    setPickedLat(lat);
    setPickedLng(lng);
    setHouseNumber(addr.house_number || "");
    setRoadArea(addr.formatted_address || `${addr.house_number}, ${addr.city}`);
    setLandmark(addr.landmark || "");
    setCity(addr.city || "Jaipur");
    setState(addr.state || "Rajasthan");
    setPincode(addr.pincode || "");
    setReceiverName(addr.receiver_name || user?.name || "");
    setPhone(sanitizePhoneInput(addr.phone_number || user?.phone || ""));
    setLabel(addr.label || "Home");
  };

  const handleConfirmLocation = async () => {
    if (isGeocoding) {
      toast("Pinpoint address is still being detected. Please wait a moment...", {
        icon: "📍",
      });
      return;
    }

    if (isResolving || isSavingAddress || isUpdatingAddress) {
      return;
    }

    if (pickedLat == null || pickedLng == null) {
      toast.error("Please pick your location on the map or select a saved address first.");
      return;
    }

    const cleanArea = roadArea.trim();
    if (!cleanArea && !houseNumber.trim()) {
      toast.error("Please enter house number or road / area name");
      return;
    }

    const cleanPhone = phone ? normalizeIndianPhone(phone) : "";
    if (!cleanPhone) {
      toast.error("Mobile number is required for delivery");
      return;
    }
    if (!isValidIndianPhone(cleanPhone)) {
      toast.error("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    try {
      // 1. Resolve store branch for these coordinates
      const res = await triggerResolveStore({ lat: pickedLat, lng: pickedLng }).unwrap();
      const store = res?.store;
      const isBranch = res?.storeType === "branch" && store?.id;

      const isOutOfDeliveryZone = Boolean(
        res?.can_deliver === false || (res as any)?.outOfDeliveryZone
      );

      if (isOutOfDeliveryZone) {
        toast(
          res?.message || "This address is outside our delivery zone.",
          { duration: 5500, icon: "⚠️" }
        );
      }

      // 2. Build human-readable address
      const fullAddr = [
        houseNumber.trim(),
        cleanArea,
        landmark.trim() ? `Near ${landmark.trim()}` : "",
        city.trim(),
        state.trim(),
        pincode.trim(),
      ]
        .filter(Boolean)
        .join(", ");

      const shortAddr =
        (label ? `${label} - ` : "") +
        (houseNumber.trim() ? `${houseNumber.trim()}, ` : "") +
        (cleanArea.split(",")[0] || city || "Delivery Spot");

      let resolvedAddressId = editingAddressId || selectedSavedId;

      // 3. If user is logged in, UPDATE the existing address or CREATE if user has none
      const effectiveHouseNumber = houseNumber.trim() || cleanArea.split(",")[0] || "Address Spot";
      if (user && cleanArea) {
        const payload: CreateAddressPayload = {
          label: label || "Home",
          receiver_name: receiverName.trim() || user.name || "Customer",
          phone_number: cleanPhone || user.phone || "9999999999",
          house_number: effectiveHouseNumber,
          formatted_address: cleanArea,
          landmark: landmark.trim() || undefined,
          city: city.trim() || "Jaipur",
          state: state.trim() || "Rajasthan",
          pincode: pincode.trim() || "302001",
          latitude: pickedLat,
          longitude: pickedLng,
        };

        const existingAddr = resolvedAddressId
          ? savedAddresses.find((a) => a.id === resolvedAddressId)
          : (savedAddresses.find((a) => a.is_default) || savedAddresses[0]);

        if (existingAddr) {
          // Edit/Update the existing address in-place — do NOT create duplicate addresses!
          try {
            await updateAddress({ id: existingAddr.id, data: payload }).unwrap();
            resolvedAddressId = existingAddr.id;
          } catch (updateErr) {
            console.warn("Could not update existing address:", updateErr);
          }
        } else {
          // User has NO existing addresses at all -> create their first address
          try {
            const savedRes = await createAddress({ ...payload, is_default: true }).unwrap();
            if (savedRes?.data?.id) {
              resolvedAddressId = savedRes.data.id;
            }
          } catch (createErr) {
            console.warn("Could not create address:", createErr);
          }
        }
      }

      // 4. Save into centralized storage (persists even if user logs out!)
      const newDeliveryLocation: DeliveryLocation = {
        lat: pickedLat,
        lng: pickedLng,
        address: fullAddr,
        shortAddress: shortAddr,
        houseNumber: houseNumber.trim(),
        roadArea: cleanArea,
        landmark: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        receiverName: receiverName.trim(),
        phone: cleanPhone,
        label,
        addressId: resolvedAddressId,
        storeId: isBranch ? Number(store.id) : "admin",
        storeName: store?.name || "Main Bakery",
        isSet: true,
        distanceKm: res?.distanceKm != null ? Number(res.distanceKm) : null,
        canDeliver: !isOutOfDeliveryZone,
        outOfDeliveryZone: isOutOfDeliveryZone,
        deliveryWarning: isOutOfDeliveryZone
          ? res?.message || "Delivery is available in our covered service areas."
          : null,
        maxDeliveryRadius: (res as any)?.max_delivery_distance || 10,
      };

      setStoredDeliveryLocation(newDeliveryLocation);

      if (isBranch) {
        toast.success(
          `Delivering to ${newDeliveryLocation.shortAddress}! Fulfilled by ${store.name} (${res.distanceKm} km away)`,
          { duration: 4500, icon: "📍" }
        );
      } else {
        toast.success(
          `Delivering to ${newDeliveryLocation.shortAddress}! Fulfilled by Main Bakery`,
          { duration: 4000, icon: "📍" }
        );
      }

      onClose();
    } catch (err: any) {
      console.warn("Failed to resolve store by location, falling back:", err);
      const fallbackLocation: DeliveryLocation = {
        lat: pickedLat,
        lng: pickedLng,
        address: roadArea.trim() || "Selected Delivery Location",
        shortAddress: houseNumber.trim() ? `${houseNumber.trim()}, ${roadArea.trim()}` : (roadArea.trim() || "Delivery Location"),
        houseNumber: houseNumber.trim(),
        roadArea: roadArea.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        receiverName: receiverName.trim(),
        phone: cleanPhone,
        label,
        addressId: selectedSavedId,
        storeId: "admin",
        storeName: "Main Bakery",
        isSet: true,
      };
      setStoredDeliveryLocation(fallbackLocation);
      toast.success(`Location set: ${fallbackLocation.shortAddress}`);
      onClose();
    }
  };

  const currentStored = getStoredDeliveryLocation();
  const isLocationConfigured = Boolean(
    currentStored &&
    currentStored.isSet &&
    currentStored.lat &&
    currentStored.lng
  );
  const effectiveCanDismiss = Boolean(
    canDismiss && isLocationConfigured && !isLocationActionInProgress
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (effectiveCanDismiss) {
          onClose();
        } else {
          e.preventDefault();
        }
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, effectiveCanDismiss, onClose]);

  const handleSkip = () => {
    if (!effectiveCanDismiss) {
      toast.error("Please set your delivery location to continue browsing.");
      return;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && effectiveCanDismiss) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-stone-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5 bg-gradient-to-r from-stone-50 via-white to-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary)] shadow-xs">
              <MapPin size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-stone-900 leading-tight">
                Where should we deliver?
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Enter your exact address to see products deliverable to your doorstep
              </p>
            </div>
          </div>

          {effectiveCanDismiss ? (
            <button
              type="button"
              onClick={handleSkip}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 border border-amber-200 shadow-2xs">
              Location Required
            </span>
          )}              
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Saved Addresses (if logged in and available) */}
          {savedAddresses.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Your Saved Addresses
                </span>
                <span className="text-[11px] font-semibold text-stone-500">
                  Tap to deliver here
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedAddresses.slice(0, 4).map((addr) => {
                  const isSelected = selectedSavedId === addr.id;
                  const addrLabel = addr.label || "Home";
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectSavedAddress(addr)}
                      className={`flex items-start gap-2.5 rounded-2xl border p-2.5 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-50)] shadow-xs"
                          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/80"
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition ${
                          isSelected
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {addrLabel.toLowerCase() === "home" ? (
                          <Home size={14} />
                        ) : addrLabel.toLowerCase() === "work" ? (
                          <Briefcase size={14} />
                        ) : (
                          <Building size={14} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-stone-900 truncate">
                            {addrLabel}
                          </span>
                          {isSelected && (
                            <Check size={14} className="text-[var(--color-primary)] shrink-0" />
                          )}
                        </div>
                        <p className="line-clamp-1 text-[11px] text-stone-500">
                          {addr.formatted_address || `${addr.house_number}, ${addr.city}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Interactive Map & Search Picker */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Pin Location on Map
              </span>
              <span className="text-[11px] font-medium text-stone-500">
                Search colony or drag red pin to your gate
              </span>
            </div>

            <CustomerLocationPicker
              latitude={pickedLat}
              longitude={pickedLng}
              onLocationChange={handleLocationPicked}
              onGeocodingChange={setIsGeocoding}
            />
          </div>

          {/* Live Progress / Loading Banners */}
          {isGeocoding && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200/90 p-3 text-xs text-amber-900 shadow-xs animate-pulse">
              <Loader2 size={16} className="animate-spin text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-amber-950">Detecting Pinned Address...</p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Fetching exact street & locality for your pin so you don&apos;t pick the wrong address.
                </p>
              </div>
            </div>
          )}

          {isResolving && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-sky-50 border border-sky-200/90 p-3 text-xs text-sky-900 shadow-xs">
              <Loader2 size={16} className="animate-spin text-sky-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sky-950">Resolving Bakery Branch...</p>
                <p className="mt-0.5 text-[11px] text-sky-800">
                  Locating the closest bakery branch and checking delivery coverage.
                </p>
              </div>
            </div>
          )}

          {(isSavingAddress || isUpdatingAddress) && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/90 p-3 text-xs text-emerald-900 shadow-xs">
              <Loader2 size={16} className="animate-spin text-emerald-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-emerald-950">Saving Delivery Address...</p>
                <p className="mt-0.5 text-[11px] text-emerald-800">
                  Securely saving your address for fast one-tap ordering.
                </p>
              </div>
            </div>
          )}

          {/* 3. Address Detail Fields (Blinkit style full address inputs) */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Building size={14} className="text-[var(--color-primary)]" />
                <span>Delivery Address Details</span>
              </span>
              <span className="text-[10.5px] font-medium text-stone-500">
                {isLocationActionInProgress ? "Syncing location..." : "Auto-saved for seamless ordering"}
              </span>
            </div>

            {/* House / Flat No. & Apartment / Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Flat / House / Floor No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isLocationActionInProgress}
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="e.g. Flat 302, Floor 3, B-Block"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-[var(--color-primary)] focus:outline-hidden shadow-2xs disabled:opacity-60 disabled:bg-stone-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Apartment / Road / Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isLocationActionInProgress}
                  value={roadArea}
                  onChange={(e) => setRoadArea(e.target.value)}
                  placeholder="e.g. Shivam Enclave, Bajor Road"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-[var(--color-primary)] focus:outline-hidden shadow-2xs disabled:opacity-60 disabled:bg-stone-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Landmark & City */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  disabled={isLocationActionInProgress}
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near HDFC Bank, Opp. Green Park"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-[var(--color-primary)] focus:outline-hidden shadow-2xs disabled:opacity-60 disabled:bg-stone-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  City / Pincode
                </label>
                <input
                  type="text"
                  disabled={isLocationActionInProgress}
                  value={`${city}${pincode ? ` - ${pincode}` : ""}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parts = val.split("-");
                    setCity(parts[0]?.trim() || city);
                    if (parts[1]) setPincode(parts[1].trim());
                  }}
                  placeholder="e.g. Jaipur - 302018"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-[var(--color-primary)] focus:outline-hidden shadow-2xs disabled:opacity-60 disabled:bg-stone-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Receiver Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Receiver Name
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    disabled={isLocationActionInProgress}
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Deepak Sharma"
                    className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-8.5 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-[var(--color-primary)] focus:outline-hidden shadow-2xs disabled:opacity-60 disabled:bg-stone-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    disabled={isLocationActionInProgress}
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-9 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-[var(--color-primary)] focus:outline-hidden shadow-2xs disabled:opacity-60 disabled:bg-stone-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Address Label Chips */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-stone-700 mb-1.5">
                Save Address As:
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: "Home", icon: Home },
                  { id: "Work", icon: Briefcase },
                  { id: "Other", icon: Building },
                ].map((item) => {
                  const Icon = item.icon;
                  const isCur = label === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isLocationActionInProgress}
                      onClick={() => setLabel(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isCur
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary)] shadow-2xs"
                          : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      <Icon size={13} />
                      <span>{item.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-100 bg-stone-50/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {effectiveCanDismiss ? (
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer"
            >
              Skip for now (Browse all)
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200/60">
              <MapPin size={14} className="text-amber-600 shrink-0" />
              <span>Please set your delivery location to start ordering</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmLocation}
            disabled={isLocationActionInProgress || pickedLat == null || pickedLng == null}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGeocoding ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Reading Address...</span>
              </>
            ) : isResolving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Checking Branch & Zone...</span>
              </>
            ) : isSavingAddress || isUpdatingAddress ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Address...</span>
              </>
            ) : (
              <>
                <span>Confirm & Set Location</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
