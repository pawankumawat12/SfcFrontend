"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Heart,
  Truck,
  Utensils,
  Star,
  Flame,
  Pizza,
  Coffee,
  Cake,
  Sandwich,
  Sparkles,
} from "lucide-react";
import { toAssetUrl } from "../utils/backendUrl";
import { useGetActiveHeroSlidersQuery } from "../redux/services/heroSliderApi";

interface SlideItem {
  id?: number | string;
  tag: string;
  title: string;
  highlight: string;
  subtitle?: string | null;
  cta?: string | null;
  secondaryCta?: string | null;
  secondary_cta?: string | null;
  href?: string | null;
  secondaryHref?: string | null;
  secondary_href?: string | null;
  img?: string | null;
  image?: string | null;
}

const FALLBACK_SLIDES: SlideItem[] = [
  {
    tag: "FRESH & DELICIOUS",
    title: "Good Food,",
    highlight: "Good Mood.",
    subtitle:
      "Freshly prepared fast food made with quality ingredients, bold flavors and lots of love.",
    cta: "Order Now",
    secondaryCta: "View Menu",
    href: "/menu",
    secondaryHref: "/menu",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1400&q=85",
  },
  {
    tag: "HANDCRAFTED WITH LOVE",
    title: "Taste That",
    highlight: "Makes You Smile.",
    subtitle:
      "From juicy burgers to crispy fries, every bite is made fresh and served with flavor.",
    cta: "Explore Menu",
    secondaryCta: "Our Story",
    href: "/menu",
    secondaryHref: "/about",
    img: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1400&q=85",
  },
  {
    tag: "FRESH • FAST • FLAVORFUL",
    title: "Your Favorite",
    highlight: "Food Is Here.",
    subtitle:
      "Craving something delicious? Pick your favorite meal and enjoy a fresh fast-food experience.",
    cta: "Order Food",
    secondaryCta: "Contact Us",
    href: "/menu",
    secondaryHref: "/contact",
    img: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1400&q=85",
  },
];

export default function Hero() {
  const { data: remoteSliders } = useGetActiveHeroSlidersQuery();
  const slides: SlideItem[] =
    remoteSliders && remoteSliders.length > 0
      ? remoteSliders
      : FALLBACK_SLIDES;

  const [index, setIndex] = useState(0);

  // Keep index within bounds if slide count changes dynamically
  useEffect(() => {
    if (index >= slides.length) {
      setIndex(0);
    }
  }, [slides.length, index]);

  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const mouseStartXRef = useRef<number | null>(null);

  // Auto-slide every 5 seconds if multiple slides exist and not paused
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const id = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => clearInterval(id);
  }, [slides.length, isPaused]);

  const currentSlide = slides[index] || slides[0] || FALLBACK_SLIDES[0];
  const slideImage = toAssetUrl(currentSlide.img || currentSlide.image);
  const slideHref = currentSlide.href || "/menu";
  const slideSecondaryHref =
    currentSlide.secondaryHref || currentSlide.secondary_href || "/menu";
  const slideCta = currentSlide.cta || "Order Now";
  const slideSecondaryCta =
    currentSlide.secondaryCta || currentSlide.secondary_cta || "View Menu";

  const previousSlide = () => {
    if (slides.length <= 1) return;
    setIndex(
      (current) =>
        (current - 1 + slides.length) % slides.length
    );
  };

  const nextSlide = () => {
    if (slides.length <= 1) return;
    setIndex(
      (current) =>
        (current + 1) % slides.length
    );
  };

  // Touch Swipe Handlers (Mobile / Tablet)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchStartXRef.current - touchEndX;
      const diffY = (touchStartYRef.current || 0) - touchEndY;

      // Only trigger if horizontal swipe is dominant and > 40px
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX > 0) {
          nextSlide();
        } else {
          previousSlide();
        }
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    setTimeout(() => setIsPaused(false), 2000);
  };

  // Mouse Drag Handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select")) return;
    isMouseDownRef.current = true;
    mouseStartXRef.current = e.clientX;
    setIsPaused(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isMouseDownRef.current && mouseStartXRef.current !== null) {
      const diffX = mouseStartXRef.current - e.clientX;
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          nextSlide();
        } else {
          previousSlide();
        }
      }
    }
    isMouseDownRef.current = false;
    mouseStartXRef.current = null;
    setTimeout(() => setIsPaused(false), 2000);
  };

  return (
    <main className="w-full overflow-hidden bg-(--bg-body)">

      <section
        className="relative min-h-100 md:min-h-150 lg:min-h-162.5 overflow-hidden bg-stone-900 flex items-center select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          isMouseDownRef.current = false;
          setIsPaused(false);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >

        {/* Full Background Slider Image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {slideImage ? (
            <Image
              key={slideImage}
              src={slideImage}
              alt={currentSlide.highlight || "Hero slider"}
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover object-center transition-all duration-1000 scale-105"
            />
          ) : null}

          {/* Contrast & Depth Overlays */}
          <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/70 to-black/35 sm:to-black/25" />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-transparent via-black/20 to-black/60" />
        </div>

        {/* Main hero container */}
        <div
          className="
            relative
            z-20
            mx-auto
            flex
            w-full
            max-w-7xl
            flex-col
            justify-between
            gap-8
            px-5
            py-20
            md:px-8
            lg:flex-row
            lg:items-center
            lg:px-10
          "
        >
          <div className="relative z-20 w-full max-w-xl pt-4 lg:w-[58%] lg:pt-0">
            <div
              className="
                mb-5
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-white/20
                bg-white/15
                px-4
                py-2
                text-xs
                font-bold
                tracking-[0.15em]
                text-white
                shadow-lg
                backdrop-blur-md
              "
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-(--color-primary) text-white">
                <Leaf size={12} />
              </span>
              {currentSlide.tag}
            </div>

            {/* Heading */}
            <div
              key={`heading-${index}`}
              className="animate-fade-up"
            >
              <p
                className="
                  mb-1.5
                  font-serif
                  text-2xl
                  italic
                  font-semibold
                  text-(--color-secondary)
                  sm:text-3xl
                  md:text-4xl
                "
              >
                {currentSlide.title}
              </p>

              <h1
                className="
                  max-w-2xl
                  text-4xl
                  font-black
                  uppercase
                  leading-[0.98]
                  tracking-tight
                  text-white
                  drop-shadow-lg
                  sm:text-6xl
                  lg:text-7xl
                "
              >
                {currentSlide.highlight}
              </h1>
            </div>

            {/* Description */}
            <p
              key={`subtitle-${index}`}
              className="
                animate-fade-up
                mt-6
                max-w-lg
                text-base
                leading-7
                text-white/85
                drop-shadow
                sm:text-lg
              "
            >
              {currentSlide.subtitle}
            </p>

            {/* Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href={slideHref}
                className="
                  group
                  inline-flex
                  items-center
                  gap-3
                  rounded-xl
                  bg-(--color-primary)
                  px-7
                  py-3.5
                  text-sm
                  font-bold
                  text-white
                  shadow-[0_10px_25px_rgba(79,125,22,0.4)]
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:bg-(--color-primary-dark)
                "
                style={{color:"white"}}
              >
                {slideCta}
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  style={{color:"white"}}
                />
              </Link>

              <Link
                href={slideSecondaryHref}
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/40
                  bg-white/15
                  px-6
                  py-3.5
                  text-sm
                  font-bold
                  text-white
                  backdrop-blur-md
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:bg-white
                  hover:text-(--color-primary)
                "
                style={{color: "white"}}
              >
                {slideSecondaryCta}
              </Link>
            </div>

            <div
              className="
                mt-10
                grid
                grid-cols-3
                gap-3
                border-t
                border-white/20
                pt-7
                sm:max-w-lg
                sm:gap-5
              "
            >
              {/* Fresh */}
              <div className="flex items-center gap-2.5">
                <span
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-white/15
                    text-white
                    shadow-sm
                    backdrop-blur-md
                  "
                >
                  <Leaf size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Fresh</p>
                  <p className="hidden text-[10px] text-white/70 sm:block">Ingredients</p>
                </div>
              </div>

              {/* Fast */}
              <div className="flex items-center gap-2.5">
                <span
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-white/15
                    text-white
                    shadow-sm
                    backdrop-blur-md
                  "
                >
                  <Truck size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Fast</p>
                  <p className="hidden text-[10px] text-white/70 sm:block">Delivery</p>
                </div>
              </div>

              {/* Loved */}
              <div className="flex items-center gap-2.5">
                <span
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-white/15
                    text-(--color-secondary)
                    shadow-sm
                    backdrop-blur-md
                  "
                >
                  <Heart size={18} fill="currentColor" />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Loved</p>
                  <p className="hidden text-[10px] text-white/70 sm:block">By Everyone</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:flex flex-col items-end gap-4 z-20 mr-2">
            {/* Rating badge */}
            <div
              className="
                flex
                items-center
                gap-3
                rounded-2xl
                border
                border-white/20
                bg-black/35
                px-5
                py-4
                shadow-2xl
                backdrop-blur-md
                transition-transform
                duration-300
                hover:scale-105
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-(--color-secondary)/20
                  text-(--color-secondary)
                "
              >
                <Star size={20} fill="currentColor" />
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  4.9 / 5.0
                </p>
                <p className="text-[10px] text-white/70">
                  Customer Rating
                </p>
              </div>
            </div>

            {/* Fresh natural badge */}
            <div
              className="
                flex
                items-center
                gap-3
                rounded-2xl
                border
                border-white/20
                bg-black/35
                p-4
                shadow-2xl
                backdrop-blur-md
                transition-transform
                duration-300
                hover:scale-105
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-(--color-primary)
                  text-white
                  shadow-md
                "
              >
                <Leaf size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  100% Fresh
                </p>
                <p className="text-[10px] text-white/70">
                  Handcrafted With Care
                </p>
              </div>
            </div>

            {/* Trending badge */}
            <div
              className="
                flex
                items-center
                gap-2
                rounded-full
                border
                border-white/20
                bg-(--color-secondary)/90
                px-4
                py-2
                text-xs
                font-black
                uppercase
                tracking-wider
                text-white
                shadow-xl
                backdrop-blur-md
              "
            >
              <Flame size={15} fill="currentColor" />
              Popular Picks
            </div>
          </div>
        </div>

        {/* =====================================================
            SLIDER CONTROLS
        ===================================================== */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={previousSlide}
          className="
            absolute
            left-2
            top-1/2
            z-30
            flex
            h-8
            w-8
            sm:h-10
            sm:w-10
            md:h-11
            md:w-11
            -translate-y-1/2
            items-center
            justify-center
            rounded-full
            border
            border-white/25
            bg-black/40
            text-white
            shadow-lg
            backdrop-blur-md
            transition-all
            duration-200
            hover:scale-110
            hover:bg-white
            hover:text-black
            sm:left-3
            lg:left-6
          "
        >
          <ChevronLeft size={20} className="sm:hidden" />
          <ChevronLeft size={22} className="hidden sm:block" />
        </button>

        <button
          type="button"
          aria-label="Next slide"
          onClick={nextSlide}
          className="
            absolute
            right-2
            top-1/2
            z-30
            flex
            h-8
            w-8
            sm:h-10
            sm:w-10
            md:h-11
            md:w-11
            -translate-y-1/2
            items-center
            justify-center
            rounded-full
            border
            border-white/25
            bg-black/40
            text-white
            shadow-lg
            backdrop-blur-md
            transition-all
            duration-200
            hover:scale-110
            hover:bg-white
            hover:text-black
            sm:right-3
            lg:right-6
          "
        >
          <ChevronRight size={20} className="sm:hidden" />
          <ChevronRight size={22} className="hidden sm:block" />
        </button>

        {/* =====================================================
            SLIDE DOTS
        ===================================================== */}
        <div
          className="
            absolute
            bottom-6
            left-1/2
            z-30
            flex
            -translate-x-1/2
            items-center
            gap-2
          "
        >
          {slides.map((slide, i) => (
            <button
              key={slide.id ? `slide-${slide.id}` : `${slide.title}-${i}`}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`
                h-2
                rounded-full
                transition-all
                duration-300
                ${i === index
                  ? "w-8 bg-white"
                  : "w-2.5 bg-white/40 hover:bg-white/70"
                }
              `}
            />
          ))}
        </div>
      </section>


      <section className="relative z-20 px-4 md:px-8">

        <div
          className="
            mx-auto
            -mt-1
            max-w-6xl
            overflow-hidden
            rounded-2xl
            bg-(--color-primary)
            shadow-[0_15px_40px_rgba(79,125,22,0.22)]
          "
        >

        </div>
      </section>


      <section className="mx-auto hidden max-w-7xl px-5 py-12 md:block md:px-8 md:py-16">

        <div className="grid gap-4 sm:grid-cols-3">

          <div
            className="
              flex
              items-center
              gap-4
              rounded-2xl
              border
              border-(--color-border)
              bg-white
              p-5
            "
          >
            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-(--color-primary-50)
                text-(--color-primary)
              "
            >
              <Leaf size={22} />
            </div>

            <div>
              <h3 className="font-bold text-(--color-text-primary)">
                Fresh Ingredients
              </h3>

              <p className="mt-1 text-xs text-(--color-text-muted)">
                Quality ingredients in every meal
              </p>
            </div>
          </div>

          <div
            className="
              flex
              items-center
              gap-4
              rounded-2xl
              border
              border-(--color-border)
              bg-white
              p-5
            "
          >
            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-(--color-secondary)/10
                text-(--color-secondary)
              "
            >
              <Truck size={22} />
            </div>

            <div>
              <h3 className="font-bold text-(--color-text-primary)">
                Fast Delivery
              </h3>

              <p className="mt-1 text-xs text-(--color-text-muted)">
                Hot food delivered to your door
              </p>
            </div>
          </div>

          <div
            className="
              flex
              items-center
              gap-4
              rounded-2xl
              border
              border-(--color-border)
              bg-white
              p-5
            "
          >
            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-(--color-primary-50)
                text-(--color-primary)
              "
            >
              <Utensils size={22} />
            </div>

            <div>
              <h3 className="font-bold text-(--color-text-primary)">
                Made With Love
              </h3>

              <p className="mt-1 text-xs text-(--color-text-muted)">
                Delicious food, every single time
              </p>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}