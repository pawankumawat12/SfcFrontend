"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  X,
  MapPin,
  Home,
  Briefcase,
  Building,
  User,
  Phone,
  Check,
  LoaderCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSelector, useDispatch } from "react-redux";
import {
  Address,
  CreateAddressPayload,
  useCreateAddressMutation,
  useUpdateAddressMutation,
} from "@/redux/services/addressApi";
import { cartApi } from "@/redux/services/cartApi";
import {
  getStoredDeliveryLocation,
  setStoredDeliveryLocation,
  DeliveryLocation,
} from "@/lib/deliveryLocation";
import { isValidIndianPhone, normalizeIndianPhone, sanitizePhoneInput } from "@/lib/phone";
import { AddressAutoFillDetails } from "@/components/CustomerLocationPicker";

const CustomerLocationPicker = dynamic(
  () => import("@/components/CustomerLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] w-full rounded-2xl bg-stone-100 flex items-center justify-center text-xs text-stone-400">
        Loading satellite map...
      </div>
    ),
  }
);

interface AddressModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: Address | null;
  defaultUserName?: string;
  defaultUserPhone?: string;
  onSuccess?: (address: Address) => void;
}

export default function AddressModal({
  open,
  onClose,
  initialData,
  defaultUserName = "",
  defaultUserPhone = "",
  onSuccess,
}: AddressModalProps) {
  const dispatch = useDispatch();
  const [createAddress, { isLoading: isCreating }] = useCreateAddressMutation();
  const [updateAddress, { isLoading: isUpdating }] = useUpdateAddressMutation();
  const isSaving = isCreating || isUpdating;
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  const authUser = useSelector((state: any) => state.auth?.user);
  const [label, setLabel] = useState<string>("Home");
  const [customLabel, setCustomLabel] = useState<string>("");
  const [receiverName, setReceiverName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [houseNumber, setHouseNumber] = useState<string>("");
  const [formattedAddress, setFormattedAddress] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [city, setCity] = useState<string>("Jaipur");
  const [state, setState] = useState<string>("Rajasthan");
  const [pincode, setPincode] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      if (initialData) {
        // Edit mode
        const isStandard = ["Home", "Work"].includes(initialData.label);
        setLabel(isStandard ? initialData.label : "Other");
        setCustomLabel(isStandard ? "" : initialData.label === "Other" ? "" : initialData.label);
        setReceiverName(initialData.receiver_name || "");
        setPhoneNumber(initialData.phone_number || "");
        setHouseNumber(initialData.house_number || "");
        setFormattedAddress(initialData.formatted_address || "");
        setLandmark(initialData.landmark || "");
        setCity(initialData.city || "Jaipur");
        setState(initialData.state || "Rajasthan");
        setPincode(initialData.pincode || "");
        setIsDefault(Boolean(initialData.is_default));
        const initLat = initialData.latitude ? Number(initialData.latitude) : null;
        const initLng = initialData.longitude ? Number(initialData.longitude) : null;
        setLatitude(initLat);
        setLongitude(initLng);
      } else {
        // Add mode
        setLabel("Home");
        setCustomLabel("");
        const initialName = defaultUserName || authUser?.name || authUser?.user_name || "";
        const initialPhone = defaultUserPhone || authUser?.phone || authUser?.phone_number || "";
        setReceiverName(initialName);
        setPhoneNumber(initialPhone);
        setHouseNumber("");
        setFormattedAddress("");
        setLandmark("");
        setCity("Jaipur");
        setState("Rajasthan");
        setPincode("");
        setIsDefault(false);
        setLatitude(null);
        setLongitude(null);
      }
    }
  }, [open, initialData, defaultUserName, defaultUserPhone, authUser]);

  const handleMapLocationChange = (
    lat: number,
    lng: number,
    details?: AddressAutoFillDetails
  ) => {
    setLatitude(lat);
    setLongitude(lng);

    if (details) {
      if (details.city) setCity(details.city);
      if (details.state) setState(details.state);
      if (details.pincode) setPincode(details.pincode);
      if (details.formattedAddress) {
        setFormattedAddress(details.formattedAddress);
      }
      if (details.landmark) {
        setLandmark((prev) => prev.trim() || details.landmark || "");
      }
      if (details.houseNumber) {
        setHouseNumber((prev) => prev.trim() || details.houseNumber || "");
      }
    }

    // Auto-fill receiver contact details if still empty
    setReceiverName((prev) => prev.trim() || authUser?.name || authUser?.user_name || "");
    setPhoneNumber((prev) => prev.trim() || authUser?.phone || authUser?.phone_number || "");
  };

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isGeocoding) {
      toast("Please wait while your pinpoint address is detected.", { icon: "📍" });
      return;
    }

    if (!houseNumber.trim()) {
      toast.error("Please enter house / flat / block number");
      return;
    }
    if (!formattedAddress.trim()) {
      toast.error("Please enter apartment, road or area name");
      return;
    }
    if (!receiverName.trim()) {
      toast.error("Please enter receiver's name");
      return;
    }
    const cleanPhone = normalizeIndianPhone(phoneNumber);
    if (!cleanPhone) {
      toast.error("Mobile number is required for delivery");
      setTimeout(() => {
        phoneInputRef.current?.focus();
        phoneInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    if (!isValidIndianPhone(cleanPhone)) {
      toast.error("Please enter a valid 10-digit Indian mobile number");
      setTimeout(() => {
        phoneInputRef.current?.focus();
        phoneInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    const finalLabel =
      label === "Other" && customLabel.trim() ? customLabel.trim() : label;

    const payload: CreateAddressPayload = {
      label: finalLabel,
      receiver_name: receiverName.trim(),
      phone_number: cleanPhone,
      house_number: houseNumber.trim(),
      formatted_address: formattedAddress.trim(),
      landmark: landmark.trim() || undefined,
      city: city.trim() || "Jaipur",
      state: state.trim() || "Rajasthan",
      pincode: pincode.trim() || "302001",
      latitude: latitude != null ? Number(latitude) : undefined,
      longitude: longitude != null ? Number(longitude) : undefined,
      is_default: isDefault,
    };

    try {
      if (initialData?.id) {
        const res = await updateAddress({
          id: initialData.id,
          data: payload,
        }).unwrap();
        toast.success(res?.message || "Address updated successfully!");
        if (res?.data) {
          const updatedAddr = res.data;
          const lat = updatedAddr.latitude != null ? Number(updatedAddr.latitude) : (payload.latitude != null ? Number(payload.latitude) : null);
          const lng = updatedAddr.longitude != null ? Number(updatedAddr.longitude) : (payload.longitude != null ? Number(payload.longitude) : null);
          if (lat != null && lng != null) {
            const shortAddr = updatedAddr.house_number
              ? `${updatedAddr.house_number}, ${updatedAddr.city || updatedAddr.formatted_address || ""}`
              : (updatedAddr.formatted_address || updatedAddr.city || "Delivery Address");

            const currentStored = getStoredDeliveryLocation();
            const updatedLoc: DeliveryLocation = {
              lat,
              lng,
              address: updatedAddr.formatted_address || `${updatedAddr.house_number}, ${updatedAddr.city}`,
              shortAddress: shortAddr,
              houseNumber: updatedAddr.house_number || "",
              roadArea: updatedAddr.formatted_address || "",
              landmark: updatedAddr.landmark || "",
              city: updatedAddr.city || "Jaipur",
              state: updatedAddr.state || "Rajasthan",
              pincode: updatedAddr.pincode || "",
              receiverName: updatedAddr.receiver_name || authUser?.name || "",
              phone: updatedAddr.phone_number || authUser?.phone || "",
              label: updatedAddr.label || "Home",
              addressId: updatedAddr.id,
              storeId: currentStored?.storeId ?? null,
              storeName: currentStored?.storeName || "Main Bakery",
              isSet: true,
            };
            setStoredDeliveryLocation(updatedLoc);
          }
          dispatch(cartApi.util.invalidateTags(["Cart"]));

          if (onSuccess) {
            onSuccess(updatedAddr);
          }
        }
      } else {
        const res = await createAddress(payload).unwrap();
        toast.success(res?.message || "Address saved successfully!");
        if (res?.data) {
          const createdAddr = res.data;
          const lat = createdAddr.latitude != null ? Number(createdAddr.latitude) : (payload.latitude != null ? Number(payload.latitude) : null);
          const lng = createdAddr.longitude != null ? Number(createdAddr.longitude) : (payload.longitude != null ? Number(payload.longitude) : null);
          if (lat != null && lng != null) {
            const shortAddr = createdAddr.house_number
              ? `${createdAddr.house_number}, ${createdAddr.city || createdAddr.formatted_address || ""}`
              : (createdAddr.formatted_address || createdAddr.city || "Delivery Address");

            const currentStored = getStoredDeliveryLocation();
            const newLoc: DeliveryLocation = {
              lat,
              lng,
              address: createdAddr.formatted_address || `${createdAddr.house_number}, ${createdAddr.city}`,
              shortAddress: shortAddr,
              houseNumber: createdAddr.house_number || "",
              roadArea: createdAddr.formatted_address || "",
              landmark: createdAddr.landmark || "",
              city: createdAddr.city || "Jaipur",
              state: createdAddr.state || "Rajasthan",
              pincode: createdAddr.pincode || "",
              receiverName: createdAddr.receiver_name || authUser?.name || "",
              phone: createdAddr.phone_number || authUser?.phone || "",
              label: createdAddr.label || "Home",
              addressId: createdAddr.id,
              storeId: currentStored?.storeId ?? null,
              storeName: currentStored?.storeName || "Main Bakery",
              isSet: true,
            };
            setStoredDeliveryLocation(newLoc);
          }
          dispatch(cartApi.util.invalidateTags(["Cart"]));

          if (onSuccess) {
            onSuccess(createdAddr);
          }
        }
      }
      onClose();
    } catch (err: any) {
      const errorMsg =
        err?.data?.message ||
        (err?.data?.errors && Object.values(err.data.errors)[0]) ||
        "Failed to save address. Please try again.";
      toast.error(typeof errorMsg === "string" ? errorMsg : "Error saving address");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-2xl transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary)]">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--color-text-primary)] sm:text-lg">
                {initialData ? "Edit Address" : "Enter Complete Address"}
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Pin your location on map and fill doorstep details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* SWIGGY-STYLE MODAL FORM BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1. SATELLITE/ROAD MAP LOCATION PICKER */}
          <CustomerLocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleMapLocationChange}
            onGeocodingChange={setIsGeocoding}
          />

          {isGeocoding && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200/90 p-3 text-xs text-amber-900 shadow-xs animate-pulse">
              <LoaderCircle size={16} className="animate-spin text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-amber-950">Detecting Pinned Address...</p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Reading street & locality for your pin so the correct address is saved.
                </p>
              </div>
            </div>
          )}

          {/* 2. HOUSE / FLAT / BLOCK NO. (Required) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--color-text-primary)]">
              House / Flat / Block No. *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Flat 302, Building A / House 42"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs font-medium text-stone-800 placeholder-stone-400 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
            />
          </div>

          {/* 3. APARTMENT / ROAD / AREA (Required - Auto-filled from Map Pin) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--color-text-primary)]">
              Apartment / Road / Area *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sector 5, Malviya Nagar, Tonk Road"
              value={formattedAddress}
              onChange={(e) => setFormattedAddress(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs font-medium text-stone-800 placeholder-stone-400 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
            />
          </div>

          {/* 4. DIRECTIONS TO REACH / LANDMARK (Optional) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--color-text-primary)]">
              Directions to reach / Landmark <span className="text-[10.5px] font-normal text-stone-400">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Opposite City Hospital, 2nd green gate"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 text-xs font-medium text-stone-800 placeholder-stone-400 outline-none transition focus:border-[var(--color-primary)] focus:bg-white"
            />
          </div>

          {/* 5. CITY & PINCODE (Auto-filled from Pin, compact 1-line) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-stone-500">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Jaipur"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2 text-xs font-medium text-stone-700 outline-none focus:border-[var(--color-primary)] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-stone-500">
                Pincode
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                placeholder="302001"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2 text-xs font-medium text-stone-700 outline-none focus:border-[var(--color-primary)] focus:bg-white"
              />
            </div>
          </div>

          {/* 6. SAVE AS (Home / Work / Other) */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--color-text-primary)]">
              Save as *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "Home", label: "Home", icon: Home },
                { id: "Work", label: "Work", icon: Briefcase },
                { id: "Other", label: "Other", icon: Building },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = label === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLabel(item.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary)] shadow-2xs"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {label === "Other" && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="e.g. Friend's place, Gym, Farmhouse"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2 text-xs font-medium text-stone-800 outline-none focus:border-[var(--color-primary)] focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* 7. RECEIVER DETAILS */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Receiver's Contact Details
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-stone-600">
                  Receiver Name *
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder="Name"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-8 pr-3 text-xs font-medium text-stone-800 outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-stone-600">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(sanitizePhoneInput(e.target.value))}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-8 pr-3 text-xs font-medium text-stone-800 outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 8. DEFAULT ADDRESS TOGGLE */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-stone-700">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded text-[var(--color-primary)] accent-[var(--color-primary)]"
            />
            <span className="font-semibold">Set as default delivery address</span>
          </label>

          {/* 9. SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || isGeocoding}
              className="
                w-full
                flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[var(--color-primary)]
                py-3.5
                text-sm
                font-black
                text-white
                shadow-lg
                shadow-[var(--color-primary)]/25
                transition-all
                hover:opacity-95
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {isSaving ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  <span>Saving Address...</span>
                </>
              ) : isGeocoding ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  <span>Detecting Pinned Address...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>{initialData ? "Save & Update Address" : "Save Address & Proceed"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
