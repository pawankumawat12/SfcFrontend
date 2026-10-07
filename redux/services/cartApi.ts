import { baseApi } from "./baseApi";
import { toAssetUrl } from "@/utils/backendUrl";

export interface CartItem {
  id: number;
  cart_item_id: number;
  product_id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images?: string[];
  image?: string | null;
  img: string;
  is_active: boolean;
  availability_type: "IN_STOCK" | "MADE_TO_ORDER";
  isMadeToOrder: boolean;
  store_id?: number | null;
  store_name?: string | null;
  store_is_closed?: boolean;
  stockMessage?: string | null;
  category_id: number | string;
  category_name: string;
  quantity: number;
  paid_quantity?: number;
  free_quantity?: number;
  total_quantity?: number;
  bogo_details?: any;
  itemTotal: number;
  isOutOfStock: boolean;
  exceedsStock: boolean;
  cannot_deliver?: boolean;
  cannot_deliver_reason?: string | null;
  is_deliverable?: boolean;
  added_at?: string;
  updated_at?: string;
}

export interface CartSummary {
  totalItems: number;
  totalProductsDelivered?: number;
  totalQuantity?: number;
  cartQuantity?: number;
  normalCartQuantity?: number;
  paidItemsCount?: number;
  freeItemsCount?: number;
  bogoSavings?: number;
  itemTypesCount: number;
  subtotal: number;
  discountPercent: number;
  discount: number;
  discountedSubtotal: number;

  gstPercent: number;
  taxInclusive: boolean;
  taxAmount: number;
  taxAddedToTotal: number;
  taxLabel: string;

  deliveryChargeType: string;
  deliveryChargeValue: number;
  deliveryFee: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold: number;
  freeDeliverySavings: number;
  freeDeliveryShortfall: number;

  distanceKm: number | null;
  maxDeliveryDistance: number;
  isOutOfRange: boolean;

  packagingFee: number;
  platformFee: number;
  codFee: number;
  isCod: boolean;

  minimumOrderAmount: number;
  isBelowMinimumOrder: boolean;
  minimumOrderShortfall: number;

  appliedOffer?: {
    id: number | null;
    code: string;
    title: string;
    badge?: string;
    type?: string;
    discount: number;
  } | null;
  offerEvaluation?: any;

  grandTotal: number;
  hasOutOfStockItems: boolean;
  outOfStockCount: number;
  hasUndeliverableItems?: boolean;
  undeliverableCount?: number;

  timer?: {
    calculatedAt: string;
    expiresAt: string;
    validForSeconds: number;
  };
}

export interface CartData {
  items: CartItem[];
  summary: CartSummary;
  pricing?: any;
  deliveryAddress?: any;
  mergeReport?: {
    mergedCount: number;
    adjustedItems: Array<{
      productId: number;
      name: string;
      requestedTotal: number;
      availableStock: number;
      cappedQuantity: number;
    }>;
    outOfStockItems: Array<{
      productId: number;
      name: string;
      availableStock: number;
    }>;
    skippedInactiveItems: Array<{
      productId: number;
      name: string;
    }>;
  };
}

export interface CartResponse {
  success: boolean;
  message?: string;
  data: CartData;
}

function roundCurrency(val: any): number {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

const transformCartResponse = (response: any): CartResponse => {
  const rawData = response?.data;

  // If response.data is an array (legacy fallback) or { items, summary }
  const rawItems = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.items)
    ? rawData.items
    : [];

  const items: CartItem[] = rawItems.map((item: any) => {
    const price = roundCurrency(item.price);
    const quantity = Number(item.quantity) || 0;
    const stock = Number(item.stock) || 0;
    const availabilityType: "IN_STOCK" | "MADE_TO_ORDER" =
      String(item.availability_type || "IN_STOCK").toUpperCase() === "MADE_TO_ORDER"
        ? "MADE_TO_ORDER"
        : "IN_STOCK";
    const isMadeToOrder = availabilityType === "MADE_TO_ORDER";
    const storeIsClosed = Boolean(item.store_is_closed);
    const firstImg = Array.isArray(item.images)
      ? item.images[0]
      : item.image || item.img || null;

    const paidQuantity = item.paid_quantity != null ? Number(item.paid_quantity) : quantity;
    const freeQuantity = item.free_quantity != null ? Number(item.free_quantity) : 0;
    const totalQuantity = item.total_quantity != null ? Number(item.total_quantity) : (paidQuantity + freeQuantity);
    const itemTotal = item.itemTotal != null ? roundCurrency(item.itemTotal) : roundCurrency(price * paidQuantity);

    return {
      id: Number(item.product_id || item.id),
      cart_item_id: Number(item.cart_item_id || item.id),
      product_id: Number(item.product_id || item.id),
      name: item.name || "Item",
      description: item.description || "",
      price,
      stock,
      images: Array.isArray(item.images) ? item.images : [],
      image: toAssetUrl(firstImg),
      img: toAssetUrl(firstImg),
      is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
      availability_type: availabilityType,
      isMadeToOrder,
      store_id: item.store_id ? Number(item.store_id) : null,
      store_name: item.store_name || null,
      store_is_closed: storeIsClosed,
      stockMessage: item.stockMessage || item.stock_message || null,
      category_id: item.category_id || "",
      category_name: item.category_name || "Menu",
      quantity,
      paid_quantity: paidQuantity,
      free_quantity: freeQuantity,
      total_quantity: totalQuantity,
      bogo_details: item.bogo_details || null,
      itemTotal,
      // MADE_TO_ORDER products are never out of stock
      isOutOfStock: storeIsClosed || (isMadeToOrder ? false : (stock <= 0 || item.is_active === false)),
      exceedsStock: isMadeToOrder ? false : quantity > stock,
      cannot_deliver: Boolean(item.cannot_deliver),
      cannot_deliver_reason: item.cannot_deliver_reason || null,
      is_deliverable: item.is_deliverable !== false && !item.cannot_deliver,
      added_at: item.added_at,
      updated_at: item.updated_at,
    };
  });

  const rawSummary = rawData?.summary || {};
  const rawPricing = rawData?.pricing || {};

  const paidItemsCount = Number(
    rawSummary.paidItemsCount ??
      rawSummary.normalCartQuantity ??
      rawSummary.cartQuantity ??
      rawPricing.paid_items ??
      rawPricing.normal_cart_quantity ??
      items.reduce((sum, it) => sum + (it.paid_quantity ?? it.quantity), 0)
  );
  const freeItemsCount = Number(
    rawSummary.freeItemsCount ??
      rawPricing.free_items ??
      items.reduce((sum, it) => sum + (it.free_quantity ?? 0), 0)
  );
  const totalProductsDelivered = Number(
    rawSummary.totalProductsDelivered ??
      rawSummary.totalQuantity ??
      rawSummary.totalItems ??
      rawPricing.total_products_delivered ??
      rawPricing.total_quantity ??
      rawPricing.total_items ??
      (paidItemsCount + freeItemsCount)
  );
  const totalItems = totalProductsDelivered;
  const bogoSavings = roundCurrency(
    rawSummary.bogoSavings ?? rawPricing.bogo_savings ?? 0
  );

  const subtotal =
    rawSummary.subtotal !== undefined
      ? roundCurrency(rawSummary.subtotal)
      : roundCurrency(items.reduce((sum, it) => sum + it.itemTotal, 0));

  const discountPercent = Number(rawSummary.discountPercent ?? rawPricing.discount_percent ?? 0);
  const discount = roundCurrency(rawSummary.discount ?? rawPricing.discount ?? 0);
  const discountedSubtotal = roundCurrency(rawSummary.discountedSubtotal ?? rawPricing.discounted_subtotal ?? (subtotal - discount));

  const gstPercent = Number(rawSummary.gstPercent ?? rawPricing.gst_percent ?? 0);
  const taxInclusive = Boolean(rawSummary.taxInclusive ?? rawPricing.tax_inclusive ?? false);
  const taxAmount = roundCurrency(rawSummary.taxAmount ?? rawPricing.tax_amount ?? 0);
  const taxAddedToTotal = roundCurrency(rawSummary.taxAddedToTotal ?? rawPricing.tax_added_to_total ?? 0);
  const taxLabel = rawSummary.taxLabel || rawPricing.tax_label || (taxInclusive ? "Inclusive of all taxes" : `GST (${gstPercent}%)`);

  const deliveryChargeType = rawSummary.deliveryChargeType || rawPricing.delivery_charge_type || "fixed";
  const deliveryChargeValue = roundCurrency(rawSummary.deliveryChargeValue ?? rawPricing.delivery_charge_value ?? 0);
  const deliveryFee = roundCurrency(rawSummary.deliveryFee ?? rawPricing.delivery_fee ?? 0);
  const isFreeDelivery = Boolean(rawSummary.isFreeDelivery ?? rawPricing.is_free_delivery ?? false);
  const freeDeliveryThreshold = roundCurrency(rawSummary.freeDeliveryThreshold ?? rawPricing.free_delivery_threshold ?? 0);
  const freeDeliverySavings = roundCurrency(rawSummary.freeDeliverySavings ?? rawPricing.free_delivery_savings ?? 0);
  const freeDeliveryShortfall = roundCurrency(rawSummary.freeDeliveryShortfall ?? rawPricing.free_delivery_shortfall ?? 0);

  const distanceKm = rawSummary.distanceKm ?? rawPricing.distance_km ?? null;
  const maxDeliveryDistance = Number(rawSummary.maxDeliveryDistance ?? rawPricing.max_delivery_distance ?? 0);
  const isOutOfRange = Boolean(rawSummary.isOutOfRange ?? rawPricing.is_out_of_range ?? false);

  const packagingFee = roundCurrency(rawSummary.packagingFee ?? rawPricing.packaging_fee ?? 0);
  const platformFee = roundCurrency(rawSummary.platformFee ?? rawPricing.platform_fee ?? 0);
  const codFee = roundCurrency(rawSummary.codFee ?? rawPricing.cod_fee ?? 0);
  const isCod = Boolean(rawSummary.isCod ?? rawPricing.is_cod ?? true);

  const minimumOrderAmount = roundCurrency(rawSummary.minimumOrderAmount ?? rawPricing.minimum_order_amount ?? 0);
  const isBelowMinimumOrder = Boolean(rawSummary.isBelowMinimumOrder ?? rawPricing.is_below_minimum_order ?? false);
  const minimumOrderShortfall = roundCurrency(rawSummary.minimumOrderShortfall ?? rawPricing.minimum_order_shortfall ?? 0);

  const grandTotal =
    rawSummary.grandTotal !== undefined
      ? roundCurrency(rawSummary.grandTotal)
      : rawPricing.grand_total !== undefined
      ? roundCurrency(rawPricing.grand_total)
      : Math.max(0, roundCurrency(subtotal + deliveryFee - discount));

  const summary: CartSummary = {
    totalItems,
    totalProductsDelivered,
    totalQuantity: totalProductsDelivered,
    cartQuantity: paidItemsCount,
    normalCartQuantity: paidItemsCount,
    paidItemsCount,
    freeItemsCount,
    bogoSavings,
    itemTypesCount: items.length,
    subtotal,
    discountPercent,
    discount,
    discountedSubtotal,

    gstPercent,
    taxInclusive,
    taxAmount,
    taxAddedToTotal,
    taxLabel,

    deliveryChargeType,
    deliveryChargeValue,
    deliveryFee,
    isFreeDelivery,
    freeDeliveryThreshold,
    freeDeliverySavings,
    freeDeliveryShortfall,

    distanceKm,
    maxDeliveryDistance,
    isOutOfRange,

    packagingFee,
    platformFee,
    codFee,
    isCod,

    minimumOrderAmount,
    isBelowMinimumOrder,
    minimumOrderShortfall,

    appliedOffer: rawSummary.appliedOffer || rawPricing.applied_offer || null,
    offerEvaluation: rawSummary.offerEvaluation || rawPricing.offer_evaluation || null,

    grandTotal,
    hasOutOfStockItems: items.some((it) => it.isOutOfStock || it.exceedsStock),
    outOfStockCount: items.filter((it) => it.isOutOfStock || it.exceedsStock).length,

    timer: rawSummary.timer || (rawPricing.calculated_at ? {
      calculatedAt: rawPricing.calculated_at,
      expiresAt: rawPricing.expires_at,
      validForSeconds: rawPricing.valid_for_seconds,
    } : undefined),
  };

  return {
    success: Boolean(response?.success ?? true),
    message: response?.message,
    data: {
      items,
      summary,
      pricing: rawPricing,
      deliveryAddress: rawData?.deliveryAddress,
      mergeReport: rawData?.mergeReport,
    },
  };
};

export const cartApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query<
      CartResponse,
      { addressId?: number; lat?: number; lng?: number; paymentMethod?: string; offerCode?: string } | void
    >({
      query: (params) => {
        if (!params) return "/cart";
        const query = new URLSearchParams();
        if (params.addressId) query.append("addressId", String(params.addressId));
        if (params.lat != null) query.append("lat", String(params.lat));
        if (params.lng != null) query.append("lng", String(params.lng));
        if (params.paymentMethod) query.append("paymentMethod", params.paymentMethod);
        if (params.offerCode) query.append("offerCode", params.offerCode);
        const qStr = query.toString();
        return `/cart${qStr ? `?${qStr}` : ""}`;
      },
      transformResponse: transformCartResponse,
      providesTags: ["Cart"],
    }),
    getGuestCartPreview: build.mutation<
      CartResponse,
      { items: { productId: number; quantity: number }[]; offerCode?: string; lat?: number; lng?: number; paymentMethod?: string }
    >({
      query: (body) => ({
        url: "/cart/guest-preview",
        method: "POST",
        body,
      }),
      transformResponse: transformCartResponse,
    }),
    addCartItem: build.mutation<
      CartResponse,
      { productId: number; quantity?: number }
    >({
      query: (body) => ({
        url: "/cart/items",
        method: "POST",
        body,
      }),
      transformResponse: transformCartResponse,
      invalidatesTags: ["Cart"],
    }),
    updateCartItem: build.mutation<
      CartResponse,
      { productId: number; quantity: number }
    >({
      query: ({ productId, quantity }) => ({
        url: `/cart/items/${productId}`,
        method: "PATCH",
        body: { quantity },
      }),
      transformResponse: transformCartResponse,
      invalidatesTags: ["Cart"],
    }),
    deleteCartItem: build.mutation<CartResponse, number>({
      query: (productId) => ({
        url: `/cart/items/${productId}`,
        method: "DELETE",
      }),
      transformResponse: transformCartResponse,
      invalidatesTags: ["Cart"],
    }),
    clearCart: build.mutation<CartResponse, void>({
      query: () => ({
        url: "/cart",
        method: "DELETE",
      }),
      transformResponse: transformCartResponse,
      invalidatesTags: ["Cart"],
    }),
    mergeCart: build.mutation<
      CartResponse,
      { items: { productId: number; quantity: number }[] }
    >({
      query: (body) => ({
        url: "/cart/merge",
        method: "POST",
        body,
      }),
      transformResponse: transformCartResponse,
      invalidatesTags: ["Cart"],
    }),
  }),
});

export const {
  useGetCartQuery,
  useGetGuestCartPreviewMutation,
  useAddCartItemMutation,
  useUpdateCartItemMutation,
  useDeleteCartItemMutation,
  useClearCartMutation,
  useMergeCartMutation,
} = cartApi;
