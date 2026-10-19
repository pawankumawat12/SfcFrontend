"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useGetStoreCategoriesQuery } from "../redux/services/catalogApi";
import SkeletonLoader from "./SkeletonLoader";

export default function PopularPreview() {
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
    return () => {
      window.removeEventListener("sfc_delivery_location_changed", handleLocationChange);
    };
  }, []);

  const { data: categoryResponse, isLoading } = useGetStoreCategoriesQuery({
    ...(selectedStoreId ? { store_id: selectedStoreId } : {}),
  });
  const categories = categoryResponse?.data || [];
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [autoplay, setAutoplay] = useState(true);

  const router = useRouter();

  /* -----------------------------------------
     AUTO SCROLL
  ----------------------------------------- */

  useEffect(() => {
    if (!autoplay) return;

    const id = setInterval(() => {
      const el = scrollerRef.current;

      if (!el) return;

      const maxScroll =
        el.scrollWidth - el.clientWidth;

      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({
          left: 0,
          behavior: "smooth",
        });
      } else {
        el.scrollBy({
          left: el.clientWidth * 0.6,
          behavior: "smooth",
        });
      }
    }, 3500);

    return () => clearInterval(id);
  }, [autoplay]);

  /* -----------------------------------------
     DRAG & TOUCH SCROLL
  ----------------------------------------- */
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    setAutoplay(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 6) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasDraggedRef.current = false;
      setAutoplay(true);
    }, 1500);
  };

  /* -----------------------------------------
     CATEGORY CLICK
  ----------------------------------------- */

  function goToCategory(id: string) {
    if (hasDraggedRef.current) return;
    router.push(
      `/menu?category=${encodeURIComponent(id)}`
    );
  }

  /* -----------------------------------------
     MANUAL SCROLL
  ----------------------------------------- */

  function scrollByAmount(direction: number) {
    setAutoplay(false);
    const el = scrollerRef.current;

    if (!el) return;

    el.scrollBy({
      left: direction * el.clientWidth * 0.65,
      behavior: "smooth",
    });
    setTimeout(() => setAutoplay(true), 2500);
  }

  return (
    <section className="relative bg-[var(--bg-body)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-7 flex items-end justify-between">

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />

              <span
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-[var(--color-primary)]
                "
              >
                Explore Our Menu
              </span>
            </div>

            <h2
              className="
                text-3xl
                font-black
                tracking-tight
                text-[var(--color-text-primary)]
                md:text-4xl
              "
            >
              Shop by Category
            </h2>

            <p
              className="
                mt-2
                max-w-xl
                text-sm
                text-[var(--color-text-secondary)]
                md:text-base
              "
            >
              Pick your favorite food category and discover
              something delicious.
            </p>
          </div>

          {/* View All */}

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
              transition
              hover:bg-[var(--color-primary-dark)]
              sm:inline-flex
            "
            style={{color:"white"}}
          >
            View Full Menu

            <ArrowRight size={16} />
          </Link>
        </div>


        <div className="relative">

          {/* Left Arrow */}

          <button
            type="button"
            aria-label="Previous categories"
            onClick={() => scrollByAmount(-1)}
            className="
              absolute
              left-0
              top-1/2
              z-20
              hidden
              h-10
              w-10
              -translate-x-1/2
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border
              border-[var(--color-border)]
              bg-[var(--bg-surface)]
              text-[var(--color-text-primary)]
              shadow-lg
              transition
              hover:scale-105
              hover:text-[var(--color-primary)]
              md:flex
            "
          >
            <ChevronLeft size={20} />
          </button>


          <div
            ref={scrollerRef}
            onMouseEnter={() => setAutoplay(false)}
            onMouseLeave={handleMouseUpOrLeave}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onTouchStart={() => setAutoplay(false)}
            onTouchEnd={() => setTimeout(() => setAutoplay(true), 2500)}
            className="
              flex
              gap-2
              overflow-x-auto
              scroll-smooth
              snap-x
              snap-mandatory
              py-3
              scrollbar-x
              cursor-grab
              active:cursor-grabbing
              select-none
            "
          >

            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="min-w-[180px] snap-start overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--bg-surface)] p-3 shadow-sm sm:min-w-[210px] md:min-w-[225px]"
                >
                  <SkeletonLoader variant="rectangular" height={150} className="w-full !rounded-xl" />
                  <div className="mt-3 space-y-2">
                    <SkeletonLoader variant="text" lines={1} height={18} width="70%" />
                    <SkeletonLoader variant="text" lines={1} height={14} width="40%" />
                  </div>
                </div>
              ))
            ) : (
              categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  goToCategory(category.id)
                }
                className="
                  group
                  relative
                  min-w-[180px]
                  snap-start
                  overflow-hidden
                  rounded-2xl
                  border
                  border-[var(--color-border)]
                  bg-[var(--bg-surface)]
                  text-left
                  shadow-sm
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-[var(--color-primary)]
                  hover:shadow-[0_15px_35px_rgba(79,125,22,0.15)]
                  sm:min-w-[210px]
                  md:min-w-[225px]
                "
              >

                {/* Image */}

                <div className="relative h-36 overflow-hidden md:h-40">
                  {category.img ? (
                    <Image
                      src={category.img}
                      alt={category.name}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 180px, 225px"
                      className="
                        object-cover
                        transition-transform
                        duration-500
                        group-hover:scale-110
                      "
                    />
                  ) : (
                    <div className="h-full w-full bg-stone-100 flex items-center justify-center text-stone-400">
                      <span className="text-xs">No image</span>
                    </div>
                  )}

                  {/* Image overlay */}

                  <div
                    className="
                      absolute
                      inset-0
                      bg-gradient-to-t
                      from-black/50
                      via-transparent
                      to-transparent
                    "
                  />

                  {/* Category badge */}

                  <span
                    className="
                      absolute
                      bottom-3
                      left-3
                      rounded-full
                      bg-white/95
                      px-3
                      py-1
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-[var(--color-primary)]
                      shadow-sm
                    "
                  >
                    Explore
                  </span>
                </div>

                {/* Content */}

                <div className="flex items-center justify-between px-4 py-3.5">

                  <div>
                    <h3
                      className="
                        text-sm
                        font-bold
                        text-[var(--color-text-primary)]
                        md:text-base
                      "
                    >
                      {category.name}
                    </h3>

                    <p
                      className="
                        mt-0.5
                        text-[11px]
                        text-[var(--color-text-muted)]
                      "
                    >
                      View items
                    </p>
                  </div>

                  {/* Arrow */}

                  <span
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      bg-[var(--color-primary-50)]
                      text-[var(--color-primary)]
                      transition
                      duration-300
                      group-hover:bg-[var(--color-primary)]
                      group-hover:text-white
                    "
                  >
                    <ArrowRight size={15} />
                  </span>
                </div>
              </button>
            ))
            )}
          </div>

          {/* Right Arrow */}

          <button
            type="button"
            aria-label="Next categories"
            onClick={() => scrollByAmount(1)}
            className="
              absolute
              right-0
              top-1/2
              z-20
              hidden
              h-10
              w-10
              translate-x-1/2
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border
              border-[var(--color-border)]
              bg-[var(--bg-surface)]
              text-[var(--color-text-primary)]
              shadow-lg
              transition
              hover:scale-105
              hover:text-[var(--color-primary)]
              md:flex
            "
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* =================================================
            MOBILE VIEW ALL
        ================================================= */}

        <div className="mt-5 flex justify-center sm:hidden">

          <Link
            href="/menu"
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-[var(--color-primary)]
              px-5
              py-2.5
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
