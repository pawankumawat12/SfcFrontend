"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Truck,
  Utensils,
  Leaf,
  Zap,
  Edit2,
  Trash2,
  MessageSquare,
  Sparkles,
  AlertCircle,
  X,
  Loader2,
  User,
  ThumbsUp,
  ShieldCheck,
  CheckCircle2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Camera,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { toAssetUrl } from "../utils/backendUrl";

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
import { useGetProductReviewsQuery } from "../redux/services/reviewApi";
import { useGetOffersQuery } from "../redux/services/offerApi";
import { getAllProductOffers } from "../utils/offerUtils";
import { Gift } from "lucide-react";
import SimilarProductsSection from "./SimilarProductsSection";
import RatingsAndReviewsSection from "./RatingsAndReviewsSection";
import PairItWithSection from "./PairItWithSection";

export default function ProductDetailsClient({ product }: { product: any }) {
  const user = useSelector(
    (state: { auth: { user: any | null } }) => state.auth.user
  );
  const { data: wishlistData } = useGetWishlistQuery(undefined, {
    skip: !user,
  });
  const [toggleWishlist] = useToggleWishlistMutation();

  const { data: cartResponse } = useGetCartQuery(undefined, {
    skip: !user,
  });
  const [addCartItem] = useAddCartItemMutation();
  const [updateCartItem] = useUpdateCartItemMutation();

  const [guestCartItems, setGuestCartItems] = useState<GuestCartItem[]>([]);

  useEffect(() => {
    setGuestCartItems(getGuestCart());
    const unsubscribe = subscribeGuestCart((items) => {
      setGuestCartItems(items);
    });
    return unsubscribe;
  }, []);

  const inCartItem = user
    ? (cartResponse?.data?.items || []).find(
        (c) => Number(c.id) === Number(product.id)
      )
    : guestCartItems.find(
        (c) => Number(c.productId) === Number(product.id)
      );
  const inCartQty = inCartItem?.quantity || null;

  const isWishlisted = Boolean(
    (wishlistData?.data || []).some(
      (w) => Number(w.id || w.product_id) === Number(product.id)
    )
  );

  const { data: availableOffers = [] } = useGetOffersQuery();
  const applicableOffers = getAllProductOffers(product, availableOffers);

  const handleToggleWishlist = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("sfc_open_login"));
      return;
    }
    try {
      const res = await toggleWishlist({
        productId: Number(product.id),
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

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Multi-image list resolution
  const productImages: string[] = React.useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(product?.images)) {
      list.push(...product.images);
    }
    if (product?.img && !list.includes(product.img)) {
      list.push(product.img);
    }
    if (product?.image && !list.includes(product.image)) {
      list.push(product.image);
    }
    const resolved = list
      .map((item) => (typeof item === "string" ? toAssetUrl(item) : ""))
      .filter(Boolean);
    return Array.from(new Set(resolved));
  }, [product]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image index when product changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  const activeImage = productImages[activeImageIndex] || productImages[0] || "";

  // Interactive zoom on hover (Flipkart desktop style)
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [descExpanded, setDescExpanded] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleMouseEnter = () => {
    setIsZoomed(true);
  };

  const handleMouseLeave = () => {
    setIsZoomed(false);
  };

  // Prev / Next Navigation
  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (productImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (productImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1));
  };

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diff = touchStartX.current - touchEndX.current;
      if (diff > 40) {
        handleNextImage();
      } else if (diff < -40) {
        handlePrevImage();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Lightbox Modal State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const handleOpenLightbox = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeImage) return;
    setIsLightboxOpen(true);
    setLightboxZoom(1);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxZoom(1);
  };

  // Lock scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseLightbox();
      if (e.key === "ArrowLeft") handlePrevImage();
      if (e.key === "ArrowRight") handleNextImage();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLightboxOpen, productImages.length]);

  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState<number>(1);

  const { data: reviewsResponse } = useGetProductReviewsQuery(
    {
      productId: product.id,
      page: 1,
      limit: 1,
    },
    { skip: !product.id }
  );

  const totalReviews = Number(
    reviewsResponse?.data?.summary?.totalReviews ??
      product.total_reviews ??
      0
  );
  const averageRating = Number(
    reviewsResponse?.data?.summary?.averageRating ??
      product.rating ??
      0
  );

  const getFlipkartRatingStyle = (r: number) => {
    if (r >= 4) return "bg-[#388e3c] text-white"; // Flipkart green
    if (r >= 3) return "bg-[#f5a623] text-white"; // Amber
    return "bg-[#e53935] text-white"; // Red
  };

  const getRatingSentiment = (avg: number) => {
    if (avg >= 4.5) return "Exceptional";
    if (avg >= 4.0) return "Very Good";
    if (avg >= 3.0) return "Good";
    if (avg >= 2.0) return "Fair";
    return "Poor";
  };

  function formatReviewDate(dateStr: string) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.add("revealed"));
  }, []);

  const isMadeToOrder = Boolean(
    product?.isMadeToOrder ||
    String(product?.availability_type || "").toUpperCase() === "MADE_TO_ORDER"
  );
  const isOutOfStock = !isMadeToOrder && Number(product?.stock) <= 0;

  function formatRupee(v: number) {
    return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  async function handleAdd() {
    if (isOutOfStock) {
      toast.error("Product is out of stock");
      return;
    }

    if (!user) {
      const res = addGuestCartItem(
        Number(product.id),
        qty,
        Number(product.stock),
        isMadeToOrder
      );
      if (res.success) {
        setAdded(true);
        toast.success("Added to cart");
        setTimeout(() => setAdded(false), 900);
      } else {
        toast.error(res.message || "This product is not available right now.");
      }
      return;
    }

    try {
      await addCartItem({
        productId: Number(product.id),
        quantity: qty,
      }).unwrap();
      setAdded(true);
      toast.success("Added to cart");
      setTimeout(() => setAdded(false), 900);
    } catch (err: any) {
      toast.error(err?.data?.message || "This product is not available right now.");
    }
  }

  async function changeQty(newQty: number) {
    if (!isMadeToOrder && newQty > Number(product.stock)) {
      toast.error(`Only ${product.stock} items available in stock`);
      return;
    }

    if (!user) {
      const res = updateGuestCartItemQty(
        Number(product.id),
        newQty,
        Number(product.stock),
        isMadeToOrder
      );
      if (res.success) {
        if (newQty === 0) {
          toast.success("Removed from cart");
        }
      } else {
        toast.error(res.message || "Failed to update quantity");
      }
      return;
    }

    try {
      await updateCartItem({
        productId: Number(product.id),
        quantity: newQty,
      }).unwrap();
      if (newQty === 0) {
        toast.success("Removed from cart");
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update quantity");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] pb-20">
      <div className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-xs md:px-8 min-w-0">
          <Link
            href="/menu"
            className="
              flex
              shrink-0
              items-center
              gap-1.5
              font-semibold
              text-[var(--color-text-muted)]
              transition-colors
              hover:text-[var(--color-primary)]
            "
          >
            <ArrowLeft size={14} />
            Menu
          </Link>

          <ChevronRight size={13} className="shrink-0 text-[var(--color-text-muted)]" />

          <span
            title={product.categoryName || product.category}
            className="truncate max-w-[120px] sm:max-w-[200px] shrink-0 font-bold capitalize text-[var(--color-text-secondary)]"
          >
            {product.categoryName || product.category}
          </span>

          <ChevronRight size={13} className="shrink-0 text-[var(--color-text-muted)]" />

          <span
            title={product.name}
            className="truncate min-w-0 flex-1 font-semibold text-[var(--color-text-primary)]"
          >
            {product.name}
          </span>
        </div>
      </div>
      <section className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div
          className="
            grid
            grid-cols-1
            gap-6
            lg:grid-cols-[1.05fr_0.95fr]
            lg:gap-10
          "
        >
          <div>
            {/* Unique Flipkart-style Product Images Gallery */}
            <div className="flex flex-col-reverse lg:flex-row gap-3.5 sm:gap-4 w-full">
              {/* Thumbnail Strip (Vertical rail on lg, horizontal row on mobile) */}
              {productImages.length > 1 && (
                <div
                  className="
                    flex lg:flex-col
                    gap-2.5 sm:gap-3
                    overflow-x-auto lg:overflow-y-auto
                    max-h-none lg:max-h-[520px]
                    py-1 lg:py-0
                    shrink-0
                    no-scrollbar
                  "
                  style={{scrollbarWidth:"none"}}
                >
                  {productImages.map((imgUrl, idx) => {
                    const isActive = idx === activeImageIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        onMouseEnter={() => setActiveImageIndex(idx)}
                        aria-label={`View product image ${idx + 1}`}
                        className={`
                          group relative h-16 w-16 sm:h-20 sm:w-20 lg:h-[76px] lg:w-[76px]
                          shrink-0 overflow-hidden rounded-2xl border-2 transition-all duration-200
                          ${
                            isActive
                              ? "border-[var(--color-primary)] shadow-md ring-2 ring-[var(--color-primary)]/30 scale-[1.03]"
                              : "border-[var(--color-border)] hover:border-stone-400 opacity-75 hover:opacity-100"
                          }
                        `}
                      >
                        <Image
                          src={imgUrl}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          fill
                          unoptimized
                          sizes="80px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {isActive && (
                          <span className="absolute bottom-1 right-1 flex h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] shadow ring-2 ring-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Main Image Display Stage */}
              <div className="relative flex-1 min-w-0">
                <div
                  className="
                    group relative
                    h-[340px] sm:h-[450px] lg:h-[520px]
                    w-full overflow-hidden
                    rounded-3xl border border-[var(--color-border)]
                    bg-white shadow-sm
                    cursor-crosshair
                  "
                  onMouseMove={handleMouseMove}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={handleOpenLightbox}
                >
                  {activeImage ? (
                    <div className="relative h-full w-full overflow-hidden">
                      <Image
                        ref={imgRef}
                        src={activeImage}
                        alt={product.name}
                        fill
                        priority
                        unoptimized
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        style={{
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                          transform: isZoomed ? "scale(1.1)" : "scale(1)",
                          transition: isZoomed ? "transform 0.08s ease-out" : "transform 0.3s ease-out",
                        }}
                        className="detail-img object-cover will-change-transform"
                      />
                    </div>
                  ) : (
                    <div className="h-full w-full bg-stone-100 flex items-center justify-center text-stone-400">
                      <span className="text-sm">No image available</span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />

                  {/* Left Top Badges */}
                  <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-secondary)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
                      <Flame size={13} />
                      Popular Choice
                    </div>
                    {productImages.length > 1 && (
                      <div className="hidden sm:flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white shadow">
                        <Camera size={11} />
                        <span>
                          {activeImageIndex + 1}/{productImages.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Top Buttons: Fullscreen Zoom & Favorites */}
                  <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                    {activeImage && (
                      <button
                        type="button"
                        onClick={handleOpenLightbox}
                        aria-label="View fullscreen image"
                        title="Expand image"
                        className="
                          flex h-11 w-11 items-center justify-center rounded-full
                          bg-white/95 text-stone-700 shadow-lg backdrop-blur-md
                          transition hover:scale-105 hover:text-[var(--color-primary)] active:scale-95
                        "
                      >
                        <Maximize2 size={18} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleWishlist();
                      }}
                      aria-label="Add to favorites"
                      className="
                        flex h-11 w-11 items-center justify-center rounded-full
                        bg-white/95 shadow-lg backdrop-blur-md
                        transition hover:scale-105 active:scale-95
                      "
                    >
                      <Heart
                        size={20}
                        className={
                          isWishlisted
                            ? "fill-red-500 text-red-500"
                            : "text-stone-600 hover:text-red-500"
                        }
                      />
                    </button>
                  </div>

                  {/* Carousel Prev/Next Arrows */}
                  {productImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevImage}
                        aria-label="Previous image"
                        className="
                          absolute left-3 top-1/2 -translate-y-1/2 z-20
                          flex h-10 w-10 items-center justify-center rounded-full
                          bg-white/90 text-stone-800 shadow-md backdrop-blur-sm
                          transition-all duration-200
                          hover:bg-white hover:scale-110 active:scale-90
                          opacity-80 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                        "
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextImage}
                        aria-label="Next image"
                        className="
                          absolute right-3 top-1/2 -translate-y-1/2 z-20
                          flex h-10 w-10 items-center justify-center rounded-full
                          bg-white/90 text-stone-800 shadow-md backdrop-blur-sm
                          transition-all duration-200
                          hover:bg-white hover:scale-110 active:scale-90
                          opacity-80 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                        "
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}

                  {/* Bottom Info Bar */}
                  <div className="absolute inset-x-4 bottom-3.5 z-20 flex items-center justify-between pointer-events-none">
                    <div className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold capitalize text-white shadow backdrop-blur-md">
                      {product.categoryName || product.category}
                    </div>

                    {productImages.length > 1 && (
                      <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-white shadow backdrop-blur-md sm:hidden">
                        <span className="text-[10px] font-bold">
                          {activeImageIndex + 1} / {productImages.length}
                        </span>
                      </div>
                    )}

                    <div className="hidden lg:flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-white/90 backdrop-blur-md">
                      <ZoomIn size={12} />
                      <span>Roll over to zoom</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Image info cards */}

       
          </div>

          <div className="flex flex-col">
            {/* Small label */}

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--color-secondary)]" />

              <span
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.2em]
                  text-[var(--color-secondary)]
                "
              >
                Freshly Prepared
              </span>
            </div>

            {/* Product title */}
            <h1
  className="
    mt-3
    text-3xl
    font-black
    leading-tight
    tracking-tight
    text-[var(--color-text-primary)]
    sm:text-4xl
    lg:text-5xl
    line-clamp-2
    overflow-hidden
  "
  style={{ maxWidth: "600px" }}
>
  {product.name}
</h1>

            {/* Dynamic Rating & Review Count (Flipkart Style) */}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("reviews-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="
                  group
                  flex
                  items-center
                  gap-2.5
                  transition
                  active:scale-95
                  text-left
                "
              >
                <div
                  className={`
                    flex
                    items-center
                    gap-1
                    rounded-md
                    px-2.5
                    py-1
                    text-xs
                    font-black
                    shadow-xs
                    ${totalReviews > 0
                      ? getFlipkartRatingStyle(averageRating)
                      : "bg-stone-500 text-white"
                    }
                  `}
                >
                  <span>
                    {totalReviews > 0 ? averageRating.toFixed(1) : "New"}
                  </span>
                  <Star
                    size={11}
                    fill="white"
                    className="text-white shrink-0"
                  />
                </div>

                <span className="text-xs font-bold text-[var(--color-primary)] group-hover:underline">
                  {totalReviews > 0
                    ? `${totalReviews.toLocaleString(
                      "en-IN"
                    )} Ratings & Reviews`
                    : "0 Ratings & Reviews"}
                </span>
              </button>

              <span className="text-xs text-[var(--color-text-muted)]">
                {totalReviews > 0
                  ? `· ${getRatingSentiment(
                    averageRating
                  )} choice by cafe guests`
                  : "· Be the first to review this dish"}
              </span>
            </div>

            {/* Price */}

            <div
              className="
                mt-6
                rounded-2xl
                border
                border-[var(--color-border)]
                bg-white
                p-4
                shadow-sm
              "
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Price
              </p>

              <div className="mt-1 flex items-end gap-2">
                <span
                  className="
                    text-3xl
                    font-black
                    text-[var(--color-primary)]
                  "
                >
                  ₹{formatRupee(product.price)}
                </span>

                <span className="pb-1 text-xs text-[var(--color-text-muted)]">
                  / item
                </span>
              </div>
            </div>

            {/* Applicable Offers */}
            {applicableOffers.length > 0 && (
              <div className="mt-4 space-y-2.5">
                {applicableOffers.map((offer: any, idx: number) => {
                  const isBogo = offer.type === "BOGO";
                  const isProductSpecific =
                    offer.is_product_specific ||
                    (Array.isArray(offer.target_product_ids) &&
                      offer.target_product_ids
                        .map(Number)
                        .includes(Number(product.id)));

                  return (
                    <div
                      key={offer.id || offer.code || idx}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 shadow-xs transition-all ${
                        isProductSpecific
                          ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/80 text-amber-950"
                          : "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                          isProductSpecific ? "bg-amber-500" : "bg-emerald-600"
                        }`}
                      >
                        <Gift size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p
                            className={`text-xs font-black uppercase tracking-wide ${
                              isProductSpecific
                                ? "text-amber-900"
                                : "text-emerald-900"
                            }`}
                          >
                            {isBogo
                              ? `Buy ${offer.buy_qty || 1} Get ${offer.get_qty || 1} Free Offer!`
                              : offer.title ||
                                (offer.discount_value
                                  ? `${offer.discount_value}% Off Special Offer`
                                  : "Special Offer")}
                          </p>
                          {offer.badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                                isProductSpecific
                                  ? "bg-amber-200 text-amber-900"
                                  : "bg-emerald-200 text-emerald-900"
                              }`}
                            >
                              {offer.badge}
                            </span>
                          )}
                          {isProductSpecific ? (
                            <span className="rounded-full bg-orange-200/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-orange-950">
                              Item Special
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-200/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-950">
                              Category Deal
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-1 text-[11px] leading-relaxed ${
                            isProductSpecific
                              ? "text-amber-800"
                              : "text-emerald-800"
                          }`}
                        >
                          {isBogo ? (
                            <>
                              Add {offer.buy_qty || 1} to your cart and automatically get{" "}
                              {offer.get_qty || 1} FREE at checkout
                              {offer.auto_apply ? "" : (
                                <>
                                  {" "}with promo code{" "}
                                  <strong className="rounded bg-white/90 px-1.5 py-0.5 font-black shadow-xs">
                                    {offer.code}
                                  </strong>
                                </>
                              )}
                              {" "}(Total {(offer.buy_qty || 1) + (offer.get_qty || 1)} items delivered, pay for only {offer.buy_qty || 1})!
                            </>
                          ) : (
                            <>
                              {offer.description || (
                                <>
                                  Use promo code{" "}
                                  <strong className="rounded bg-white/90 px-1.5 py-0.5 font-black shadow-xs">
                                    {offer.code}
                                  </strong>{" "}
                                  at checkout to save{" "}
                                  {offer.type === "PERCENTAGE"
                                    ? `${offer.discount_value}%`
                                    : `₹${offer.discount_value}`}
                                  {offer.min_order_amount > 0
                                    ? ` (min order ₹${offer.min_order_amount})`
                                    : ""}
                                  .
                                </>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Description */}
            {(() => {
              const desc = product.description ||
                "Delicious and freshly prepared at SFC Bakers with quality ingredients for a great taste in every bite.";
              return (
                <div className="mt-6">
                  <h2 className="text-sm font-black text-[var(--color-text-primary)]">
                    About this item
                  </h2>
                  <p
                    className={`mt-2 text-sm leading-7 text-[var(--color-text-secondary)] break-words [overflow-wrap:anywhere] transition-all duration-300 ${
                      descExpanded ? "" : "line-clamp-4"
                    }`}
                  >
                    {desc}
                  </p>
                  {desc.length > 200 && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((p) => !p)}
                      className="mt-1 text-xs font-bold text-[var(--color-primary)] hover:underline"
                    >
                      {descExpanded ? "Show Less ↑" : "Read More ↓"}
                    </button>
                  )}
                </div>
              );
            })()}


            {/* Product highlights */}

            <div className="mt-6 grid grid-cols-2 gap-2">
              <div
                className="
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-[var(--color-border)]
                  bg-white
                  p-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--color-primary-50)]
                    text-[var(--color-primary)]
                  "
                >
                  <Utensils size={17} />
                </div>

                <div>
                  <p className="text-[10px] font-black text-[var(--color-text-primary)]">
                    Freshly Made
                  </p>

                  <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">
                    Prepared on order
                  </p>
                </div>
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-[var(--color-border)]
                  bg-white
                  p-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--color-primary-50)]
                    text-[var(--color-primary)]
                  "
                >
                  <Clock3 size={17} />
                </div>

                <div>
                  <p className="text-[10px] font-black text-[var(--color-text-primary)]">
                    Quick Service
                  </p>

                  <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">
                    Fresh & ready fast
                  </p>
                </div>
              </div>
            </div>
            <div
              className="
                mt-7
                rounded-3xl
                border
                border-[var(--color-border)]
                bg-white
                p-4
                shadow-sm
                sm:p-5
              "
            >
              {!isOutOfStock && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-[var(--color-text-primary)]">
                      Quantity
                    </p>

                    <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                      Choose how many you want
                    </p>
                  </div>

                  {/* Quantity */}

                  {inCartQty ? (
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className="
                          flex
                          items-center
                          gap-1
                          rounded-full
                          bg-[var(--color-primary-50)]
                          p-1
                          ring-1
                          ring-[var(--color-primary)]/10
                        "
                      >
                        <button
                          type="button"
                          onClick={() => changeQty(Math.max(0, inCartQty - 1))}
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            bg-white
                            text-[var(--color-primary)]
                            shadow-sm
                            transition
                            active:scale-90
                          "
                        >
                          <Minus size={15} strokeWidth={3} />
                        </button>

                        <span
                          className="
                            min-w-[34px]
                            text-center
                            text-sm
                            font-black
                            text-[var(--color-primary)]
                          "
                        >
                          {inCartQty}
                        </span>

                        <button
                          type="button"
                          title={
                            product.availability_type !== "MADE_TO_ORDER" &&
                              inCartQty >= Number(product.stock)
                              ? `Only ${product.stock} items available in stock`
                              : "Increase quantity"
                          }
                          disabled={
                            product.availability_type !== "MADE_TO_ORDER" &&
                            inCartQty >= Number(product.stock)
                          }
                          onClick={() => changeQty(inCartQty + 1)}
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            bg-[var(--color-primary)]
                            text-white
                            shadow-sm
                            transition
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                            active:scale-90
                          "
                        >
                          <Plus size={15} strokeWidth={3} />
                        </button>
                      </div>

                      { inCartQty >= Number(product.stock) ? (
                        <span className="text-[10px] font-bold text-amber-600">
                          Max stock ({product.stock}) reached
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className="
                          flex
                          items-center
                          gap-1
                          rounded-full
                          bg-[var(--color-primary-50)]
                          p-1
                        "
                      >
                        <button
                          type="button"
                          onClick={() => setQty(Math.max(1, qty - 1))}
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            bg-white
                            text-[var(--color-primary)]
                            shadow-sm
                            transition
                            active:scale-90
                          "
                        >
                          <Minus size={15} strokeWidth={3} />
                        </button>

                        <span
                          className="
                            min-w-[34px]
                            text-center
                            text-sm
                            font-black
                            text-[var(--color-primary)]
                          "
                        >
                          {qty}
                        </span>

                        <button
                          type="button"
                          title={
                            product.availability_type !== "MADE_TO_ORDER" &&
                              qty >= Number(product.stock)
                              ? `Only ${product.stock} items available in stock`
                              : "Increase quantity"
                          }
                          disabled={
                            product.availability_type !== "MADE_TO_ORDER" &&
                            qty >= Number(product.stock)
                          }
                          onClick={() => setQty(qty + 1)}
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            bg-[var(--color-primary)]
                            text-white
                            shadow-sm
                            transition
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                            active:scale-90
                          "
                        >
                          <Plus size={15} strokeWidth={3} />
                        </button>
                      </div>

                      {product.availability_type === "MADE_TO_ORDER" ? (
                        <span className="text-[10px] font-bold text-orange-600">
                          Cooked on demand
                        </span>
                      ) : Number(product.stock) <= 5 &&
                        Number(product.stock) > 0 ? (
                        <span className="text-[10px] font-bold text-amber-600">
                          Only {product.stock} left in stock
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAdd}
                className={`
                    ${!isOutOfStock ? "mt-4" : ""}
                    flex
                    h-14
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    px-5
                    text-sm
                    font-black
                    text-white
                    shadow-lg
                    transition-all
                    duration-200
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    ${added
                    ? "bg-[var(--color-success)]"
                    : isOutOfStock
                      ? "bg-stone-400"
                      : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
                  }
                  `}
              >
                {added ? (
                  <>
                    <Check size={19} strokeWidth={3} />
                    Added to Cart
                  </>
                ) : isOutOfStock ? (
                  <span>Out of Stock</span>
                ) : (
                  <>
                    <ShoppingBag size={19} strokeWidth={2.5} />
                    Add {qty > 1 ? `${qty} ` : ""}to Cart
                  </>
                )}
              </button>
            </div>

            {/* Delivery info */}

            <div
              className="
                mt-3
                flex
                items-center
                gap-3
                rounded-2xl
                border
                border-[var(--color-border)]
                bg-[var(--color-primary-50)]
                p-4
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-white
                  text-[var(--color-primary)]
                  shadow-sm
                "
              >
                <Truck size={18} />
              </div>

              <div>
                <p className="text-xs font-black text-[var(--color-text-primary)]">
                  Freshness you can taste
                </p>

                <p className="mt-0.5 text-[10px] leading-4 text-[var(--color-text-secondary)]">
                  Your order is prepared fresh and packed carefully.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 lg:block hidden md:px-8 md:py-10">
        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* About */}

            <div className="
                rounded-3xl
                border
                border-[var(--color-border)]
                bg-white
                p-4
                shadow-sm
                sm:p-5
              ">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--color-primary-50)]
                    text-[var(--color-primary)]
                  "
                >
                  <Utensils size={17} />
                </div>

                <h2 className="text-sm font-black text-[var(--color-text-primary)]">
                  Made With Care
                </h2>
              </div>

              <p className="text-xs leading-6 text-[var(--color-text-secondary)]">
                Every item is prepared with attention to taste, freshness and
                quality so you can enjoy your food just the way it should be.
              </p>
            </div>

            {/* Quality */}

            <div className="
                rounded-3xl
                border
                border-[var(--color-border)]
                bg-white
                p-4
                shadow-sm
                sm:p-5
              ">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--color-primary-50)]
                    text-[var(--color-primary)]
                  "
                >
                  <Star size={17} fill="currentColor" />
                </div>

                <h2 className="text-sm font-black text-[var(--color-text-primary)]">
                  Customer Favorite
                </h2>
              </div>

              <p className="text-xs leading-6 text-[var(--color-text-secondary)]">
                Loved by customers for its delicious taste, fresh preparation
                and satisfying experience.
              </p>
            </div>

            {/* Fresh */}

            <div className="
                rounded-3xl
                border
                border-[var(--color-border)]
                bg-white
                p-4
                shadow-sm
                sm:p-5
              ">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--color-primary-50)]
                    text-[var(--color-primary)]
                  "
                >
                  <Flame size={17} />
                </div>

                <h2 className="text-sm font-black text-[var(--color-text-primary)]">
                  Fresh & Delicious
                </h2>
              </div>

              <p className="text-xs leading-6 text-[var(--color-text-secondary)]">
                Prepared fresh to deliver the best possible flavor and quality
                with every order.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Products */}
      <SimilarProductsSection
        currentProductId={product.id}
        categoryId={product.category_id || product.category}
        categoryName={product.categoryName || product.category_name}
        currentProductName={product.name}
      />

      {/* Ratings & Reviews */}
      <RatingsAndReviewsSection
        productId={product.id}
        productName={product.name}
      />

      {/* Pair It With - More from Category */}
      <PairItWithSection
        currentProductId={product.id}
        categoryId={product.category_id || product.category}
        categoryName={product.categoryName || product.category_name}
      />

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <div
          className="
            relative
            overflow-hidden
            rounded-3xl
            bg-[var(--color-primary-dark)]
            px-5
            py-8
            shadow-xl
            md:px-10
            md:py-10
          "
        >
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                Still hungry?
              </p>

              <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
                Explore more delicious food
              </h2>

              <p className="mt-2 text-xs text-white/60">
                Discover more favorites from our menu.
              </p>
            </div>

            <Link
              href="/menu"
              className="
                inline-flex
                h-12
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-white
                px-5
                text-xs
                font-black
                text-[var(--color-primary-dark)]
                shadow-lg
                transition
                hover:-translate-y-0.5
                active:scale-95
              "
            >
              Explore Menu
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[120] flex flex-col items-center justify-between bg-black/95 backdrop-blur-md p-4 sm:p-6 select-none"
          onClick={handleCloseLightbox}
        >
          {/* Top Bar */}
          <div
            className="flex w-full max-w-6xl items-center justify-between text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-md">
                {product.name}
              </span>
              {productImages.length > 1 && (
                <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-medium text-stone-300">
                  {activeImageIndex + 1} of {productImages.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.min(z + 0.5, 3))}
                title="Zoom In"
                aria-label="Zoom in"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
              >
                <ZoomIn size={18} />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.max(z - 0.5, 1))}
                title="Zoom Out"
                aria-label="Zoom out"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                title="Reset Zoom"
                aria-label="Reset zoom"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
              >
                <RotateCcw size={16} />
              </button>
              {/* Close */}
              <button
                type="button"
                onClick={handleCloseLightbox}
                title="Close (Esc)"
                aria-label="Close fullscreen"
                className="ml-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Center High-Res Stage */}
          <div
            className="relative flex-1 flex items-center justify-center w-full max-w-6xl my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {productImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrevImage}
                aria-label="Previous image"
                className="absolute left-2 sm:left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition hover:scale-110 active:scale-95"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            <div
              className="relative max-h-[75vh] max-w-[85vw] w-full h-[65vh] flex items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${lightboxZoom})` }}
            >
              <Image
                src={activeImage}
                alt={product.name}
                fill
                unoptimized
                sizes="90vw"
                className="object-contain select-none"
              />
            </div>

            {productImages.length > 1 && (
              <button
                type="button"
                onClick={handleNextImage}
                aria-label="Next image"
                className="absolute right-2 sm:right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition hover:scale-110 active:scale-95"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Rail */}
          {productImages.length > 1 && (
            <div
              className="flex items-center gap-2.5 overflow-x-auto max-w-2xl px-4 py-2 bg-black/60 rounded-2xl backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {productImages.map((imgUrl, idx) => {
                const isActive = idx === activeImageIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setLightboxZoom(1);
                    }}
                    aria-label={`Switch to image ${idx + 1}`}
                    className={`
                      relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl overflow-hidden border-2 transition
                      ${
                        isActive
                          ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/40 scale-105"
                          : "border-white/30 opacity-60 hover:opacity-100"
                      }
                    `}
                  >
                    <Image
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
