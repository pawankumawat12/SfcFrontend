"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ChevronRight,
  Flame,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Utensils,
  Gift,
  Leaf,
  Zap,
  Search,
  X,
} from "lucide-react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import ReelsSlider from "./ReelsSlider";

import {
  useGetStoreCategoriesQuery,
  useGetStoreProductsQuery,
} from "../redux/services/catalogApi";
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

interface Category {
  id: string;
  name: string;
  img: string;
}

function formatRupee(v: number) {
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

const EMPTY_CATEGORIES: never[] = [];
const EMPTY_PRODUCTS: never[] = [];

export default function Menu() {
  const user = useSelector(
    (state: { auth: { user: any | null } }) => state.auth.user
  );
  const searchParams = useSearchParams();
  const urlStoreId =
    searchParams?.get("store_id") || searchParams?.get("storeId");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Search and Dietary filter states
  const [searchQuery, setSearchQuery] = useState<string>("");


  useEffect(() => {
    if (urlStoreId) {
      setSelectedStoreId(urlStoreId);
      try {
        localStorage.setItem("sfc_selected_store_id", urlStoreId);
      } catch {}
    } else {
      try {
        const saved = localStorage.getItem("sfc_selected_store_id");
        if (saved) setSelectedStoreId(saved);
      } catch {}
    }

    const handleLocationChange = (e: Event) => {
      const loc = (e as CustomEvent).detail;
      if (loc && loc.storeId != null) {
        setSelectedStoreId(String(loc.storeId));
      } else {
        setSelectedStoreId(null);
      }
    };
    window.addEventListener(
      "sfc_delivery_location_changed",
      handleLocationChange
    );
    return () => {
      window.removeEventListener(
        "sfc_delivery_location_changed",
        handleLocationChange
      );
    };
  }, [urlStoreId]);

  const categoryQuery = useMemo(() => {
    return selectedStoreId ? { store_id: selectedStoreId } : {};
  }, [selectedStoreId]);

  const { data: categoryResponse, isLoading: isCategoriesLoading } =
    useGetStoreCategoriesQuery(categoryQuery);
  const [selected, setSelected] = useState<string>("all");

  useEffect(() => {
    setSelected("all");
  }, [selectedStoreId]);
  const productQuery = useMemo(
    () => ({
      ...(selected === "all" ? {} : { categoryId: selected }),
      ...(selectedStoreId ? { store_id: selectedStoreId } : {}),
    }),
    [selected, selectedStoreId]
  );
  const {
    data: productResponse,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
  } = useGetStoreProductsQuery(productQuery);
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
  const inFlightQtyRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    setGuestCartItems(getGuestCart());
    const unsubscribe = subscribeGuestCart((items) => {
      setGuestCartItems(items);
    });
    return unsubscribe;
  }, []);

  const cartItemsMap = useMemo(() => {
    if (user) {
      return new Map(
        (cartResponse?.data?.items || []).map((it) => [
          Number(it.id),
          it.quantity,
        ])
      );
    }
    return new Map(
      guestCartItems.map((it) => [Number(it.productId), it.quantity])
    );
  }, [user, cartResponse, guestCartItems]);

  const guestSummary = useMemo(() => {
    const totalItems = guestCartItems.reduce((sum, it) => sum + it.quantity, 0);
    const allProducts = productResponse?.data || [];
    const grandTotal = guestCartItems.reduce((sum, it) => {
      const prod = allProducts.find(
        (p: any) => Number(p.id) === Number(it.productId)
      );
      return sum + (prod ? Number(prod.price) * it.quantity : 0);
    }, 0);
    return { totalItems, grandTotal };
  }, [guestCartItems, productResponse]);

  const cartSummary = user
    ? cartResponse?.data?.summary || { totalItems: 0, grandTotal: 0 }
    : guestSummary;

  const { data: offersData = [] } = useGetOffersQuery();
  const bogoOffersMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const offer of offersData || []) {
      if (
        offer.is_active &&
        offer.type === "BOGO" &&
        Array.isArray(offer.target_product_ids)
      ) {
        for (const pId of offer.target_product_ids) {
          map.set(Number(pId), offer);
        }
      }
    }
    return map;
  }, [offersData]);

  const wishlistedIds = useMemo(
    () =>
      new Set(
        (wishlistData?.data || []).map((w) => Number(w.id || w.product_id))
      ),
    [wishlistData]
  );

  const handleToggleWishlist = async (
    productId: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.dispatchEvent(new CustomEvent("sfc_open_login"));
      return;
    }
    try {
      const res = await toggleWishlist({ productId }).unwrap();
      if (res.inWishlist) {
        toast.success("Added to favorites");
      } else {
        toast.success("Removed from favorites");
      }
    } catch {
      toast.error("Failed to update favorites");
    }
  };

  const handleAddToCart = async (
    productId: number,
    stock: number,
    isMadeToOrder?: boolean
  ) => {
    if (!isMadeToOrder && stock <= 0) {
      toast.error("Product is out of stock");
      return;
    }

    if (!user) {
      const res = addGuestCartItem(productId, 1, stock, isMadeToOrder);
      if (res.success) {
        toast.success("Added to cart");
      } else {
        toast.error(res.message || "Could not add to cart");
      }
      return;
    }

    try {
      await addCartItem({ productId, quantity: 1 }).unwrap();
      toast.success("Added to cart");
    } catch (err: any) {
      toast.error(
        err?.data?.message || "This product is not available right now."
      );
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

  const categories = categoryResponse?.data || EMPTY_CATEGORIES;
  const products = productResponse?.data || EMPTY_PRODUCTS;
  const [page, setPage] = useState<number>(1);

  const pageSize = 8;

  const gridRef = useRef<HTMLDivElement | null>(null);

  // Filter products by category, search query, and dietary preference
  const visibleProducts = useMemo(() => {
    return products.filter((p: any) => {
      // 1. Dietary filter
      

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (p.name || "").toLowerCase().includes(q);
        const descMatch = (p.description || "").toLowerCase().includes(q);
        const catMatch = (p.category_name || p.categoryName || "")
          .toLowerCase()
          .includes(q);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [products,  searchQuery]);

  // pagination via infinite scroll
  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [selected, searchQuery]);

  useEffect(() => {
    const cat = searchParams?.get("category");

    if (cat && categories.find((c) => c.id === cat)) {
      setSelected(cat);
    } else {
      setSelected("all");
    }
    setPage(1);
  }, [searchParams, categories]);

  const pagedProducts = useMemo(() => {
    return visibleProducts.slice(0, page * pageSize);
  }, [visibleProducts, page]);

  // Smooth scroll to grid when selecting category
  function selectCategory(id: string) {
    setSelected(id);
    setPage(1);

    setTimeout(() => {
      gridRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  // IntersectionObserver to add 'product-seen' when entering viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("product-seen");
          }
        });
      },
      {
        threshold: 0.18,
      }
    );

    const grid = gridRef.current;

    if (!grid) return;

    const items = grid.querySelectorAll(".product-card");

    items.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
    // Re-run after the API response adds product cards to the DOM. Previously this
    // ran before the first response arrived, so the cards kept their hidden
    // pre-animation state until a category/page change.
  }, [pagedProducts]);

  // sentinel for infinite loading
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;

    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && page < totalPages) {
            setPage((p) => Math.min(totalPages, p + 1));
          }
        });
      },
      {
        root: null,
        rootMargin: "200px",
      }
    );

    obs.observe(el);

    return () => obs.disconnect();
  }, [page, totalPages, selected]);

  const selectedCategoryName =
    selected === "all"
      ? "All Items"
      : categories.find((c) => c.id === selected)?.name || "Menu";

  return (
    <main className="min-h-screen bg-[var(--bg-body)]">
      <section className="relative overflow-hidden bg-[var(--color-primary-dark)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-[var(--color-secondary)]/10" />
        <div className="pointer-events-none absolute right-[20%] top-1/2 h-20 w-20 rounded-full bg-white/[0.03]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
          <div className="max-w-3xl">
            <div
              className="
                mb-5
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-white/10
                bg-white/10
                px-3
                py-1.5
                backdrop-blur-md
              "
            >
              <Utensils
                size={14}
                className="text-[var(--color-primary-light)]"
              />

              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                Fresh • Fast • Delicious
              </span>
            </div>

            {/* Heading */}

            <h1
              className="
                text-4xl
                font-black
                tracking-tight
                text-white
                md:text-5xl
                lg:text-6xl
              "
            >
              Our Menu
            </h1>

            <p
              className="
                mt-3
                max-w-2xl
                text-sm
                leading-6
                text-white/65
                md:text-base
              "
            >
              Explore our freshly prepared favorites, made with quality
              ingredients and served with great taste.
            </p>
          </div>

          {/* Hero quick stats */}

          <div className="mt-8 flex flex-wrap gap-2">
            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Utensils size={13} /> Freshly Prepared
              </span>
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Zap size={13} /> Quick Service
              </span>
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Heart size={13} /> Customer Favorites
              </span>
            </div>
          </div>
        </div>
      </section>
      <section
        className="
          sticky
          top-0
          z-40
          border-b
          border-[var(--color-border)]
          bg-[var(--bg-body)]/95
          backdrop-blur-xl
        "
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          {/* Top Bar: Live Search & Dietary Filters */}
          <div className="pt-3.5 pb-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-[var(--color-border)]/50">
            {/* Live Search Bar */}
            <div className="relative flex-1 max-w-lg">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cakes, burgers, pizzas, snacks, pastries..."
                className="w-full h-10 pl-10 pr-9 rounded-2xl border border-[var(--color-border)] bg-[var(--bg-surface)] text-xs sm:text-sm font-medium text-[var(--color-text-primary)] placeholder-stone-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 shadow-2xs transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          <div
            className="
            flex
            gap-2
            overflow-x-auto
            scroll-smooth
            snap-x
            snap-mandatory
            py-3
            scrollbar-x
            "
          >
            {/* ALL */}

            <button
              type="button"
              onClick={() => selectCategory("all")}
              className={`
                flex
                h-11
                shrink-0
                snap-start
                items-center
                gap-2
                rounded-full
                px-5
                text-xs
                font-black
                transition-all
                duration-200
                active:scale-95
                ${
                  selected === "all"
                    ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20"
                    : "border border-[var(--color-border)] bg-[var(--bg-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }
              `}
            >
              <Utensils size={15} />
              All
            </button>

            {/* CATEGORIES */}
            {isCategoriesLoading ? (
              <SkeletonLoader variant="category" count={8} />
            ) : (
              categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCategory(c.id)}
                  className={`
                    group
                    flex
                    h-11
                    min-w-[120px]
                    shrink-0
                    snap-start
                    items-center
                    gap-2
                    overflow-hidden
                    rounded-full
                    px-2
                    pr-4
                    text-xs
                    font-bold
                    transition-all
                    duration-200
                    active:scale-95
                    ${
                      selected === c.id
                        ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20"
                        : "border border-[var(--color-border)] bg-[var(--bg-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }
                  `}
                >
                  {c.img ? (
                    <Image
                      src={c.img}
                      alt={c.name}
                      width={36}
                      height={36}
                      unoptimized
                      className="
                        h-9
                        w-9
                        rounded-full
                        object-cover
                        transition-transform
                        duration-300
                        group-hover:scale-110
                      "
                    />
                  ) : null}

                  <span>{c.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <div
        ref={gridRef}
        className="mx-auto max-w-7xl scroll-mt-20 px-4 md:px-8"
      >
        <section className="py-7 md:py-9">
          <div
            className="
              grid
              grid-cols-3
              gap-2
              rounded-2xl
              border
              border-[var(--color-border)]
              bg-[var(--bg-surface)]
              p-2
              shadow-sm
              md:gap-3
              md:p-3
            "
          >
            <div
              className="
                rounded-xl
                bg-[var(--color-primary-50)]
                px-2
                py-3
                text-center
                md:py-4
              "
            >
              <div className="flex justify-center text-lg md:text-xl text-[var(--color-primary)]">
                <Leaf size={22} />
              </div>

              <p className="mt-1 text-[9px] font-black text-[var(--color-text-secondary)] sm:text-[10px]">
                Fresh Ingredients
              </p>
            </div>

            <div
              className="
                rounded-xl
                bg-[var(--color-primary-50)]
                px-2
                py-3
                text-center
                md:py-4
              "
            >
              <div className="flex justify-center text-lg md:text-xl text-[var(--color-secondary)]">
                <Zap size={22} />
              </div>

              <p className="mt-1 text-[9px] font-black text-[var(--color-text-secondary)] sm:text-[10px]">
                Quick Preparation
              </p>
            </div>

            <div
              className="
                rounded-xl
                bg-[var(--color-primary-50)]
                px-2
                py-3
                text-center
                md:py-4
              "
            >
              <div className="flex justify-center text-lg md:text-xl text-rose-500">
                <Heart size={22} />
              </div>

              <p className="mt-1 text-[9px] font-black text-[var(--color-text-secondary)] sm:text-[10px]">
                Made With Care
              </p>
            </div>
          </div>
        </section>

        <section className="pb-5">
          <div className="flex items-end justify-between gap-4">
            <div>
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

              <h2
                className="
                  mt-2
                  text-2xl
                  font-black
                  tracking-tight
                  text-[var(--color-text-primary)]
                  md:text-3xl
                "
              >
                {selectedCategoryName}
              </h2>

              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {visibleProducts.length} delicious items
              </p>
            </div>

            <div
              className="
                hidden
                items-center
                gap-2
                rounded-full
                border
                border-[var(--color-border)]
                bg-[var(--bg-surface)]
                px-4
                py-2
                text-xs
                font-bold
                text-[var(--color-text-secondary)]
                shadow-sm
                sm:flex
              "
            >
              <Flame size={15} className="text-[var(--color-secondary)]" />
              Customer Favorites
            </div>
          </div>
        </section>
        <section>
          {isProductsLoading ? (
            <SkeletonLoader
              variant="product"
              count={8}
              gridClassName="grid grid-cols-2 gap-3 pb-8 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
            />
          ) : visibleProducts.length === 0 ? (
            <div className="my-6 flex flex-col items-center justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--bg-surface)] px-4 py-16 text-center shadow-xs">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                {searchQuery ? <Search size={28} /> : <ShoppingBag size={28} />}
              </div>
              <h3 className="text-lg font-black text-[var(--color-text-primary)]">
                {searchQuery
                  ? "No matching items found"
                  : "No items in this category yet"}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">
                {searchQuery
                  ? `No dishes found matching "${searchQuery}". Try searching another name.`
                  : "We are freshly baking and preparing delicious treats. Please choose another category or check back soon!"}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-dark)] cursor-pointer"
                >
                  Clear Search <ArrowRight size={14} />
                </button>
              )}
              {selected !== "all" && !searchQuery && (
                <button
                  type="button"
                  onClick={() => setSelected("all")}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-primary-dark)]"
                >
                  View All Products <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <div
              className="
                grid
                grid-cols-2
                gap-3
                pb-8
                sm:grid-cols-2
                sm:gap-5
                md:grid-cols-3
                lg:grid-cols-4
              "
            >
              {pagedProducts.map((p, index) => {
                const inCartQty = cartItemsMap.get(Number(p.id)) || 0;
                const inCart = inCartQty > 0;
                const isMadeToOrder = Boolean(
                  p.isMadeToOrder ||
                    String(p.availability_type || "").toUpperCase() ===
                      "MADE_TO_ORDER"
                );
                const outOfStock = !isMadeToOrder && Number(p.stock) <= 0;

                return (
                  <article
                    key={p.id}
                    className="
                    product-card
                    group
                    flex
                    flex-col
                    justify-between
                    h-full
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[var(--color-border)]
                    bg-[var(--bg-surface)]
                    shadow-xs
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:shadow-lg
                  "
                  >
                    <div className="relative aspect-square sm:aspect-[4/3] w-full overflow-hidden bg-[var(--bg-muted)]">
                      <Link
                        href={`/product/${p.id}`}
                        className="relative block h-full w-full overflow-hidden"
                      >
                        {p.img ? (
                          <Image
                            src={p.img}
                            alt={p.name}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
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
                      </Link>

                      {/* Image gradient */}

                      <div
                        className="
                        pointer-events-none
                        absolute
                        inset-x-0
                        bottom-0
                        h-20
                        bg-gradient-to-t
                        from-black/35
                        to-transparent
                      "
                      />

                      {/* Popular */}

                      {index < 2 && (
                        <div
                          className="
                          absolute
                          left-2
                          top-2
                          flex
                          items-center
                          gap-1
                          rounded-full
                          bg-[var(--color-secondary)]
                          px-2.5
                          py-1
                          text-[9px]
                          font-black
                          uppercase
                          text-white
                          shadow-lg
                        "
                        >
                          <Flame size={11} />
                          Popular
                        </div>
                      )}

                      {/* Applicable Offer Badge */}
                      {(() => {
                        const offer = getProductPrimaryOffer(p, offersData);
                        if (!offer) return null;
                        const badgeText = formatOfferBadge(offer);
                        const isProductSpecific =
                          offer.is_product_specific ||
                          (Array.isArray(offer.target_product_ids) &&
                            offer.target_product_ids
                              .map(Number)
                              .includes(Number(p.id)));

                        return (
                          <div
                            className={`absolute left-2 bottom-2 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wide text-white shadow-md backdrop-blur-xs ${
                              isProductSpecific
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                            }`}
                          >
                            <Gift size={10} />
                            {badgeText}
                          </div>
                        );
                      })()}

                      {/* Wishlist Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleWishlist(p.id, e)}
                        aria-label="Save to favorites"
                        className="
                        absolute
                        right-2
                        top-2
                        z-20
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-full
                        bg-[var(--bg-surface)]/95
                        shadow-md
                        backdrop-blur-md
                        transition
                        hover:scale-110
                        active:scale-95
                      "
                      >
                        <Heart
                          size={15}
                          className={
                            wishlistedIds.has(p.id)
                              ? "fill-red-500 text-red-500"
                              : "text-stone-600 hover:text-red-400"
                          }
                        />
                      </button>

                      {/* Category */}
                      <div
                        className="
                        absolute
                        left-2
                        bottom-2
                        max-w-[65%]
                        truncate
                        rounded-full
                        bg-black/50
                        px-2.5
                        py-0.5
                        text-[9px]
                        font-bold
                        capitalize
                        text-white
                        backdrop-blur-md
                      "
                        title={p.categoryName}
                      >
                        {p.categoryName}
                      </div>
                    </div>

                    {/* =================================================
                      PRODUCT INFO
                  ================================================= */}

                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <Link href={`/product/${p.id}`} className="block">
                          <div className="flex items-center gap-1.5 min-w-0">
                     
                            <h3
                              className="
                              line-clamp-1
                              text-xs
                              font-black
                              text-[var(--color-text-primary)]
                              transition-colors
                              group-hover:text-[var(--color-primary)]
                              sm:text-base
                              break-words
                            "
                              title={p.name}
                            >
                              {p.name}
                            </h3>
                          </div>

                          <p
                            className="
                            mt-1
                            line-clamp-2
                            min-h-[28px]
                            sm:min-h-[32px]
                            text-[10px]
                            leading-3.5
                            sm:leading-4
                            text-[var(--color-text-muted)]
                            sm:text-xs
                            break-words
                          "
                            title={
                              p.description || `Handcrafted — ${p.categoryName}`
                            }
                          >
                            {p.description || `Handcrafted — ${p.categoryName}`}
                          </p>
                        </Link>

                        {/* Dynamic Rating & Review Count */}

                        <div className="mt-2.5 flex items-center gap-1.5">
                          <div
                            className="
                            flex
                            items-center
                            gap-1
                            rounded-full
                            bg-[var(--color-star)]/10
                            px-2
                            py-0.5
                          "
                          >
                            <Star
                              size={10}
                              fill="currentColor"
                              className="text-[var(--color-star)]"
                            />

                            <span className="text-[10px] font-black text-[var(--color-text-primary)]">
                              {Number(p.total_reviews || 0) > 0 &&
                              Number(p.rating || 0) > 0
                                ? Number(p.rating).toFixed(1)
                                : "New"}
                            </span>
                          </div>

                          <span className="text-[9px] sm:text-[10px] font-medium text-[var(--color-text-muted)]">
                            ({Number(p.total_reviews || 0)})
                          </span>
                        </div>
                      </div>

                      {/* Price + Cart */}

                      <div className="mt-3 sm:mt-4">
                        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)]/50 pt-2.5">
                          <div>
                            <p className="text-[8px] sm:text-[9px] font-medium text-[var(--color-text-muted)]">
                              Price
                            </p>

                            <div className="text-sm font-black text-[var(--color-text-primary)] sm:text-base">
                              ₹{formatRupee(p.price)}
                            </div>
                          </div>

                          {/* =================================================
                          AUTHENTICATED CART CONTROLS
                      ================================================= */}

                          {inCart ? (
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
                                  aria-label="Decrease quantity"
                                  onClick={() =>
                                    handleChangeQty(
                                      p.id,
                                      inCartQty - 1,
                                      Number(p.stock),
                                      isMadeToOrder
                                    )
                                  }
                                  className="
                                flex
                                h-7
                                w-7
                                items-center
                                justify-center
                                rounded-full
                                bg-[var(--bg-surface)]
                                text-[var(--color-primary)]
                                shadow-sm
                                transition
                                active:scale-90
                              "
                                >
                                  <Minus size={13} strokeWidth={3} />
                                </button>

                                <div
                                  className="
                                min-w-[22px]
                                text-center
                                text-xs
                                font-black
                                text-[var(--color-primary)]
                              "
                                >
                                  {inCartQty}
                                </div>

                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  title={
                                    !isMadeToOrder &&
                                    inCartQty >= Number(p.stock)
                                      ? `Only ${p.stock} items available in stock`
                                      : "Increase quantity"
                                  }
                                  disabled={
                                    !isMadeToOrder &&
                                    inCartQty >= Number(p.stock)
                                  }
                                  onClick={() =>
                                    handleChangeQty(
                                      p.id,
                                      inCartQty + 1,
                                      Number(p.stock),
                                      isMadeToOrder
                                    )
                                  }
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
                                disabled:cursor-not-allowed
                                disabled:opacity-40
                                active:scale-90
                              "
                                >
                                  <Plus size={13} strokeWidth={3} />
                                </button>
                              </div>

                              {!isMadeToOrder &&
                                inCartQty >= Number(p.stock) && (
                                  <span className="text-[9px] font-bold text-amber-600">
                                    Max ({p.stock})
                                  </span>
                                )}
                              {/* {isMadeToOrder && (
                            <span className="text-[9px] font-bold text-orange-600">
                              Fresh Order
                            </span>
                          )} */}
                            </div>
                          ) : outOfStock ? (
                            <span className="rounded-full bg-[var(--color-text-muted)] px-3.5 py-2 text-[10px] font-black text-white">
                              Out of stock
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleAddToCart(
                                  p.id,
                                  Number(p.stock),
                                  isMadeToOrder
                                )
                              }
                              className="
                            flex
                            h-9
                            items-center
                            gap-1.5
                            rounded-full
                            bg-[var(--color-primary)]
                            px-3.5
                            text-[10px]
                            font-black
                            text-white
                            shadow-md
                            shadow-[var(--color-primary)]/20
                            transition-all
                            duration-200
                            hover:bg-[var(--color-primary-dark)]
                            hover:shadow-lg
                            active:scale-90
                            sm:px-4
                            sm:text-xs
                          "
                            >
                              <Plus size={14} strokeWidth={3} />
                              Add
                            </button>
                          )}
                        </div>

                        {/* Details */}

                        <Link
                          href={`/product/${p.id}`}
                          className="
                        mt-3
                        flex
                        items-center
                        justify-between
                        border-t
                        border-[var(--color-border)]
                        pt-3
                        text-[10px]
                        font-bold
                        text-[var(--color-text-muted)]
                        transition-colors
                        hover:text-[var(--color-primary)]
                      "
                        >
                          <span>View details</span>

                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div ref={sentinelRef} className="h-8" />
        </section>
      </div>

      {/* VIRAL REELS & VIDEO STORIES */}
      <ReelsSlider
        variant="menu"
        title="Baking Stories & Viral Treats"
        subtitle="Watch our fresh oven bakes and creative cake recipes in action!"
        className="pb-12"
      />
    </main>
  );
}
