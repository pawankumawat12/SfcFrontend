"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSelector } from "react-redux";
import { Utensils, ChevronRight, Star, Plus, Check, Gift, Heart } from "lucide-react";
import toast from "react-hot-toast";
import { useGetStoreProductsQuery } from "../redux/services/catalogApi";
import { useGetOffersQuery } from "../redux/services/offerApi";
import { getProductPrimaryOffer, formatOfferBadge } from "../utils/offerUtils";
import {
  useGetCartQuery,
  useAddCartItemMutation,
} from "../redux/services/cartApi";
import {
  useGetWishlistQuery,
  useToggleWishlistMutation,
} from "../redux/services/wishlistApi";
import {
  getGuestCart,
  addGuestCartItem,
  subscribeGuestCart,
  GuestCartItem,
} from "../lib/guestCart";
import { toAssetUrl } from "../utils/backendUrl";

interface PairItWithSectionProps {
  currentProductId: number | string;
  categoryId?: number | string;
  categoryName?: string;
}

export default function PairItWithSection({
  currentProductId,
  categoryId,
  categoryName,
}: PairItWithSectionProps) {
  const user = useSelector(
    (state: { auth: { user: any | null } }) => state.auth.user
  );

  const { data: cartResponse } = useGetCartQuery(undefined, {
    skip: !user,
  });
  const [addCartItem] = useAddCartItemMutation();

  const { data: wishlistData } = useGetWishlistQuery(undefined, {
    skip: !user,
  });
  const [toggleWishlist] = useToggleWishlistMutation();

  const [guestCartItems, setGuestCartItems] = useState<GuestCartItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sfc_selected_store_id");
      if (saved) setSelectedStoreId(saved);
    } catch {}

    const handleLocationChange = (e: Event) => {
      const loc = (e as CustomEvent).detail;
      if (loc && loc.storeId != null) {
        setSelectedStoreId(String(loc.storeId));
      } else {
        setSelectedStoreId(null);
      }
    };
    window.addEventListener("sfc_delivery_location_changed", handleLocationChange);

    setGuestCartItems(getGuestCart());
    const unsubscribe = subscribeGuestCart((items) => {
      setGuestCartItems(items);
    });
    return () => {
      window.removeEventListener("sfc_delivery_location_changed", handleLocationChange);
      unsubscribe();
    };
  }, []);

  const { data: storeProductsResponse, isLoading } = useGetStoreProductsQuery({
    isActive: true,
    ...(selectedStoreId ? { store_id: selectedStoreId } : {}),
  });
  const { data: offersData = [] } = useGetOffersQuery();

  const categoryItems = React.useMemo(() => {
    const all = storeProductsResponse?.data || [];
    const currentId = Number(currentProductId);
    const catIdStr = String(categoryId || "");

    // Filter items in the same category, excluding current product
    const matching = all.filter(
      (p: any) =>
        Number(p.id) !== currentId &&
        (String(p.category_id || "") === catIdStr ||
          String(p.category || "") === catIdStr)
    );

    // If matching category items are fewer than 4, supplement with other top items
    if (matching.length < 4) {
      const others = all.filter(
        (p: any) =>
          Number(p.id) !== currentId &&
          !matching.some((m: any) => Number(m.id) === Number(p.id))
      );
      return [...matching, ...others].slice(0, 4);
    }

    return matching.slice(0, 4);
  }, [storeProductsResponse, currentProductId, categoryId]);

  const getInCartQty = (id: number) => {
    if (user) {
      const item = (cartResponse?.data?.items || []).find(
        (c: any) => Number(c.id || c.product_id) === id
      );
      return item ? item.quantity : 0;
    }
    const item = guestCartItems.find((c) => Number(c.productId) === id);
    return item ? item.quantity : 0;
  };

  const isProductWishlisted = (id: number) => {
    return Boolean(
      (wishlistData?.data || []).some(
        (w: any) => Number(w.id || w.product_id) === id
      )
    );
  };

  const handleToggleWishlist = async (pid: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.dispatchEvent(new CustomEvent("sfc_open_login"));
      return;
    }
    try {
      const res = await toggleWishlist({ productId: pid }).unwrap();
      if (res.inWishlist) {
        toast.success("Added to favorites");
      } else {
        toast.success("Removed from favorites");
      }
    } catch {
      toast.error("Failed to update favorites");
    }
  };

  const handleAddToCart = async (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pid = Number(product.id);
    const isMTO = Boolean(
      product.isMadeToOrder ||
        String(product.availability_type || "").toUpperCase() === "MADE_TO_ORDER"
    );
    const stock = Number(product.stock || 0);

    if (!isMTO && stock <= 0) {
      toast.error("Product is out of stock");
      return;
    }

    if (!user) {
      const res = addGuestCartItem(pid, 1, stock, isMTO);
      if (res.success) {
        toast.success(`Added ${product.name} to cart`);
      } else {
        toast.error(res.message || "Could not add to cart");
      }
      return;
    }

    try {
      await addCartItem({ productId: pid, quantity: 1 }).unwrap();
      toast.success(`Added ${product.name} to cart`);
    } catch {
      toast.error("This product is not available right now.");

    }
  };

  if (!isLoading && categoryItems.length === 0) {
    return null;
  }

  const cleanCategoryName = categoryName || "This Category";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 border-t border-[var(--color-border)]/60">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
              <Utensils size={13} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Pair It With
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)]">
            More from {cleanCategoryName}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Handcrafted dishes and favorites loved by customers who ordered this.
          </p>
        </div>

        <Link
          href={`/menu${categoryId ? `?category=${categoryId}` : ""}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] hover:underline self-start sm:self-auto"
        >
          <span>Explore {cleanCategoryName}</span>
          <ChevronRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {categoryItems.map((rel: any) => {
          const relRating = Number(rel.rating || 0);
          const relReviews = Number(rel.total_reviews || 0);
          const isMadeToOrder = Boolean(
            rel.isMadeToOrder ||
              String(rel.availability_type || "").toUpperCase() ===
                "MADE_TO_ORDER"
          );
          const isOut = !isMadeToOrder && Number(rel.stock) <= 0;
          const inCartCount = getInCartQty(Number(rel.id));
          const isFav = isProductWishlisted(Number(rel.id));
          const displayImg = toAssetUrl(
            (Array.isArray(rel.images) && rel.images[0]) ||
            rel.img ||
            rel.image
          );

          const offer = getProductPrimaryOffer(rel, offersData);
          const badgeText = offer ? formatOfferBadge(offer) : "";
          const isProductSpecific = Boolean(
            offer?.is_product_specific ||
            (Array.isArray(offer?.target_product_ids) &&
              offer.target_product_ids.map(Number).includes(Number(rel.id)))
          );

          const originalPrice = Number(rel.price || 0);
          let discountedPrice: number | null = null;
          if (offer && offer.type === "PERCENTAGE" && Number(offer.discount_value) > 0) {
            discountedPrice = Math.max(0, originalPrice - (originalPrice * Number(offer.discount_value)) / 100);
          } else if (offer && offer.type === "FLAT" && Number(offer.discount_value) > 0) {
            discountedPrice = Math.max(0, originalPrice - Number(offer.discount_value));
          }

          return (
            <article
              key={rel.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-xs transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-44 w-full overflow-hidden bg-stone-100">
                <Link
                  href={`/product/${rel.id}`}
                  className="block h-full w-full"
                >
                  {displayImg ? (
                    <Image
                      src={displayImg}
                      alt={rel.name}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-400 text-xs font-semibold">
                      No image
                    </div>
                  )}
                  {isOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-black uppercase text-white backdrop-blur-[2px]">
                      Out of Stock
                    </div>
                  )}
                </Link>

                {/* Applicable Offer Badge on Image */}
                {offer && (
                  <div
                    className={`absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-md backdrop-blur-xs ${
                      isProductSpecific
                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                        : "bg-gradient-to-r from-emerald-600 to-teal-600"
                    }`}
                  >
                    <Gift size={10} />
                    <span>{badgeText}</span>
                  </div>
                )}

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={(e) => handleToggleWishlist(Number(rel.id), e)}
                  aria-label="Save to favorites"
                  className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:scale-110 active:scale-95"
                >
                  <Heart
                    size={15}
                    className={
                      isFav
                        ? "fill-red-500 text-red-500"
                        : "text-stone-500 hover:text-red-500"
                    }
                  />
                </button>

                {(rel.categoryName || rel.category_name) && (
                  <div className="absolute left-2.5 bottom-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                    {rel.categoryName || rel.category_name}
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <Link href={`/product/${rel.id}`} className="block">
                    <h3 className="line-clamp-1 text-sm sm:text-base font-black text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition">
                      {rel.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 min-h-[32px] text-[11px] leading-4 text-[var(--color-text-muted)]">
                      {rel.description ||
                        "Freshly handcrafted with authentic taste."}
                    </p>
                  </Link>

                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 font-bold text-amber-500">
                      <Star
                        size={12}
                        className="fill-amber-400 text-amber-400"
                      />
                      <span>{relRating > 0 ? relRating.toFixed(1) : "New"}</span>
                    </span>
                    {relReviews > 0 && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        ({relReviews})
                      </span>
                    )}
                  </div>

                  {/* Offer promo highlight line */}
                  {offer && (
                    <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                      <Gift size={11} className="shrink-0 text-emerald-600" />
                      <span className="truncate">{offer.title || badgeText}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)]/60 pt-3">
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-bold">
                      Price
                    </span>
                    {discountedPrice !== null ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black text-[var(--color-primary)]">
                          ₹{Math.round(discountedPrice).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-stone-400 line-through">
                          ₹{originalPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ) : (
                      <p className="text-base font-black text-[var(--color-text-primary)]">
                        ₹{originalPrice.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(rel, e)}
                      disabled={isOut}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-black shadow-xs transition active:scale-95 ${
                        isOut
                          ? "cursor-not-allowed bg-stone-200 text-stone-400"
                          : inCartCount > 0
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-stone-100 text-stone-800 hover:bg-stone-200"
                      }`}
                    >
                      {inCartCount > 0 ? (
                        <>
                          <Check size={12} />
                          <span>({inCartCount})</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Add</span>
                        </>
                      )}
                    </button>

               
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

