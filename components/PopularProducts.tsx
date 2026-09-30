"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Flame,
  Heart,
  ShoppingCart,
  Star,
  Plus,
  Minus,
  Check,
  Gift,
} from "lucide-react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import { useGetStoreProductsQuery } from "../redux/services/catalogApi";
import {
  useGetWishlistQuery,
  useToggleWishlistMutation,
} from "../redux/services/wishlistApi";
import {
  useGetCartQuery,
  useAddCartItemMutation,
  useUpdateCartItemMutation,
} from "../redux/services/cartApi";
import {
  getGuestCart,
  addGuestCartItem,
  updateGuestCartItemQty,
  subscribeGuestCart,
  GuestCartItem,
} from "../lib/guestCart";
import { useGetOffersQuery } from "../redux/services/offerApi";
import { getProductPrimaryOffer, formatOfferBadge } from "../utils/offerUtils";
import SkeletonLoader from "./SkeletonLoader";

export default function PopularProducts() {
  const router = useRouter();
  const user = useSelector(
    (state: { auth: { user: any | null } }) => state.auth.user
  );
  const [selectedStoreId, setSelectedStoreId] = React.useState<string | null>(null);
  React.useEffect(() => {
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
    return () => {
      window.removeEventListener("sfc_delivery_location_changed", handleLocationChange);
    };
  }, []);

  const { data: productResponse, isLoading } = useGetStoreProductsQuery({
    limit: 6,
    ...(selectedStoreId ? { store_id: selectedStoreId } : {}),
  });
  const products = productResponse?.data || [];
  const [addedProduct, setAddedProduct] = React.useState<string | null>(
    null
  );

  const { data: wishlistData } = useGetWishlistQuery(undefined, {
    skip: !user,
  });
  const { data: cartResponse } = useGetCartQuery(undefined, {
    skip: !user,
  });
  const { data: offersData = [] } = useGetOffersQuery();
  const [toggleWishlist] = useToggleWishlistMutation();
  const [addCartItem] = useAddCartItemMutation();
  const [updateCartItem] = useUpdateCartItemMutation();

  const [guestCartItems, setGuestCartItems] = React.useState<GuestCartItem[]>([]);
  const inFlightQtyRef = React.useRef<Set<number>>(new Set());

  React.useEffect(() => {
    setGuestCartItems(getGuestCart());
    const unsubscribe = subscribeGuestCart((items) => {
      setGuestCartItems(items);
    });
    return unsubscribe;
  }, []);

  const cartItemsMap = React.useMemo(() => {
    if (user) {
      return new Map(
        (cartResponse?.data?.items || []).map((it) => [
          Number(it.id),
          it.quantity,
        ])
      );
    }
    return new Map(guestCartItems.map((it) => [Number(it.productId), it.quantity]));
  }, [user, cartResponse, guestCartItems]);

  const wishlistedIds = React.useMemo(
    () =>
      new Set(
        (wishlistData?.data || []).map((w) => Number(w.id || w.product_id))
      ),
    [wishlistData]
  );

  const handleToggleWishlist = async (
    productId: number | string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.dispatchEvent(new CustomEvent("sfc_open_login"));
      return;
    }
    try {
      const res = await toggleWishlist({
        productId: Number(productId),
      }).unwrap();
      if (res.inWishlist) {
        toast.success("Added to favorites");
      } else {
        toast.success("Removed from favorites");
      }
    } catch {
      toast.error("Failed to update favorites");
    }
  };

  const popularProducts = products.slice(0, 6);

  const handleAddToCart = async (product: any) => {
    const isMadeToOrder =
      product.isMadeToOrder ||
      String(product.availability_type || "").toUpperCase() === "MADE_TO_ORDER";
    if (!isMadeToOrder && Number(product.stock) <= 0) {
      toast.error("Product is out of stock");
      return;
    }

    if (!user) {
      const res = addGuestCartItem(
        Number(product.id),
        1,
        Number(product.stock),
        isMadeToOrder
      );
      if (res.success) {
        setAddedProduct(product.id);
        toast.success("Added to cart");
        setTimeout(() => {
          setAddedProduct(null);
        }, 1200);
      } else {
        toast.error(res.message || "Could not add to cart");
      }
      return;
    }

    try {
      await addCartItem({ productId: Number(product.id), quantity: 1 }).unwrap();
      setAddedProduct(product.id);
      toast.success("Added to cart");
      setTimeout(() => {
        setAddedProduct(null);
      }, 1200);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to add product to cart");
    }
  };

  const handleChangeQty = async (
    productId: number,
    nextQty: number,
    maxStock: number,
    isMadeToOrder?: boolean
  ) => {
    if (inFlightQtyRef.current.has(productId)) return;
    inFlightQtyRef.current.add(productId);

    try {
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
            toast.success("Removed from cart");
          }
        } else {
          toast.error(res.message || "Failed to update quantity");
        }
        return;
      }

      await updateCartItem({ productId, quantity: nextQty }).unwrap();
      if (nextQty === 0) {
        toast.success("Removed from cart");
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update quantity");
    } finally {
      setTimeout(() => {
        inFlightQtyRef.current.delete(productId);
      }, 350);
    }
  };


  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const getDiscount = (product: any) => {
    if (!product.originalPrice || !product.price) {
      return null;
    }

    if (product.originalPrice <= product.price) {
      return null;
    }

    return Math.round(
      ((product.originalPrice - product.price) /
        product.originalPrice) *
        100
    );
  };


  const getRatingInfo = (product: any) => {
    const totalReviews = Number(product.total_reviews || product.reviews_count || 0);
    const avgRating = Number(product.rating || product.average_rating || 0);
    return {
      totalReviews,
      avgRating,
      hasReviews: totalReviews > 0 && avgRating > 0,
      displayRating: totalReviews > 0 && avgRating > 0 ? avgRating.toFixed(1) : "New",
    };
  };

  return (
    <section className="bg-[var(--bg-body)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex items-end justify-between">

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="
                  flex
                  h-6
                  w-6
                  items-center
                  justify-center
                  rounded-full
                  bg-[var(--color-secondary)]/10
                  text-[var(--color-secondary)]
                "
              >
                <Flame size={14} fill="currentColor" />
              </span>

              <span
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-[var(--color-primary)]
                "
              >
                Customer Favorites
              </span>
            </div>

            <p
              className="
                mt-2
                max-w-xl
                text-sm
                leading-6
                text-[var(--color-text-secondary)]
                md:text-base
              "
            >
              Our most-loved dishes, freshly prepared and
              ready to make your day delicious.
            </p>
          </div>

          <Link
            href="/menu"
            className="
              hidden
              items-center
              gap-2
              rounded-xl
              bg-[var(--color-primary)]
              px-5
              py-2.5
              text-sm
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-[var(--color-primary-dark)]
              sm:inline-flex
            "
            style={{color:"white"}}
          >
            View All

            <ArrowRight size={16} />
          </Link>
        </div>

        {isLoading ? (
          <SkeletonLoader
            variant="product"
            count={6}
            gridClassName="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3"
          />
        ) : (
          <div
            className="
              grid
              grid-cols-2
              gap-3
              sm:gap-5
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {popularProducts.map((product: any, index: number) => {
            const discount = getDiscount(product);
            const ratingInfo = getRatingInfo(product);

            const image =
              product.img ||
              product.image ||
              product.imageUrl ||
              "";

            const name =
              product.name ||
              product.title ||
              "Delicious Food";

            const price = Number(product.price ?? 0);
            const isMadeToOrder = product.isMadeToOrder ||
              String(product.availability_type || "").toUpperCase() === "MADE_TO_ORDER";
            const outOfStock = !isMadeToOrder && Number(product.stock) <= 0;
            const inCartQty = cartItemsMap.get(Number(product.id)) || 0;

            const isAdded = addedProduct === product.id;

            return (
              <article
                key={product.id ?? index}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/product/${product.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/product/${product.id}`);
                  }
                }}
                className={`
                  group
                  cursor-pointer
                  flex
                  flex-col
                  justify-between
                  h-full
                  overflow-hidden
                  rounded-2xl
                  border
                  border-[var(--color-border)]
                  bg-white
                  shadow-xs
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-[var(--color-primary)]
                  hover:shadow-[0_18px_40px_rgba(79,125,22,0.13)]
                `}
              >
                <div className="relative aspect-square sm:aspect-[4/3] md:aspect-square w-full overflow-hidden bg-stone-50">
                  {image ? (
                    <Image
                      src={image}
                      alt={name}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                      className="
                        object-cover
                        transition-transform
                        duration-500
                        group-hover:scale-105
                      "
                    />
                  ) : (
                    <div className="h-full w-full bg-stone-100 flex items-center justify-center text-stone-400">
                      <span className="text-xs">No image</span>
                    </div>
                  )}

                  <div
                    className="
                      pointer-events-none
                      absolute
                      inset-x-0
                      bottom-0
                      h-24
                      bg-gradient-to-t
                      from-black/40
                      to-transparent
                    "
                  />

                  {/* Applicable Offer Badge */}
                  {(() => {
                    const offer = getProductPrimaryOffer(product, offersData);
                    if (!offer) return null;
                    const badgeText = formatOfferBadge(offer);
                    const isProductSpecific =
                      offer.is_product_specific ||
                      (Array.isArray(offer.target_product_ids) &&
                        offer.target_product_ids
                          .map(Number)
                          .includes(Number(product.id)));

                    return (
                      <div
                        className={`absolute left-2.5 bottom-2.5 sm:left-3 sm:bottom-3 z-10 flex items-center gap-1 sm:gap-1.5 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wide text-white shadow-md backdrop-blur-xs ${
                          isProductSpecific ? "bg-amber-500" : "bg-emerald-600"
                        }`}
                      >
                        <Gift size={10} />
                        <span className="truncate max-w-[80px] sm:max-w-none">{badgeText}</span>
                      </div>
                    );
                  })()}

                  {/* Wishlist Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleWishlist(product.id, e)}
                    aria-label="Save to favorites"
                    className="
                      absolute
                      right-2
                      top-2
                      sm:right-3
                      sm:top-3
                      z-20
                      flex
                      h-7
                      w-7
                      sm:h-9
                      sm:w-9
                      items-center
                      justify-center
                      rounded-full
                      bg-white/95
                      shadow-md
                      backdrop-blur-md
                      transition
                      hover:scale-110
                      active:scale-95
                    "
                  >
                    <Heart
                      size={14}
                      className={
                        wishlistedIds.has(Number(product.id))
                          ? "fill-red-500 text-red-500"
                          : "text-stone-600 hover:text-red-400"
                      }
                    />
                  </button>

                  {discount && (
                    <span
                      className="
                        absolute
                        left-3
                        bottom-10
                        rounded-full
                        bg-[var(--color-secondary)]
                        px-2.5
                        py-1
                        text-[9px]
                        font-black
                        text-white
                        shadow-md
                      "
                    >
                      {discount}% OFF
                    </span>
                  )}

                  {/* Dynamic Rating Pill */}
                  <div
                    className="
                      absolute
                      bottom-2
                      left-2
                      sm:bottom-3
                      sm:left-3
                      flex
                      items-center
                      gap-1
                      sm:gap-1.5
                      rounded-full
                      bg-white/95
                      px-2
                      py-0.5
                      sm:px-2.5
                      sm:py-1
                      text-[10px]
                      sm:text-xs
                      font-bold
                      text-[var(--color-text-primary)]
                      shadow-sm
                      backdrop-blur
                    "
                  >
                    <Star
                      size={11}
                      fill="currentColor"
                      className="text-[var(--color-star)] shrink-0"
                    />

                    <span className="font-black text-[var(--color-text-primary)]">
                      {ratingInfo.displayRating}
                    </span>

                    <span className="text-[9px] sm:text-[10px] font-medium text-[var(--color-text-muted)]">
                      ({ratingInfo.totalReviews})
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      className="
                        line-clamp-1
                        text-sm
                        sm:text-lg
                        font-extrabold
                        text-[var(--color-text-primary)]
                      "
                      title={name}
                    >
                      {name}
                    </h3>

                    <p
                      className="
                        mt-1
                        line-clamp-2
                        min-h-[32px]
                        sm:min-h-[40px]
                        text-[10px]
                        sm:text-xs
                        leading-4
                        sm:leading-5
                        text-[var(--color-text-muted)]
                      "
                      title={product.description ||
                        "Freshly prepared with quality ingredients and delicious flavors."}
                    >
                      {product.description ||
                        "Freshly prepared with quality ingredients and delicious flavors."}
                    </p>
                  </div>

                  <div
                    className="
                      mt-3
                      sm:mt-4
                      border-t
                      border-[var(--color-border)]/50
                      pt-2.5
                      flex
                      items-center
                      justify-between
                      gap-2
                      sm:gap-3
                    "
                  >

                    <div className="flex items-center gap-1.5 sm:gap-2">

                      <span
                        className="
                          text-base
                          sm:text-xl
                          font-black
                          text-[var(--color-primary)]
                        "
                      >
                        {formatPrice(price)}
                      </span>

                      {product.originalPrice &&
                        product.originalPrice > price && (
                          <span
                            className="
                              text-[10px]
                              sm:text-xs
                              font-medium
                              text-[var(--color-text-muted)]
                              line-through
                            "
                          >
                            {formatPrice(
                              Number(product.originalPrice)
                            )}
                          </span>
                        )}
                    </div>


                    {inCartQty > 0 ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="
                          flex
                          h-8
                          sm:h-10
                          items-center
                          gap-0.5
                          sm:gap-1
                          rounded-xl
                          bg-[var(--color-primary-50)]
                          p-0.5
                          sm:p-1
                          ring-1
                          ring-[var(--color-primary)]/15
                        "
                      >
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChangeQty(
                              Number(product.id),
                              inCartQty - 1,
                              Number(product.stock || 999),
                              isMadeToOrder
                            );
                          }}
                          className="
                            flex
                            h-7
                            w-7
                            sm:h-8
                            sm:w-8
                            items-center
                            justify-center
                            rounded-lg
                            bg-white
                            text-[var(--color-primary)]
                            shadow-xs
                            transition
                            hover:bg-[var(--color-primary)]
                            hover:text-white
                            active:scale-90
                          "
                        >
                          <Minus size={13} strokeWidth={3} />
                        </button>

                        <span
                          className="
                            min-w-[20px]
                            sm:min-w-[26px]
                            text-center
                            text-[11px]
                            sm:text-xs
                            font-black
                            text-[var(--color-primary)]
                          "
                        >
                          {inCartQty}
                        </span>

                        <button
                          type="button"
                          aria-label="Increase quantity"
                          title={
                            !isMadeToOrder && inCartQty >= Number(product.stock)
                              ? `Only ${product.stock} items available in stock`
                              : "Increase quantity"
                          }
                          disabled={!isMadeToOrder && inCartQty >= Number(product.stock)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChangeQty(
                              Number(product.id),
                              inCartQty + 1,
                              Number(product.stock || 999),
                              isMadeToOrder
                            );
                          }}
                          className="
                            flex
                            h-7
                            w-7
                            sm:h-8
                            sm:w-8
                            items-center
                            justify-center
                            rounded-lg
                            bg-[var(--color-primary)]
                            text-white
                            shadow-xs
                            transition
                            hover:bg-[var(--color-primary-dark)]
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                            active:scale-90
                          "
                        >
                          <Plus size={13} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={outOfStock}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (outOfStock) return;
                          handleAddToCart(product);
                        }}
                        className={`
                          flex
                          h-8
                          sm:h-10
                          items-center
                          justify-center
                          gap-1.5
                          sm:gap-2
                          rounded-xl
                          px-2.5
                          sm:px-4
                          text-[11px]
                          sm:text-xs
                          font-bold
                          text-white
                          shadow-sm
                          transition-all
                          duration-200
                          ${
                            isAdded
                              ? "bg-[var(--color-success)]"
                              : outOfStock
                                ? "cursor-not-allowed bg-[var(--color-text-muted)]"
                                : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] hover:-translate-y-0.5"
                          }
                        `}
                      >
                        {outOfStock ? (
                          <span className="text-[10px] sm:text-xs">Out of stock</span>
                        ) : isAdded ? (
                          <>
                            <Check size={14} />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>Add</span>
                            <span className="hidden sm:inline">to Cart</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        )}

        <div className="mt-7 flex justify-center sm:hidden">
          <Link
            href="/menu"
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-[var(--color-primary)]
              px-6
              py-3
              text-sm
              font-bold
              text-white
              shadow-md
              transition
              hover:bg-[var(--color-primary-dark)]
            "
            style={{color:"white"}}
          >
            View Full Menu
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
