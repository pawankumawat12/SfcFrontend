"use client";


declare global {
  interface Window {
    Razorpay: any;
  }
}



import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  LoaderCircle,
  LogIn,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  Utensils,
  AlertTriangle,
  AlertCircle,
  Package,
  ShieldCheck,
  Leaf,
  Zap,
  Heart,
  MapPin,
  Home,
  Briefcase,
  Building,
  CheckCircle2,
  X,
  Phone,
  User,
  Banknote,
  Tag,
  Percent,
  Gift,
  ChevronDown,
  ChevronUp,
  Pencil,
  CreditCard,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import SkeletonLoader from "./SkeletonLoader";
import { isValidIndianPhone, normalizeIndianPhone } from "../lib/phone";

import {
  cartApi,
  useGetCartQuery,
  useGetGuestCartPreviewMutation,
  useMergeCartMutation,
  useUpdateCartItemMutation,
  useDeleteCartItemMutation,
  useClearCartMutation,
  CartItem,
  CartSummary,
} from "../redux/services/cartApi";
import {
  getGuestCart,
  updateGuestCartItemQty,
  removeGuestCartItem,
  clearGuestCart,
  subscribeGuestCart,
  GuestCartItem,
} from "../lib/guestCart";
import { useCreateOrderMutation, useVerifyPaymentMutation } from "../redux/services/orderApi";
import {
  useGetAddressesQuery,
  Address,
} from "../redux/services/addressApi";
import {
  useGetOffersQuery,
  useValidateOfferMutation,
  OfferItem,
} from "../redux/services/offerApi";
import { useGetStoreStatusQuery } from "../redux/services/settingsApi";
import { useLazyResolveStoreByLocationQuery } from "../redux/services/branchStoreApi";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import AddressModal from "./AddressModal";
import DeleteAddressDialog from "./DeleteAddressDialog";
import { loadRazorpayScript } from "../lib/razorpay";
import { useThrottledCallback } from "../utils/throttle";
import {
  getStoredDeliveryLocation,
  setStoredDeliveryLocation,
  subscribeDeliveryLocation,
  syncGuestDeliveryLocationToAccount,
  DeliveryLocation,
} from "../lib/deliveryLocation";

const API_ORIGIN = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  process.env.VITE_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");

function formatRupee(v: number) {
  const num = Math.round(Number(v || 0));
  return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function CartClient() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(
    (state: { auth: { user: any | null } }) => state.auth.user
  );

  const [authOpen, setAuthOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Address State
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [activeDeliveryLoc, setActiveDeliveryLoc] = useState<DeliveryLocation | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("Online Payment");
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  useEffect(() => {
    setActiveDeliveryLoc(getStoredDeliveryLocation());
    const unsub = subscribeDeliveryLocation((loc) => {
      setActiveDeliveryLoc(loc);
    });
    return unsub;
  }, []);

  // Dynamic Offers & Promo Code State
  const [appliedOfferCode, setAppliedOfferCode] = useState<string>("");
  const [couponInput, setCouponInput] = useState<string>("");
  const [showCoupons, setShowCoupons] = useState<boolean>(false);
  const [orderNotes, setOrderNotes] = useState<string>("");

  // Clear Cart Confirmation Modal State
  const [clearCartModalOpen, setClearCartModalOpen] = useState<boolean>(false);

  const { data: availableOffers = [] } = useGetOffersQuery();
  const [validateOffer, { isLoading: isValidatingOffer }] = useValidateOfferMutation();
  const [triggerResolveStore] = useLazyResolveStoreByLocationQuery();

  // Guest Cart State
  const [guestCartItems, setGuestCartItems] = useState<GuestCartItem[]>([]);
  const [guestPreviewResponse, setGuestPreviewResponse] = useState<any>(null);
  const [getGuestCartPreview, { isLoading: isGuestPreviewLoading }] =
    useGetGuestCartPreviewMutation();
  const [mergeCart] = useMergeCartMutation();
  
  useEffect(() => {
    setGuestCartItems(getGuestCart());
    const unsubscribe = subscribeGuestCart((newItems) => {
      setGuestCartItems(newItems);
    });
    return unsubscribe;
  }, []);
  
  // Fetch guest cart preview when user is guest and guest items or offerCode change
  useEffect(() => {
    if (user) return;
    if (guestCartItems.length === 0) {
      setGuestPreviewResponse(null);
      return;
    }
    
    let isMounted = true;
    getGuestCartPreview({
      items: guestCartItems,
      offerCode: appliedOfferCode || undefined,
      lat: activeDeliveryLoc?.lat != null ? Number(activeDeliveryLoc.lat) : undefined,
      lng: activeDeliveryLoc?.lng != null ? Number(activeDeliveryLoc.lng) : undefined,
      paymentMethod,
    })
      .unwrap()
      .then((res) => {
        if (isMounted) setGuestPreviewResponse(res);
      })
      .catch((err) => {
        console.error("Guest cart preview failed:", err);
      });
      
      return () => {
        isMounted = false;
      };
    }, [user, guestCartItems, appliedOfferCode, activeDeliveryLoc?.lat, activeDeliveryLoc?.lng, paymentMethod, getGuestCartPreview]);
    
    // Safeguard: If user logs in and guest cart still has items, auto-merge!
    useEffect(() => {
      if (!user) return;
      const pendingGuestItems = getGuestCart();
      if (pendingGuestItems.length > 0) {
        mergeCart({ items: pendingGuestItems })
        .unwrap()
        .then((res) => {
          clearGuestCart();
          const report = res?.data?.mergeReport;
          if (report?.adjustedItems?.length) {
            toast.success(
              `Cart synced! Some quantities were adjusted due to stock.`,
              { duration: 4500 }
            );
          } else {
            toast.success("Cart synced to your account!");
          }
        })
        .catch((err) => {
          console.error("Cart merge safeguard error:", err);
        });
      }
    }, [user, mergeCart]);

    // Safeguard: If user is logged in with an active guest delivery location without addressId, sync it to their account
    useEffect(() => {
      if (user && activeDeliveryLoc?.isSet && !activeDeliveryLoc?.addressId && activeDeliveryLoc?.lat && activeDeliveryLoc?.lng) {
        syncGuestDeliveryLocationToAccount(dispatch, user);
      }
    }, [user, activeDeliveryLoc?.isSet, activeDeliveryLoc?.addressId, activeDeliveryLoc?.lat, activeDeliveryLoc?.lng, dispatch]);
    
  const {
    data: cartResponse,
    isLoading: isCartQueryLoading,
    isFetching,
    refetch: refetchCart,
  } = useGetCartQuery(
    {
      addressId: selectedAddressId || undefined,
      offerCode: appliedOfferCode || undefined,
      paymentMethod,
    },
    {
      skip: !user,
    }
  );

  const isLoading = user ? isCartQueryLoading : (isGuestPreviewLoading && guestCartItems.length > 0 && !guestPreviewResponse);
  
  const {
    data: addressResponse,
    isLoading: isAddressesLoading,
    refetch: refetchAddresses,
  } = useGetAddressesQuery(
    undefined,
    { skip: !user }
  );
  const addresses: Address[] = addressResponse?.data || [];
  
  // 1. Initial mount auto-select: prioritize starting delivery location
  useEffect(() => {
    if (addresses.length > 0) {
      if (!selectedAddressId || !addresses.some((a) => a.id === selectedAddressId)) {
        const storedLoc = getStoredDeliveryLocation();
        let matchedAddr: Address | undefined;

        if (storedLoc?.addressId) {
          matchedAddr = addresses.find((a) => Number(a.id) === Number(storedLoc.addressId));
        }

        if (!matchedAddr && storedLoc?.lat && storedLoc?.lng) {
          matchedAddr = addresses.find((a) => {
            const aLat = Number(a.latitude);
            const aLng = Number(a.longitude);
            return (
              !isNaN(aLat) &&
              !isNaN(aLng) &&
              Math.abs(aLat - storedLoc.lat) < 0.003 &&
              Math.abs(aLng - storedLoc.lng) < 0.003
            );
          });
        }

        if (!matchedAddr && storedLoc?.houseNumber) {
          const sHouse = storedLoc.houseNumber.toLowerCase().trim();
          matchedAddr = addresses.find((a) => (a.house_number || "").toLowerCase().trim() === sHouse);
        }

        const defaultAddr = addresses.find((a) => a.is_default);
        setSelectedAddressId(matchedAddr ? matchedAddr.id : defaultAddr ? defaultAddr.id : addresses[0].id);
      }
    } else {
      setSelectedAddressId(null);
    }
  }, [addresses, selectedAddressId]);

  // 2. Live location change listener: When user changes location in modal, update selectedAddressId and recalculate cart immediately without refresh!
  useEffect(() => {
    const handleLiveLocationChange = async (e: Event) => {
      const loc = (e as CustomEvent).detail as DeliveryLocation | null;
      setActiveDeliveryLoc(loc);

      if (!user) return;

      try {
        const res = await refetchAddresses();
        const freshAddresses = (res?.data as any)?.data || [];

        if (loc) {
          let matched: Address | undefined;
          if (loc.addressId) {
            matched = freshAddresses.find((a: Address) => Number(a.id) === Number(loc.addressId));
          }
          if (!matched && loc.lat && loc.lng) {
            matched = freshAddresses.find((a: Address) => {
              const aLat = Number(a.latitude);
              const aLng = Number(a.longitude);
              return (
                !isNaN(aLat) &&
                !isNaN(aLng) &&
                Math.abs(aLat - loc.lat) < 0.003 &&
                Math.abs(aLng - loc.lng) < 0.003
              );
            });
          }
          if (!matched && loc.houseNumber) {
            const sHouse = loc.houseNumber.toLowerCase().trim();
            matched = freshAddresses.find(
              (a: Address) => (a.house_number || "").toLowerCase().trim() === sHouse
            );
          }

          if (matched) {
            setSelectedAddressId(matched.id);
          } else if (loc.addressId) {
            setSelectedAddressId(Number(loc.addressId));
          } else if (freshAddresses.length > 0) {
            setSelectedAddressId(freshAddresses[0].id);
          }
        }

        // Recalculate cart distances, delivery fee, and out-of-range flag immediately
        refetchCart();
      } catch (err) {
        console.warn("Could not refetch cart after location change:", err);
      }
    };

    window.addEventListener("sfc_delivery_location_changed", handleLiveLocationChange);
    return () => {
      window.removeEventListener("sfc_delivery_location_changed", handleLiveLocationChange);
    };
  }, [user, refetchAddresses, refetchCart]);

  const handleSelectCartAddress = async (addr: Address) => {
    setSelectedAddressId(addr.id);

    const lat = addr.latitude ? Number(addr.latitude) : null;
    const lng = addr.longitude ? Number(addr.longitude) : null;
    if (lat != null && lng != null) {
      let resolvedStoreId: number | "admin" = "admin";
      let resolvedStoreName: string = "Main Bakery";
      let canDeliver = true;
      let isOutOfDeliveryZone = false;
      let distanceKm: number | null = null;
      let deliveryWarning: string | null = null;
      let maxDeliveryRadius = 10;

      try {
        const storeRes = await triggerResolveStore({ lat, lng }).unwrap();
        const store = storeRes?.store;
        const isBranch = storeRes?.storeType === "branch" && store?.id;
        resolvedStoreId = isBranch ? Number(store.id) : "admin";
        resolvedStoreName = store?.name || "Main Bakery";
        isOutOfDeliveryZone = Boolean(
          storeRes?.can_deliver === false || (storeRes as any)?.outOfDeliveryZone
        );
        canDeliver = !isOutOfDeliveryZone;
        distanceKm = storeRes?.distanceKm != null ? Number(storeRes.distanceKm) : null;
        deliveryWarning = isOutOfDeliveryZone
          ? (storeRes?.message || "Delivery is available in our covered service areas.")
          : null;
        maxDeliveryRadius = (storeRes as any)?.max_delivery_distance || 10;
      } catch (resolveErr) {
        console.warn("Could not resolve store branch for address:", resolveErr);
      }

      const shortAddr = addr.house_number
        ? `${addr.house_number}, ${addr.city || addr.formatted_address || ""}`
        : (addr.formatted_address || addr.city || "Delivery Address");

      const updatedLoc: DeliveryLocation = {
        lat,
        lng,
        address: addr.formatted_address || `${addr.house_number}, ${addr.city}`,
        shortAddress: shortAddr,
        houseNumber: addr.house_number || "",
        roadArea: addr.formatted_address || "",
        landmark: addr.landmark || "",
        city: addr.city || "Jaipur",
        state: addr.state || "Rajasthan",
        pincode: addr.pincode || "",
        receiverName: addr.receiver_name || user?.name || "",
        phone: addr.phone_number || user?.phone || "",
        label: addr.label || "Home",
        addressId: addr.id,
        storeId: resolvedStoreId,
        storeName: resolvedStoreName,
        isSet: true,
        distanceKm,
        canDeliver,
        outOfDeliveryZone: isOutOfDeliveryZone,
        deliveryWarning,
        maxDeliveryRadius,
      };
      setStoredDeliveryLocation(updatedLoc);
    }
  };
  
  
  
  
  // Preload Razorpay script on mount
  useEffect(() => {
    loadRazorpayScript().catch((err) => {
      console.warn("Failed to preload Razorpay script:", err);
    });
  }, []);
  
  
  
  
  
  
  const [updateCartItem] = useUpdateCartItemMutation();
  const [deleteCartItem] = useDeleteCartItemMutation();
  const [clearCart, { isLoading: isClearing }] = useClearCartMutation();
  const [createOrder, { isLoading: isPlacingOrder }] = useCreateOrderMutation();
  
  const [verifyPayment, { isLoading: isVerifyingPayment }] =
  useVerifyPaymentMutation();
  
  const { data: storeStatusData } = useGetStoreStatusQuery();
  const isStoreClosed = storeStatusData?.data?.is_open === false;
  const storeClosedMessage =
    storeStatusData?.data?.closed_message ||
    "Store is currently closed. We are not accepting new orders at this moment.";


  const items: CartItem[] = user
    ? (cartResponse?.data?.items || [])
    : (guestPreviewResponse?.data?.items || []);
  const defaultSummary: CartSummary = {
    totalItems: 0,
    itemTypesCount: 0,
    subtotal: 0,
    discountPercent: 0,
    discount: 0,
    discountedSubtotal: 0,
    gstPercent: 0,
    taxInclusive: false,
    taxAmount: 0,
    taxAddedToTotal: 0,
    taxLabel: "",
    deliveryChargeType: "fixed",
    deliveryChargeValue: 0,
    deliveryFee: 0,
    isFreeDelivery: true,
    freeDeliveryThreshold: 0,
    freeDeliverySavings: 0,
    freeDeliveryShortfall: 0,
    distanceKm: null,
    maxDeliveryDistance: 0,
    isOutOfRange: false,
    packagingFee: 0,
    platformFee: 0,
    codFee: 0,
    isCod: true,
    minimumOrderAmount: 0,
    isBelowMinimumOrder: false,
    minimumOrderShortfall: 0,
    grandTotal: 0,
    hasOutOfStockItems: false,
    outOfStockCount: 0,
    hasUndeliverableItems: false,
    undeliverableCount: 0,
  };
  const rawSummary: CartSummary = user
    ? (cartResponse?.data?.summary || defaultSummary)
    : (guestPreviewResponse?.data?.summary || defaultSummary);

  const isCodSelected = Boolean(
    paymentMethod &&
      (paymentMethod.toLowerCase().includes("cash") ||
        paymentMethod.toLowerCase().includes("cod"))
  );

  const summary: CartSummary = useMemo(() => {
    // If backend already matches payment method, use raw summary
    const backendCodFee = Number(rawSummary.codFee || 0);
    const backendGrandTotal = Number(rawSummary.grandTotal || 0);

    if (isCodSelected) {
      return rawSummary;
    }

    // If Online Payment is selected, COD fee is strictly 0 and grandTotal adjusts if backend had included COD fee
    if (backendCodFee > 0) {
      return {
        ...rawSummary,
        codFee: 0,
        isCod: false,
        grandTotal: Math.max(0, backendGrandTotal - backendCodFee),
      };
    }

    return {
      ...rawSummary,
      codFee: 0,
      isCod: false,
    };
  }, [rawSummary, isCodSelected]);

  const getItemDeliveryStatus = (
    it: any
  ): { cannotDeliver: boolean; reason: string } => {
    if (it.cannot_deliver) {
      return {
        cannotDeliver: true,
        reason:
          it.cannot_deliver_reason ||
          "This product is not available for your selected location. Please remove it from your cart.",
      };
    }
  
    if (activeDeliveryLoc && activeDeliveryLoc.isSet) {
      const activeStoreId = activeDeliveryLoc.storeId;
  
      if (activeStoreId === "admin" || activeStoreId == null) {
        if (it.store_id != null) {
          return {
            cannotDeliver: true,
            reason:
              "This product is not available for your selected location. Please remove it from your cart.",
          };
        }
      } else {
        if (it.store_id != null && Number(it.store_id) !== Number(activeStoreId)) {
          return {
            cannotDeliver: true,
            reason:
              "This product is not available for your selected location. Please remove it from your cart.",
          };
        }
      }
    }
  
    return { cannotDeliver: false, reason: "" };
  };

  const hasUndeliverableItems = Boolean(
    summary.hasUndeliverableItems ||
    items.some((it: any) => getItemDeliveryStatus(it).cannotDeliver)
  );
  
  const handleUpdateQty = async (
    productId: number,
    currentQty: number,
    delta: number,
    maxStock: number,
    isMadeToOrder?: boolean
  ) => {
    const nextQty = currentQty + delta;
    if (nextQty < 0) return;
    
    if (!isMadeToOrder && nextQty > maxStock) {
      toast.error(`Only ${maxStock} items available in stock`);
      return;
    }
    
    if (!user) {
      const res = updateGuestCartItemQty(
        productId,
        nextQty,
        maxStock,
        isMadeToOrder
      );
      if (res.success) {
        if (nextQty === 0) {
          toast.success("Item removed from cart");
        }
      } else {
        toast.error(res.message || "Failed to update quantity");
      }
      return;
    }
    
    try {
      setUpdatingId(productId);
      await updateCartItem({ productId, quantity: nextQty }).unwrap();
      if (nextQty === 0) {
        toast.success("Item removed from cart");
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update quantity");
    } finally {
      setUpdatingId(null);
    }
  };
  
  
  const handleDeleteItem = async (productId: number) => {
    if (!user) {
      removeGuestCartItem(productId);
      toast.success("Item removed from cart");
      return;
    }
    
    try {
      setDeletingId(productId);
      await deleteCartItem(productId).unwrap();
      toast.success("Item removed from cart");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to remove item");
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmClearCart = async () => {
    if (!user) {
      clearGuestCart();
      toast.success("Cart cleared successfully");
      setClearCartModalOpen(false);
      return;
    }

    try {
      await clearCart().unwrap();
      toast.success("Cart cleared successfully");
      setClearCartModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to clear cart");
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: Address, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddress(addr);
    setAddressModalOpen(true);
  };
  
  const handleOpenDeleteAddress = (addr: Address, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingAddress(addr);
  };
  
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;
  
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a promo code");
      return;
    }
    try {
      const res = await validateOffer({
        code,
        items: items.map((it) => ({
          product_id: it.product_id,
          price: it.price,
          quantity: it.quantity,
          category_id: it.category_id,
        })),
      }).unwrap();

      setAppliedOfferCode(code);
      setCouponInput("");
      toast.success(res?.message || `Promo code "${code}" applied successfully!`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Invalid promo code or not applicable to your cart");
    }
  };
  
  const handleRemoveCoupon = () => {
    setAppliedOfferCode("");
    toast.success("Promo code removed");
  };
  const handleCheckout = async () => {
    if (isStoreClosed) {
      toast.error(storeClosedMessage);
      return;
    }
    
    if (!user) {
      setAuthOpen(true);
      return;
    }
    
    if (summary.hasOutOfStockItems) {
      toast.error(
        "Please remove or adjust out-of-stock items before checkout"
      );
      return;
    }
    
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    if (!selectedAddress) {
      toast.error(
        "Please select or add a delivery address to place your order"
      );
      setAddressModalOpen(true);
      return;
    }
    
    if (summary.isBelowMinimumOrder) {
      toast.error(
        `Minimum Item Total (Food value) must be ₹${formatRupee(
          summary.minimumOrderAmount
        )}. Please add items worth ₹${formatRupee(
          summary.minimumOrderShortfall
        )} more.`
      );
      return;
    }
    
    if (hasUndeliverableItems) {
      toast.error("Please remove items that cannot be delivered to your selected location before checkout");
      return;
    }

    if (summary.isOutOfRange) {
      toast.error(
        `Delivery is not available for this address. Distance (${summary.distanceKm || "?"} km) exceeds our maximum delivery radius of ${summary.maxDeliveryDistance || 10} km.`
      );
      return;
    }
    
    const addressParts = [
      selectedAddress.house_number,
      selectedAddress.building_name,
      selectedAddress.landmark
      ? `Near ${selectedAddress.landmark}`
      : null,
      selectedAddress.formatted_address,
      `${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`,
    ].filter(Boolean);
    
    const shippingAddress = addressParts.join(", ");
    
    const rawPhone = (selectedAddress.phone_number || user.phone || "").toString();
    const normalizedPhone = normalizeIndianPhone(rawPhone);

    if (!isValidIndianPhone(normalizedPhone)) {
      toast.error("A valid 10-digit Indian mobile number (starts with 6-9) is required for delivery.");
      return;
    }

    if (isProcessingPayment || isPlacingOrder || isVerifyingPayment) {
      return;
    }
    
    try {
      setIsProcessingPayment(true);
      
      // 0. ENSURE RAZORPAY SCRIPT IS LOADED BEFORE CREATING ORDER
      // This prevents creating duplicate unpaid orders in the database when Razorpay isn't ready.
      if (paymentMethod === "Online Payment") {
        if (typeof window !== "undefined" && !window.Razorpay) {
          toast.loading("Preparing secure payment gateway...", { id: "razorpay-init" });
        }
        const isLoaded = await loadRazorpayScript();
        toast.dismiss("razorpay-init");
        
        if (!isLoaded || !window.Razorpay) {
          toast.error(
            "Payment gateway could not be loaded. Please check your internet connection and try again."
          );
          setIsProcessingPayment(false);
          return;
        }
      }
      
      // 1. CREATE ORDER WITH IDEMPOTENCY KEY
      const idempotencyKey = `ord_${user?.id || "guest"}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const orderResponse = await createOrder({
        idempotencyKey,
        addressId: selectedAddress.id,
        
        customerName:
        selectedAddress.receiver_name ||
        user.name ||
        "Customer",
        
        customerEmail: user.email || "",
        
        customerPhone: normalizedPhone,
        
        shippingAddress,
        
        deliveryAddressJson: selectedAddress,
        
        paymentMethod,
        
        notes: orderNotes.trim(),
        
        offerCode:
          appliedOfferCode ||
          summary.appliedOffer?.code ||
          undefined,
      }).unwrap();

      const orderData = orderResponse?.data;

      if (!orderData) {
        throw new Error("Order creation failed");
      }
      
      // 2. COD
      if (paymentMethod === "Cash on Delivery") {
        setIsProcessingPayment(false);
        toast.success(
          "Order placed successfully! Fresh food is being prepared."
        );
        
        router.push("/orders");
        return;
      }
      
      // 3. ONLINE PAYMENT
      if (paymentMethod === "Online Payment") {
        if (!orderData.razorpayOrderId) {
          throw new Error(
            "Unable to initialize online payment."
          );
        }
        
        if (!orderData.razorpayKeyId) {
          throw new Error(
            "Razorpay configuration is missing."
          );
        }

        // Safety check for Razorpay SDK
        if (!window.Razorpay) {
          toast.error(
            "Payment gateway is not available. Please try again from My Orders."
          );
          setIsProcessingPayment(false);
          router.push("/orders");
          return;
        }
        
        const options = {
          key: orderData.razorpayKeyId,

          amount:
            Math.round((Number(orderData.paymentAmount) + Number.EPSILON) * 100),

          currency:
            orderData.paymentCurrency || "INR",

          name: "SFC Bakers",

          description:
            `Payment for Order #${orderData.order_number
            }`,
            
            order_id:
            orderData.razorpayOrderId,
            
            prefill: {
              name:
              orderData.customer_name ||
              selectedAddress.receiver_name ||
              user.name ||
              "",
              
              email:
              orderData.customer_email ||
              user.email ||
              "",
              
              contact:
              orderData.customer_phone ||
              selectedAddress.phone_number ||
              user.phone ||
              "",
            },
            
            notes: {
              order_number:
              orderData.order_number,
            },

          theme: {
            color: "#4f7d16",
          },

          handler: async function (
            response: any
          ) {
            try {
              toast.loading(
                "Verifying payment...",
                {
                  id: "payment-verification",
                }
              );
              
              // 4. VERIFY PAYMENT WITH BACKEND
              await verifyPayment({
                orderId: orderData.id,
                
                razorpay_order_id:
                response.razorpay_order_id,
                
                razorpay_payment_id:
                response.razorpay_payment_id,
                
                razorpay_signature:
                response.razorpay_signature,
              }).unwrap();
              
              toast.success(
                "Payment successful! Your order has been placed.",
                {
                  id: "payment-verification",
                }
              );
              
              setIsProcessingPayment(false);
              router.push("/orders");
            } catch (error: any) {
              setIsProcessingPayment(false);
              console.error(
                "Payment verification error:",
                error
              );
              
              toast.error(
                error?.data?.message ||
                "Payment verification failed. Please contact support.",
                {
                  id: "payment-verification",
                }
              );
              router.push("/orders");
            }
          },
          
          modal: {
            ondismiss: function () {
              setIsProcessingPayment(false);
              toast.error(
                "Payment cancelled. Your order has been placed and is pending payment. You can complete it from My Orders."
              );
              router.push("/orders");
            },
          },
        };

        const razorpay =
        new window.Razorpay(options);
        
        razorpay.on(
          "payment.failed",
          function (response: any) {
            setIsProcessingPayment(false);
            console.error(
              "Razorpay payment failed:",
              response
            );
            
            toast.error(
              response?.error?.description ||
              "Payment failed. You can retry from My Orders."
            );
            router.push("/orders");
          }
        );

        razorpay.open();
      }
    } catch (err: any) {
      setIsProcessingPayment(false);
      console.error(
        "Checkout error:",
        err
      );
      
      toast.error(
        err?.data?.message ||
        err?.message ||
        "Failed to place order. Please try again."
      );
    }
  };
  
  const throttledCheckout = useThrottledCallback(handleCheckout, 2000);
  const throttledApplyCoupon = useThrottledCallback(handleApplyCoupon, 2000);
  const throttledDeleteItem = useThrottledCallback(handleDeleteItem, 1000);
  const throttledConfirmClearCart = useThrottledCallback(handleConfirmClearCart, 1500);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] pt-24 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-2">
            <SkeletonLoader variant="text" lines={1} height={32} width={200} />
            <SkeletonLoader variant="text" lines={1} height={16} width={140} />
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <SkeletonLoader variant="list" count={3} />
            </div>
            <div className="lg:col-span-4">
              <SkeletonLoader variant="card" count={1} />
            </div>
          </div>
        </div>
      </main>
    );
  }


  if (!items.length) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] pt-24 pb-20">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4">
          <div className="w-full rounded-3xl border border-[var(--color-border)] bg-white p-8 text-center shadow-sm sm:p-12">
            <div
              className="
                mx-auto
                flex
                h-24
                w-24
                items-center
                justify-center
                rounded-full
                bg-[var(--color-primary-50)]
                text-[var(--color-primary)]
                shadow-inner
              "
            >
              <ShoppingBag size={40} />
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Your Cart
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
              Your cart is empty!
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-xs leading-6 text-[var(--color-text-secondary)] sm:text-sm">
              Looks like you haven't added anything yet. Explore our freshly prepared menu and find something delicious.
            </p>

            <Link
              href="/menu"
              className="
                mx-auto
                mt-7
                inline-flex
                h-12
                items-center
                gap-2
                rounded-2xl
                bg-[var(--color-primary)]
                px-8
                text-xs
                font-black
                text-white
                shadow-lg
                shadow-[var(--color-primary)]/25
                transition-all
                hover:-translate-y-0.5
                hover:bg-[var(--color-primary-dark)]
                active:scale-95
              "
              style={{color: "white"}}
            >
              <Utensils size={16} style={{ color: "white" }}
              />
              Explore Menu
              <ArrowRight size={15} />
            </Link>

            {!user && (
              <p className="mt-5 text-xs text-[var(--color-text-muted)]">
                Already have an account with saved items?{" "}
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="font-bold text-[var(--color-primary)] hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}

            <div className="mt-10 grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-6">
              <div className="rounded-xl bg-[var(--color-primary-50)] p-3 text-center">
                <div className="flex justify-center text-[var(--color-primary)]"><Leaf size={20} /></div>
                <p className="mt-1 text-[9px] font-black text-[var(--color-text-secondary)]">
                  Fresh
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-primary-50)] p-3 text-center">
                <div className="flex justify-center text-[var(--color-secondary)]"><Zap size={20} /></div>
                <p className="mt-1 text-[9px] font-black text-[var(--color-text-secondary)]">
                  Fast
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-primary-50)] p-3 text-center">
                <div className="flex justify-center text-rose-500"><Heart size={20} /></div>
                <p className="mt-1 text-[9px] font-black text-[var(--color-text-secondary)]">
                  Delicious
                </p>
              </div>
            </div>
          </div>
        </div>

        <LoginModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onOpenRegister={() => {
            setAuthOpen(false);
            setRegisterOpen(true);
          }}
        />
        <RegisterModal
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          onOpenLogin={() => {
            setRegisterOpen(false);
            setAuthOpen(true);
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)]">
      <section className="">
        <div className="mx-auto max-w-7xl px-4 py-6 ">
          <Link
            href="/menu"
            className="
              inline-flex
              items-center
              gap-1.5
              text-xs
              font-bold
              text-white/70
              transition
              hover:text-white
            "

          >
            <ArrowLeft size={14} />
            Back to Menu
          </Link>

        </div>
      </section>

      {/* CART CONTENT GRID */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_390px] lg:items-start">
          {/* ITEMS & ADDRESS SECTION */}
          <section>


            {/* CART ITEMS HEADER */}
            <div


              className="

            mb-4 flex items-center justify-between
                      overflow-hidden
                      rounded-2xl
                      border
                      border-[var(--color-border)]
                      bg-white
                      p-4
                      shadow-sm
                      transition-all
                      duration-200
                      hover:shadow-md">
              <div >
                <h2 className="text-base font-black text-[var(--color-text-primary)] sm:text-lg">
                  Cart Items ({items.length})
                </h2>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  Persistent authenticated cart saved in database
                </p>
              </div>

              <button
                type="button"
                onClick={() => setClearCartModalOpen(true)}
                disabled={isClearing || items.length === 0}
                className="
                  flex
                  items-center
                  gap-1.5
                  rounded-full
                  px-3.5
                  py-2
                  text-[11px]
                  font-bold
                  text-[var(--color-error)]
                  transition
                  hover:bg-red-100
                  disabled:opacity-50
                "
              >
                <Trash2 size={13} />
                <span>Clear Cart</span>
              </button>
            </div>

            {/* CART ITEMS LIST */}
            <div className="space-y-3.5">
              {items.map((it) => {
                const isItemUpdating = updatingId === it.id;
                const isItemDeleting = deletingId === it.id;
                const undeliverableInfo = getItemDeliveryStatus(it);

                return (
                  <article
                    key={it.id}
                    className={`
                      overflow-hidden
                      rounded-2xl
                      border
                      p-4
                      shadow-sm
                      transition-all
                      duration-200
                      hover:shadow-md
                      ${undeliverableInfo.cannotDeliver
                        ? "border-red-300 bg-red-50/25 ring-1 ring-red-300"
                        : "border-[var(--color-border)] bg-white"
                      }
                    `}
                  >
                    <div className="flex gap-4">
                      {/* Product Thumbnail */}
                      <Link
                        href={`/product/${it.id}`}
                        className="
                          group
                          relative
                          h-20
                          w-20
                          shrink-0
                          overflow-hidden
                          rounded-xl
                          bg-stone-100
                          sm:h-28
                          sm:w-28
                        "
                      >
                        {it.img ? (
                          <Image
                            src={it.img}
                            alt={it.name}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 80px, 112px"
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="h-full w-full bg-stone-100 flex items-center justify-center text-stone-400">
                            <span className="text-[9px]">No image</span>
                          </div>
                        )}
                        {it.isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] font-black text-white uppercase">
                            Out of Stock
                          </div>
                        )}
                      </Link>

                      {/* Product Info */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={`/product/${it.id}`}
                                className="line-clamp-1 text-sm font-black text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition sm:text-base"
                                title={it.name}
                              >
                                {it.name}
                              </Link>
                              {it.store_name && (
                                <p className="text-[10px] font-semibold text-stone-500">
                                  {it.store_name}
                                </p>
                              )}
                              <p
                                className="mt-0.5 text-[10px] font-medium text-[var(--color-text-muted)] capitalize truncate"
                                title={it.category_name}
                              >
                                {it.category_name}
                              </p>
                            </div>

                            {/* Item Price */}
                            <div className="shrink-0 text-right">
                              <p className="text-base font-black text-[var(--color-text-primary)]">
                                ₹{formatRupee(it.itemTotal)}
                              </p>
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                ₹{formatRupee(it.price)} each
                              </p>
                              {Number(it.free_quantity || 0) > 0 && (
                                <p className="text-[10px] font-black text-emerald-700 mt-0.5">
                                  +{it.free_quantity} Free Included
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Store Mismatch / Undeliverable Alert on the Cart Item */}
                          {undeliverableInfo.cannotDeliver && (
                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50/95 p-2.5 text-red-900 shadow-2xs">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
                                <div>
                                
                                  <p className="text-[11px] font-semibold text-red-700 mt-0.5 leading-snug">
                                    {undeliverableInfo.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Stock Warnings & Badges */}
                          { it.isOutOfStock ? (
                            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                              <AlertTriangle size={13} className="shrink-0" />
                              This item is currently out of stock. Please remove it to place your order.
                            </div>
                          ) : it.exceedsStock ? (
                            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                              <AlertTriangle size={13} className="shrink-0" />
                              Only {it.stock} item(s) available in stock. Please decrease quantity.
                            </div>
                          ) : it.quantity >= it.stock && it.stock > 0 ? (
                            <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)]">
                              <Check size={13} />
                              Maximum stock reached ({it.stock} items).
                            </div>
                          ):null}

                          {/* BOGO Offer Eligibility & Breakdown */}
                          {(() => {
                            const bogo = it.bogo_details;
                            const freeQty = Number(it.free_quantity || bogo?.free_quantity || 0);
                            const paidQty = Number(it.paid_quantity ?? it.quantity);
                            const totalQty = Number(it.total_quantity ?? (paidQty + freeQty));

                            if (freeQty > 0) {
                              const buyQty = bogo?.buy_qty || 1;
                              const getQty = bogo?.get_qty || freeQty;
                              return (
                                <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-2.5 text-emerald-950">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                                      <Gift size={14} className="text-emerald-600 shrink-0" />
                                      <span>
                                        Buy {buyQty} Get {getQty} Free Applied: {freeQty} Free Item{freeQty > 1 ? "s" : ""} Included!
                                      </span>
                                    </div>
                                    {bogo?.offer_code && (
                                      <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[9.5px] font-black uppercase text-emerald-900 font-mono">
                                        {bogo.offer_code}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold text-emerald-900 bg-white/95 rounded-lg px-2.5 py-1 border border-emerald-200/60 shadow-2xs">
                                    <span>Paid: <strong className="text-[var(--color-primary)]">{paidQty}</strong></span>
                                    <span className="text-emerald-300">•</span>
                                    <span>Free: <strong className="text-emerald-700">+{freeQty} FREE</strong></span>
                                    <span className="text-emerald-300">•</span>
                                    <span>Total Delivered: <strong className="text-emerald-950">{totalQty}</strong></span>
                                  </div>
                                </div>
                              );
                            }

                            // If item has a BOGO deal that requires more BUY quantity to unlock
                            if (bogo && bogo.needed_to_unlock > 0) {
                              return (
                                <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                                  <Gift size={13} className="text-amber-600 shrink-0" />
                                  <span>
                                    Buy {bogo.buy_qty} Get {bogo.get_qty} Free: Add {bogo.needed_to_unlock} more to get {bogo.get_qty} FREE
                                    {bogo.offer_code ? <> with code <strong className="underline">{bogo.offer_code}</strong></> : ""}!
                                  </span>
                                </div>
                              );
                            }

                            return null;
                          })()}
                        </div>

                        {/* Controls: Stepper & Remove */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                          {/* Quantity Stepper */}
                          <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary-50)] p-1 ring-1 ring-[var(--color-primary)]/10">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              disabled={isItemUpdating || isItemDeleting}
                              onClick={() => handleUpdateQty(it.id, it.quantity, -1, it.stock, it.isMadeToOrder)}
                              className="
                                flex
                                h-7
                                w-7
                                items-center
                                justify-center
                                rounded-full
                                bg-white
                                text-[var(--color-primary)]
                                shadow-sm
                                transition
                                hover:bg-red-50
                                hover:text-red-500
                                disabled:opacity-40
                                active:scale-90
                              "
                            >
                              {it.quantity === 1 ? (
                                <Trash2 size={12} />
                              ) : (
                                <Minus size={12} strokeWidth={3} />
                              )}
                            </button>

                            <span className="min-w-[28px] text-center text-xs font-black text-[var(--color-primary)]">
                              {isItemUpdating ? (
                                <LoaderCircle size={12} className="mx-auto animate-spin" />
                              ) : (
                                it.quantity
                              )}
                            </span>

                            <button
                              type="button"
                              aria-label="Increase quantity"
                              title={undeliverableInfo.cannotDeliver ? "This product cannot be delivered to your selected location" : (!it.isMadeToOrder && it.quantity >= it.stock ? `Only ${it.stock} items available` : "Increase quantity")}
                              disabled={isItemUpdating || isItemDeleting || undeliverableInfo.cannotDeliver || (!it.isMadeToOrder && it.quantity >= it.stock) || it.isOutOfStock}
                              onClick={() => handleUpdateQty(it.id, it.quantity, 1, it.stock, it.isMadeToOrder)}
                              className="
                                flex
                                h-7
                                w-7
                                items-center
                                justify-center
                                rounded-full
                                bg-[var(--color-primary)]
                                text-white
                                shadow-sm
                                transition
                                hover:bg-[var(--color-primary-dark)]
                                disabled:cursor-not-allowed
                                disabled:opacity-40
                                active:scale-90
                              "
                            >
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>

                          {Number(it.free_quantity || 0) > 0 && (
                            <span className="text-[11px] font-bold text-stone-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                              Total: <strong className="text-emerald-800">{it.total_quantity ?? (it.quantity + (it.free_quantity || 0))}</strong> items
                            </span>
                          )}

                          {/* Delete Item Action */}
                          <button
                            type="button"
                            disabled={isItemDeleting}
                            onClick={() => throttledDeleteItem(it.id)}
                            className="
                              flex
                              items-center
                              gap-1.5
                              rounded-xl
                              px-3
                              py-1.5
                              text-[11px]
                              font-bold
                              text-[var(--color-text-muted)]
                              transition
                              hover:bg-red-50
                              hover:text-red-600
                              disabled:opacity-50
                            "
                          >
                            <Trash2 size={14} />
                            <span>{isItemDeleting ? "Removing..." : "Remove"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* BENEFITS CARD */}
            <div className="my-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-50)] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-primary)] shadow-sm">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-[var(--color-text-primary)]">
                    Delicious & Freshly Made
                  </p>
                  <p className="mt-0.5 text-[10px] leading-5 text-[var(--color-text-secondary)]">
                    All items are made to order with authentic ingredients and packed with hygiene standards.
                  </p>
                </div>
              </div>
            </div>

            {/* //addresses */}
            <div className="mb-6 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[var(--color-text-primary)] sm:text-base">
                      Delivery Address
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {!user
                        ? "Sign in to choose or add a delivery address"
                        : addresses.length === 0
                        ? "Please add an address where you want your food delivered"
                        : `${addresses.length} saved address${addresses.length === 1 ? "" : "es"} available`}
                    </p>
                  </div>
                </div>

                {user ? (
                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-xl
                      bg-[var(--color-primary-50)]
                      px-3.5
                      py-2
                      text-xs
                      font-bold
                      text-[var(--color-primary)]
                      transition
                      hover:bg-[var(--color-primary)]
                      hover:text-white
                    "
                  >
                    <Plus size={15} />
                    <span>Add New Address</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthOpen(true)}
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-xl
                      bg-[var(--color-primary-50)]
                      px-3.5
                      py-2
                      text-xs
                      font-bold
                      text-[var(--color-primary)]
                      transition
                      hover:bg-[var(--color-primary)]
                      hover:text-white
                    "
                  >
                    <User size={15} />
                    <span>Sign In</span>
                  </button>
                )}
              </div>

              {/* ADDRESSES LIST */}
              {!user ? (
                activeDeliveryLoc && activeDeliveryLoc.isSet ? (
                  <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary-50)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]">
                          <MapPin size={13} />
                          <span>{activeDeliveryLoc.label || "Delivery Location"}</span>
                        </span>
                        {activeDeliveryLoc.storeName && (
                          <span className="text-[11px] font-medium text-stone-500">
                            Fulfilled by: <strong>{activeDeliveryLoc.storeName}</strong>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("sfc_open_location_modal"))}
                        className="text-xs font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
                      >
                        Change Address
                      </button>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-2xs">
                      <p className="text-xs font-bold text-stone-800">
                        {activeDeliveryLoc.houseNumber ? `${activeDeliveryLoc.houseNumber}, ` : ""}
                        {activeDeliveryLoc.roadArea || activeDeliveryLoc.address}
                      </p>
                      {activeDeliveryLoc.landmark && (
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Landmark: {activeDeliveryLoc.landmark}
                        </p>
                      )}
                      {(activeDeliveryLoc.city || activeDeliveryLoc.pincode) && (
                        <p className="text-[11px] text-stone-500">
                          {activeDeliveryLoc.city} {activeDeliveryLoc.pincode ? `- ${activeDeliveryLoc.pincode}` : ""}
                        </p>
                      )}
                      {(activeDeliveryLoc.receiverName || activeDeliveryLoc.phone) && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-[11px] text-stone-600">
                          {activeDeliveryLoc.receiverName && (
                            <span className="flex items-center gap-1">
                              <User size={12} className="text-stone-400" />
                              <span>{activeDeliveryLoc.receiverName}</span>
                            </span>
                          )}
                          {activeDeliveryLoc.phone && (
                            <span className="flex items-center gap-1 font-semibold text-stone-700">
                              <Phone size={12} className="text-stone-400" />
                              <span>+91 {activeDeliveryLoc.phone}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <p className="text-[11px] text-stone-500">
                        Sign in to save this address to your account & place order.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAuthOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:opacity-90 transition cursor-pointer"
                      >
                        <LogIn size={13} />
                        <span>Sign In to Checkout</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-5 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <MapPin size={22} />
                    </div>
                    <h3 className="mt-2.5 text-xs font-black text-amber-900 sm:text-sm">
                      Where should we deliver?
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-amber-800">
                      Please select your delivery address to see live availability, delivery charges, and place order.
                    </p>
                    <div className="mt-3.5 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("sfc_open_location_modal"))}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 transition cursor-pointer"
                      >
                        <MapPin size={14} />
                        <span>Set Delivery Address</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition cursor-pointer"
                      >
                        <LogIn size={14} />
                        <span>Sign In</span>
                      </button>
                    </div>
                  </div>
                )
              ) : isAddressesLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-[var(--color-text-muted)]">
                  <LoaderCircle size={16} className="mr-2 animate-spin text-[var(--color-primary)]" />
                  Loading saved addresses...
                </div>
              ) : addresses.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-5 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <MapPin size={22} />
                  </div>
                  <h3 className="mt-2.5 text-xs font-black text-amber-900 sm:text-sm">
                    Address Not Found
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-amber-800">
                    You must add a delivery address before placing your order.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--color-primary-dark)]"
                  >
                    <Plus size={14} />
                    Add Address Now
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectCartAddress(addr)}
                        className={`
                          group
                          relative
                          cursor-pointer
                          rounded-2xl
                          border-2
                          p-4
                          transition-all
                          duration-200
                          ${isSelected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-50)]/40 shadow-sm"
                            : "border-[var(--color-border)] bg-white hover:border-stone-300"
                          }
                        `}
                      >
                        {/* Header: Label & Actions & Radio */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`
                                inline-flex
                                items-center
                                gap-1
                                rounded-lg
                                px-2
                                py-0.5
                                text-[10px]
                                font-black
                                uppercase
                                tracking-wider
                                ${addr.label === "Work"
                                  ? "bg-blue-50 text-blue-700"
                                  : addr.label === "Home"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-purple-50 text-purple-700"
                                }
                              `}
                            >
                              {addr.label === "Work" ? (
                                <Briefcase size={11} />
                              ) : addr.label === "Home" ? (
                                <Home size={11} />
                              ) : (
                                <Building size={11} />
                              )}
                              {addr.label}
                            </span>
                            {addr.is_default && (
                              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-600">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditAddress(addr, e)}
                              title="Edit address"
                              aria-label="Edit address"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 opacity-80 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)] hover:opacity-100"
                            >
                              <Pencil size={12} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenDeleteAddress(addr, e)}
                              title="Delete address"
                              aria-label="Delete address"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 opacity-80 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>

                            <div
                              className={`
                                ml-1
                                flex
                                h-5
                                w-5
                                items-center
                                justify-center
                                rounded-full
                                border-2
                                transition
                                ${isSelected
                                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                  : "border-stone-300 bg-white"
                                }
                              `}
                            >
                              {isSelected && <Check size={11} strokeWidth={3.5} />}
                            </div>
                          </div>
                        </div>

                        {/* Receiver details */}
                        <div className="mt-2.5">
                          <p className="text-xs font-black text-[var(--color-text-primary)]">
                            {addr.receiver_name}
                          </p>
                          <p className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                            {addr.phone_number}
                          </p>
                        </div>

                        {/* Full address string */}
                        <p className="mt-1 text-[11px] leading-4.5 text-[var(--color-text-muted)] line-clamp-2">
                          {addr.house_number}
                          {addr.building_name ? `, ${addr.building_name}` : ""}
                          {addr.landmark ? `, Near ${addr.landmark}` : ""}
                          {`, ${addr.formatted_address || `${addr.city}, ${addr.state} - ${addr.pincode}`}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {user && selectedAddress && summary.isOutOfRange && (
                <div className="mt-4 flex items-start gap-3.5 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-red-800 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-red-900 uppercase tracking-wide">
                        Delivery Not Available At This Location
                      </h4>
                      <span className="rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-bold text-red-800">
                        {summary.distanceKm != null ? `${summary.distanceKm} km away` : "Out of range"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-red-700 leading-relaxed">
                      We cannot deliver products to this address because it is outside our maximum delivery service radius ({summary.maxDeliveryDistance || 10} km).
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-red-800">
                      👉 Please select or add an address within our delivery area to proceed.
                    </p>
                  </div>
                </div>
              )}
            </div>


          </section>

          {/* FLIPKART-STYLE PRICE DETAILS SIDEBAR */}
          <aside className="lg:sticky lg:top-24">
            {/* COUPONS & OFFERS CARD */}
            <div className="mb-4 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-sm">
              <div className="border-b border-[var(--color-border)] p-4 bg-stone-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-[var(--color-primary)]" />
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
                    Coupons & Offers
                  </span>
                </div>
                {summary.appliedOffer && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                    Saved ₹{formatRupee(summary.discount)}
                  </span>
                )}
              </div>

              <div className="p-4">
                {/* Applied Offer Banner */}
                {summary.appliedOffer ? (
                  <div className="mb-3 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
                        <Check size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-black uppercase text-emerald-900">
                           {summary.appliedOffer.code}
                        </p>
                        <p className="text-[11px] font-semibold text-emerald-700 truncate">
                          {summary.appliedOffer.title} (-₹{formatRupee(summary.discount)})
                        </p>
                      </div>
                    </div>

                    {appliedOfferCode ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-200/60 transition"
                        title="Remove coupon"
                      >
                        <X size={16} />
                      </button>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-white px-2 py-1 rounded-md shadow-xs">
                        Auto
                      </span>
                    )}
                  </div>
                ) : null}

                {/* Promo Code Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        throttledApplyCoupon();
                      }
                    }}
                    placeholder="Enter Promo Code"
                    className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-stone-50 px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)] placeholder:font-sans placeholder:tracking-normal focus:border-[var(--color-primary)] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => throttledApplyCoupon()}
                    disabled={isValidatingOffer || !couponInput.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
                  >
                    {isValidatingOffer ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>

                {/* Available Offers Quick Toggle */}
                {availableOffers && availableOffers.length > 0 && (
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                    <button
                      type="button"
                      onClick={() => setShowCoupons((prev) => !prev)}
                      className="flex w-full items-center justify-between text-[11px] font-bold text-[var(--color-primary)] hover:underline"
                    >
                      <span className="flex items-center gap-1.5">
                        <Gift size={13} />
                        View {availableOffers.length} available offers
                      </span>
                      {showCoupons ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showCoupons && (
                      <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto pr-1">
                        {availableOffers.map((off) => {
                          const isCurrentlyApplied =
                            (appliedOfferCode && appliedOfferCode === off.code) ||
                            (!appliedOfferCode && summary.appliedOffer?.code === off.code);

                          return (
                            <div
                              key={off.id}
                              className={`rounded-xl border p-2.5 text-left transition flex items-center justify-between gap-2 ${isCurrentlyApplied
                                ? "border-emerald-300 bg-emerald-50/50"
                                : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/40"
                                }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-black uppercase text-[var(--color-text-primary)]">
                                    {off.code}
                                  </span>
                                  <span className="rounded bg-[var(--color-secondary)]/10 px-1.5 py-0.5 text-[9px] font-black text-[var(--color-secondary)]">
                                    {off.type === "PERCENTAGE"
                                      ? `${off.discount_value}% OFF`
                                      : off.type === "FLAT"
                                        ? `₹${off.discount_value} OFF`
                                        : "BOGO"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">
                                  {off.title} {off.min_order_amount > 0 ? `• Min ₹${off.min_order_amount}` : ""}
                                </p>
                              </div>

                              {isCurrentlyApplied ? (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                  <Check size={12} /> Applied
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => throttledApplyCoupon(off.code)}
                                  className="text-[11px] font-bold text-[var(--color-primary)] hover:underline shrink-0"
                                >
                                  Apply
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-sm">
              {/* Header */}
              <div className="border-b border-[var(--color-border)] p-5">
                <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Price Details
                </h2>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 p-5">
                {/* Item Total */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    Item Total ({summary.paidItemsCount ?? summary.cartQuantity ?? summary.totalItems} item{(summary.paidItemsCount ?? summary.cartQuantity ?? summary.totalItems) === 1 ? "" : "s"})
                  </span>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    ₹{formatRupee(summary.subtotal)}
                  </span>
                </div>

                {/* Products Delivery Breakdown */}
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-stone-600">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-400"></span>
                      <span>Paid Items (Cart Qty)</span>
                    </span>
                    <span className="font-bold text-stone-900">
                      {summary.paidItemsCount ?? summary.cartQuantity ?? summary.totalItems}
                    </span>
                  </div>

                  {Boolean(summary.freeItemsCount && summary.freeItemsCount > 0) && (
                    <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
                      <span className="flex items-center gap-1.5">
                        <Gift size={13} className="text-emerald-600 shrink-0" />
                        <span>Promotional / Free Items</span>
                      </span>
                      <span className="font-bold text-emerald-700">
                        +{summary.freeItemsCount} FREE
                      </span>
                    </div>
                  )}

                  <div className="border-t border-stone-200 pt-2 flex items-center justify-between text-xs font-black text-stone-900">
                    <span className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                      <Package size={14} className="text-[var(--color-primary)] shrink-0" />
                      <span>Total Products to be Delivered</span>
                    </span>
                    <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">
                      {summary.totalProductsDelivered ?? summary.totalItems} item{(summary.totalProductsDelivered ?? summary.totalItems) === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                {/* Discount */}
                {summary.discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)] flex items-center gap-1.5">
                      <span>Discount</span>
                      {summary.appliedOffer ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-mono font-black text-emerald-800">
                          {summary.appliedOffer.code}
                        </span>
                      ) : summary.discountPercent > 0 ? (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                          {summary.discountPercent}% OFF
                        </span>
                      ) : null}
                    </span>
                    <span className="font-bold text-emerald-600">
                      - ₹{formatRupee(summary.discount)}
                    </span>
                  </div>
                )}

                {/* BOGO Savings */}
                {Boolean(summary.bogoSavings && summary.bogoSavings > 0) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)] flex items-center gap-1.5">
                      <span>BOGO Free Items Savings</span>
                      {summary.appliedOffer?.code && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-mono font-black text-emerald-800">
                          {summary.appliedOffer.code}
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-emerald-600">
                      ₹{formatRupee(summary.bogoSavings || 0)} Saved
                    </span>
                  </div>
                )}

                {/* Delivery Charges */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)] flex items-center gap-1">
                    <span>Delivery Charge</span>
                    {summary.distanceKm != null && (
                      <span className="text-[10px] text-stone-400 font-medium">
                        ({summary.distanceKm} km)
                      </span>
                    )}
                  </span>
                  {summary.isFreeDelivery ? (
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      {summary.freeDeliverySavings > 0 && (
                        <span className="text-[11px] text-stone-400 line-through">
                          ₹{formatRupee(summary.freeDeliverySavings)}
                        </span>
                      )}
                      <span>FREE</span>
                    </span>
                  ) : summary.deliveryFee > 0 ? (
                    <span className="font-bold text-[var(--color-text-primary)]">
                      ₹{formatRupee(summary.deliveryFee)}
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-600">FREE</span>
                  )}
                </div>

                {/* Taxes (GST) */}
                {summary.taxInclusive ? (
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>GST ({summary.gstPercent}%)</span>
                    <span className="font-semibold text-stone-600">
                      ₹{formatRupee(summary.taxAmount)} (Included)
                    </span>
                  </div>
                ) : summary.taxAddedToTotal > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Taxes & Charges (GST {summary.gstPercent}%)
                    </span>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      + ₹{formatRupee(summary.taxAddedToTotal)}
                    </span>
                  </div>
                ) : null}

                {/* Packaging Fee */}
                {summary.packagingFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Packaging Fee
                    </span>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      ₹{formatRupee(summary.packagingFee)}
                    </span>
                  </div>
                )}

                {/* Platform Fee */}
                {summary.platformFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Platform Fee
                    </span>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      ₹{formatRupee(summary.platformFee)}
                    </span>
                  </div>
                )}

                {/* COD Fee */}
                {summary.codFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Cash on Delivery Fee
                    </span>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      ₹{formatRupee(summary.codFee)}
                    </span>
                  </div>
                )}

                {/* Free Delivery Goal Prompt */}
                {!summary.isFreeDelivery && summary.freeDeliveryShortfall > 0 && (
                  <div className="rounded-xl bg-amber-50 p-2.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                    Add items worth ₹{formatRupee(summary.freeDeliveryShortfall)} more to get <b>FREE Delivery</b>!
                  </div>
                )}

                {/* Minimum Order Warning */}
                {summary.isBelowMinimumOrder && (
                  <div className="rounded-xl bg-red-50 p-2.5 text-[11px] font-bold text-red-700 border border-red-200 flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
                    <div className="space-y-0.5">
                      <span>
                        Minimum <strong>Item Total (Food value)</strong> must be ₹{formatRupee(summary.minimumOrderAmount)} (excluding taxes & delivery).
                      </span>
                      <div className="text-[10.5px] font-medium text-red-600">
                        Current Items: ₹{formatRupee(summary.subtotal)} • Please add items worth <strong>₹{formatRupee(summary.minimumOrderShortfall)} more</strong> to proceed.
                      </div>
                    </div>
                  </div>
                )}

           

                {/* Total Amount */}
                <div className="border-t border-dashed border-[var(--color-border)] pt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Total Amount
                      </p>
                      <p className="mt-1 text-2xl font-black text-[var(--color-text-primary)]">
                        ₹{formatRupee(summary.grandTotal)}
                      </p>
                    </div>
                    <span className="pb-1 text-[10px] font-bold text-[var(--color-success)]">
                      Safe Payment
                    </span>
                  </div>
                </div>

                {/* SELECTED DELIVERY ADDRESS SUMMARY IN SIDEBAR */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-stone-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[var(--color-text-primary)]">
                      <MapPin size={14} className="text-[var(--color-primary)]" />
                      <span>Deliver to</span>
                    </div>

                    {user && selectedAddress ? (
                      <button
                        type="button"
                        onClick={handleOpenAddAddress}
                        className="text-[11px] font-bold text-[var(--color-primary)] hover:underline"
                      >
                        + Add New
                      </button>
                    ) : null}
                  </div>

                  {!user ? (
                    <div className="mt-2 text-center">
                      <p className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                        Sign in to choose delivery address
                      </p>
                      <button
                        type="button"
                        onClick={() => setAuthOpen(true)}
                        className="mt-2 inline-flex items-center gap-1 rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-[var(--color-primary-dark)]"
                      >
                        <LogIn size={13} />
                        Sign In
                      </button>
                    </div>
                  ) : selectedAddress ? (
                    <div className="mt-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text-primary)]">
                          {selectedAddress.receiver_name}
                        </span>
                        <span className="rounded bg-[var(--color-primary-50)] px-1.5 py-0.5 text-[9px] font-black text-[var(--color-primary)]">
                          {selectedAddress.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                        {selectedAddress.phone_number}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                        {selectedAddress.house_number}, {selectedAddress.formatted_address || `${selectedAddress.city} - ${selectedAddress.pincode}`}
                      </p>

                      {summary.isOutOfRange && (
                        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
                          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-600" />
                          <div>
                            <p className="font-bold text-red-800">Delivery Not Available</p>
                            <p className="mt-0.5 text-[10px] text-red-600">
                              {summary.distanceKm != null ? `${summary.distanceKm} km away` : "Out of zone"} (Max radius: {summary.maxDeliveryDistance || 10} km). Please select another address.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-center">
                      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-700">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>No delivery address selected</span>
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddAddress}
                        className="mt-2 inline-flex items-center gap-1 rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-[var(--color-primary-dark)]"
                      >
                        <Plus size={13} />
                        Add Address
                      </button>
                    </div>
                  )}
                </div>



                {summary.hasOutOfStockItems && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-[11px] font-bold text-red-600">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>Please remove or adjust out-of-stock items before checkout.</span>
                  </div>
                )}


                {/* Order Note / Special Instructions */}
                <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-sm mt-5">
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3.5">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-[var(--color-primary)]" />
                      <h2 className="text-sm font-black text-[var(--color-text-primary)]">
                        Order Note / Special Instructions
                      </h2>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-500">
                      Optional
                    </span>
                  </div>

                  <div className="mt-3.5">
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      maxLength={300}
                      rows={3}
                      placeholder="e.g. Please make it less spicy, No onions, Pack separately, etc."
                      className="w-full rounded-2xl border border-gray-200 bg-stone-50/50 p-3.5 text-xs text-[var(--color-text-primary)] placeholder-gray-400 transition-all focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                      <span>Kitchen will prepare your food according to your preferences.</span>
                      <span className="font-medium text-stone-400">{orderNotes.length}/300</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-sm mt-5">
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                    <div className="flex items-center gap-2">
                      <Banknote size={18} className="text-[var(--color-primary)]" />
                      <h2 className="text-sm font-black text-[var(--color-text-primary)]">
                        Payment Method
                      </h2>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      100% Safe & Secure
                    </span>
                  </div>


                  <div>
                    {/* Cash on Delivery Card */}
                    <div

                      onClick={() => setPaymentMethod("Cash on Delivery")}
                      className={`mt-4 cursor-pointer rounded-2xl p-4 shadow-sm transition-all ${paymentMethod === "Cash on Delivery"
                        ? "border border-[var(--color-primary)] bg-[var(--color-primary-50)]/40 ring-1 ring-[var(--color-primary)]"
                        : "border border-gray-200 bg-white hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                          <Banknote size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-[var(--color-text-primary)]">
                              Cash on Delivery (COD)
                            </p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 size={12} /> Active
                            </span>
                          </div>

                          {isCodSelected && summary.codFee > 0 && (
                            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-100/70 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                              <Package size={12} className="shrink-0" />
                              <span>Includes ₹{formatRupee(summary.codFee)} Cash on Delivery fee</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Online Payment Card */}
                    <div
                      onClick={() => setPaymentMethod("Online Payment")}
                      className={`mt-4 cursor-pointer rounded-2xl p-4 shadow-sm transition-all ${paymentMethod === "Online Payment"
                        ? "border border-[var(--color-primary)] bg-[var(--color-primary-50)]/40 ring-1 ring-[var(--color-primary)]"
                        : "border border-gray-200 bg-white hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
                          <CreditCard size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-[var(--color-text-primary)]">
                              Online Payment
                            </p>

                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                              <CheckCircle2 size={12} /> Secure
                            </span>
                          </div>

                          <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
                            Pay securely using UPI, Debit/Credit Card, Net Banking or Wallets.
                          </p>

                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Store Closed Warning Banner */}
                {isStoreClosed && (
                  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-4 text-xs font-semibold text-red-700 dark:text-red-400 shadow-sm animate-in fade-in">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="font-bold">Store is Currently Closed</p>
                      <p className="mt-0.5 text-[11px] font-normal leading-relaxed text-red-600/90 dark:text-red-300">
                        {storeClosedMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  type="button"
                  disabled={
                    isStoreClosed ||
                    items.length === 0 ||
                    summary.hasOutOfStockItems ||
                    hasUndeliverableItems ||
                    summary.isOutOfRange ||
                    isProcessingPayment ||
                    (user ? (
                      summary.isBelowMinimumOrder ||
                      isPlacingOrder ||
                      isVerifyingPayment ||
                      !selectedAddress
                    ) : false)
                  }
                  onClick={throttledCheckout}
                  className="
                    flex
                    h-13
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-[var(--color-primary)]
                    px-5
                    py-3.5
                    text-xs
                    font-black
                    text-white
                    shadow-lg
                    shadow-[var(--color-primary)]/25
                    transition-all
                    hover:bg-[var(--color-primary-dark)]
                    hover:shadow-xl
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <span>
                    {isStoreClosed
                      ? "Store is Currently Closed"
                      : !user
                        ? "Sign In to Checkout"
                        : summary.isOutOfRange
                          ? "Delivery Not Available At This Address"
                          : hasUndeliverableItems
                          ? "Remove Undeliverable Items"
                          : isProcessingPayment && !isPlacingOrder && !isVerifyingPayment
                            ? "Preparing Payment..."
                            : isPlacingOrder
                              ? "Creating Order..."
                              : isVerifyingPayment
                                ? "Verifying Payment..."
                                : paymentMethod === "Online Payment"
                                  ? "Pay & Place Order"
                                  : "Place Order"}
                  </span>
                  {isPlacingOrder || isVerifyingPayment || isProcessingPayment ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>

                <p className="text-center text-[10px] text-[var(--color-text-muted)]">
                  By placing an order, you agree to our{" "}
                  <Link href="/terms" target="_blank" className="underline hover:text-[var(--color-primary)]">
                    Terms
                  </Link>
                  ,{" "}
                  <Link href="/privacy-policy" target="_blank" className="underline hover:text-[var(--color-primary)]">
                    Privacy Policy
                  </Link>{" "}
                  &{" "}
                  <Link href="/refund-policy" target="_blank" className="underline hover:text-[var(--color-primary)]">
                    Refund Policy
                  </Link>
                  .
                </p>
              </div>

              {/* Secure guarantee badge */}
              <div className="border-t border-[var(--color-border)] bg-stone-50 p-4 text-center">
                <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[var(--color-text-muted)]">
                  <ShieldCheck size={16} className="text-[var(--color-primary)]" />
                  Safe and Secure Payments • 100% Authentic Food
                </p>
              </div>
            </div>

            {/* Quick delivery cards */}
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                  <Clock3 size={15} />
                </div>
                <p className="mt-2 text-[10px] font-black text-[var(--color-text-primary)]">
                  Quick Service
                </p>
                <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">
                  Freshly cooked on order
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                  <Truck size={15} />
                </div>
                <p className="mt-2 text-[10px] font-black text-[var(--color-text-primary)]">
                  Carefully Packed
                </p>
                <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">
                  Ready to serve hot
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ADD / EDIT ADDRESS MODAL */}
      <AddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        initialData={editingAddress}
        defaultUserName={user?.name || ""}
        defaultUserPhone={user?.phone || ""}
        onSuccess={(saved) => {
          setSelectedAddressId(saved.id);
        }}
      />

      {/* DELETE ADDRESS CONFIRMATION DIALOG */}
      <DeleteAddressDialog
        open={Boolean(deletingAddress)}
        onClose={() => setDeletingAddress(null)}
        address={deletingAddress}
        onDeleted={(delId) => {
          if (selectedAddressId === delId) {
            const remaining = addresses.filter((a) => a.id !== delId);
            setSelectedAddressId(remaining.length > 0 ? remaining[0].id : null);
          }
        }}
      />

      {clearCartModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setClearCartModalOpen(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-inner">
              <Trash2 size={26} />
            </div>

            {/* Modal Heading & Description */}
            <div className="mt-4 text-center">
              <h3 className="text-base font-black text-[var(--color-text-primary)]">
                Clear your cart?
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Are you sure you want to remove all {items.length} item{items.length === 1 ? "" : "s"} from your cart? You will need to re-add them to order.
              </p>
            </div>

            {/* Modal Buttons */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setClearCartModalOpen(false)}
                disabled={isClearing}
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-stone-50 py-3 text-xs font-bold text-[var(--color-text-primary)] transition hover:bg-stone-100 active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={throttledConfirmClearCart}
                disabled={isClearing}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-xs font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <LoaderCircle size={14} className="animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Clear Cart</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onOpenRegister={() => {
          setAuthOpen(false);
          setRegisterOpen(true);
        }}
      />
      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onOpenLogin={() => {
          setRegisterOpen(false);
          setAuthOpen(true);
        }}
      />
    </main>
  );
}
