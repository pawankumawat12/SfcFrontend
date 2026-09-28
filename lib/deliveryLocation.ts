export interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
  shortAddress: string;
  houseNumber?: string;
  roadArea?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  receiverName?: string;
  phone?: string;
  label?: "Home" | "Work" | "Other" | string;
  addressId?: number | null;
  storeId: number | string | null;
  storeName: string;
  isSet: boolean;
  distanceKm?: number | null;
  canDeliver?: boolean;
  outOfDeliveryZone?: boolean;
  deliveryWarning?: string | null;
  maxDeliveryRadius?: number | null;
}

const STORAGE_KEY = "sfc_delivery_location";
const STORE_ID_KEY = "sfc_selected_store_id";

export function getStoredDeliveryLocation(): DeliveryLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredDeliveryLocation(loc: DeliveryLocation): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    if (loc.storeId != null) {
      localStorage.setItem(STORE_ID_KEY, String(loc.storeId));
    } else {
      localStorage.removeItem(STORE_ID_KEY);
    }
    window.dispatchEvent(
      new CustomEvent("sfc_delivery_location_changed", { detail: loc })
    );
    window.dispatchEvent(
      new CustomEvent("sfc_branch_status_changed", {
        detail: {
          storeId: loc.storeId,
          storeName: loc.storeName,
          isOpen: true,
          isActive: true,
        },
      })
    );
  } catch (e) {
    console.error("Failed to save delivery location:", e);
  }
}

export function clearStoredDeliveryLocation(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORE_ID_KEY);
    window.dispatchEvent(
      new CustomEvent("sfc_delivery_location_changed", { detail: null })
    );
  } catch (e) {
    console.error("Failed to clear delivery location:", e);
  }
}

export function subscribeDeliveryLocation(
  callback: (loc: DeliveryLocation | null) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent).detail as DeliveryLocation | null;
    callback(detail !== undefined ? detail : getStoredDeliveryLocation());
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === STORE_ID_KEY) {
      callback(getStoredDeliveryLocation());
    }
  };

  window.addEventListener("sfc_delivery_location_changed", handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("sfc_delivery_location_changed", handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
}

export async function syncGuestDeliveryLocationToAccount(
  dispatch: any,
  user?: any
): Promise<void> {
  if (typeof window === "undefined" || !dispatch) return;
  const guestLoc = getStoredDeliveryLocation();
  if (!guestLoc || !guestLoc.isSet || !guestLoc.lat || !guestLoc.lng) {
    return;
  }

  // If addressId is not yet saved to backend for this user
  if (!guestLoc.addressId) {
    try {
      const { addressApi } = await import("@/redux/services/addressApi");
      const { cartApi } = await import("@/redux/services/cartApi");

      // Check if user already has an address with matching coordinates
      const existingRes = await dispatch(
        addressApi.endpoints.getAddresses.initiate(undefined, { forceRefetch: true })
      ).unwrap();
      const existingAddresses = (existingRes as any)?.data || [];
      const match = existingAddresses.find((a: any) => {
        const aLat = Number(a.latitude);
        const aLng = Number(a.longitude);
        return (
          !isNaN(aLat) &&
          !isNaN(aLng) &&
          Math.abs(aLat - guestLoc.lat) < 0.003 &&
          Math.abs(aLng - guestLoc.lng) < 0.003
        );
      });

      let finalAddressId: number | null = null;
      let finalName = guestLoc.receiverName;
      let finalPhone = guestLoc.phone;

      if (match) {
        finalAddressId = match.id;
        finalName = match.receiver_name || finalName;
        finalPhone = match.phone_number || finalPhone;
      } else {
        const payload = {
          label: guestLoc.label || "Home",
          receiver_name: guestLoc.receiverName || user?.name || user?.user_name || "Customer",
          phone_number: guestLoc.phone || user?.phone || user?.phone_number || "9999999999",
          house_number: guestLoc.houseNumber || guestLoc.roadArea?.split(",")[0] || "Address Spot",
          formatted_address: guestLoc.roadArea || guestLoc.address || "Delivery Location",
          landmark: guestLoc.landmark || undefined,
          city: guestLoc.city || "Jaipur",
          state: guestLoc.state || "Rajasthan",
          pincode: guestLoc.pincode || "302001",
          latitude: guestLoc.lat,
          longitude: guestLoc.lng,
          is_default: true,
        };

        const result = await dispatch(
          addressApi.endpoints.createAddress.initiate(payload)
        ).unwrap();

        const newAddress = (result as any)?.data;
        if (newAddress && newAddress.id) {
          finalAddressId = newAddress.id;
          finalName = newAddress.receiver_name || finalName;
          finalPhone = newAddress.phone_number || finalPhone;
        }
      }

      if (finalAddressId) {
        const updatedLoc: DeliveryLocation = {
          ...guestLoc,
          addressId: finalAddressId,
          receiverName: finalName,
          phone: finalPhone,
        };
        setStoredDeliveryLocation(updatedLoc);
        dispatch(addressApi.util.invalidateTags(["Address"]));
        dispatch(cartApi.util.invalidateTags(["Cart"]));
      }
    } catch (err) {
      console.warn("Could not sync guest delivery location to user account:", err);
    }
  }
}

