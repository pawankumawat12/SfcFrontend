"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, ChevronLeft, ChevronRight, Video, Sparkles, Volume2 } from "lucide-react";
import { FaInstagram, FaYoutube } from "react-icons/fa";
import { useGetActiveReelsQuery, ReelItem } from "../redux/services/reelApi";
import ReelModal from "./ReelModal";

interface ReelsSliderProps {
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: "home" | "menu";
}

export default function ReelsSlider({
  title = "See How It's Made, Order In Seconds!",
  subtitle = "Watch our master bakers craft fresh, mouth-watering cakes & treats. Can't resist? Tap to watch and get yours delivered fresh!",
  className = "",
  variant = "home",
}: ReelsSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { data: reels = [], isLoading } = useGetActiveReelsQuery();

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    const maxScroll = scrollWidth - clientWidth;
    setScrollProgress(maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0);
  };

  useEffect(() => {
    updateScrollButtons();
  }, [reels]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = Math.min(scrollRef.current.clientWidth * 0.75, 400);
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!isLoading && reels.length === 0) {
    return null;
  }

  return (
    <section
      className={`mx-auto max-w-7xl px-4 py-8 md:px-8 ${className}`}
      aria-label="Reels and Video Stories"
    >
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-body)] p-4 sm:p-7 md:p-8 shadow-sm">
        {/* Decorative subtle ambient circle */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-rose-500/5 blur-3xl" />

        {/* Section Header */}
        <div className="relative z-10 mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-amber-500/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 shadow-2xs">
                <Video size={14} className="animate-pulse" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-600 border border-rose-500/20">
                <Sparkles size={11} className="animate-spin text-amber-500" style={{ animationDuration: "4s" }} />
                <span>Fresh From The Oven</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)] max-w-xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Navigation Controls (Desktop) */}
          {reels.length > 2 && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/90 dark:bg-stone-800 text-stone-700 dark:text-stone-200 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/90 dark:bg-stone-800 text-stone-700 dark:text-stone-200 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Reels Horizontal Scroll Container */}
        {isLoading ? (
          <div className="flex gap-3.5 overflow-hidden py-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-[270px] w-[155px] sm:h-[340px] sm:w-[200px] shrink-0 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800"
              />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={updateScrollButtons}
            className="flex gap-3.5 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 pb-4 scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {reels.map((reel, index) => {
              const isInsta = reel.platform === "instagram";

              return (
                <div
                  key={reel.id}
                  onClick={() => setActiveReelIndex(index)}
                  className="group relative h-[280px] w-[160px] sm:h-[340px] sm:w-[200px] md:h-[370px] md:w-[215px] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-stone-950 shadow-md transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20 select-none"
                >
                  {/* Outer animated gradient ring on hover */}
                  <div className="absolute inset-0 z-20 rounded-2xl border-2 border-transparent transition-all duration-300 group-hover:border-rose-500/80 pointer-events-none" />

                  {/* Thumbnail / Cover */}
                  {reel.thumbnail_url ? (
                    <img
                      src={reel.thumbnail_url}
                      alt={reel.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-stone-900 text-stone-600">
                      <Video size={40} />
                    </div>
                  )}

                  {/* Multi-layered cinematic gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/30 transition-opacity duration-300 group-hover:opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-80" />

                  {/* Top Bar on Card: Audio Wave Only (No Reel/Shorts Badge) */}
                  <div className="absolute right-2.5 top-2.5 z-10">
                    <div className="flex items-center gap-0.5 rounded-full bg-black/45 px-2 py-1 backdrop-blur-md">
                      <span className="h-2 w-0.5 rounded-full bg-white/80 animate-pulse" />
                      <span className="h-3.5 w-0.5 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-0.5 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>

                  {/* Center Glowing Play Button with pulse effect */}
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute h-14 w-14 rounded-full bg-rose-500/30 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300" />
                      <div className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-white/30 backdrop-blur-md text-white shadow-xl border border-white/40 transition-all duration-300 group-hover:scale-115 group-hover:bg-[var(--color-primary)] group-hover:border-transparent">
                        <Play size={20} className="fill-white translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Title & Action */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-white drop-shadow-md leading-snug group-hover:text-amber-200 transition-colors">
                      {reel.title}
                    </h3>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-white/90">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Watch & Order
                      </span>
                      <span className="text-[9px] font-bold text-amber-300">Fresh Bakes</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Scroll Progress Bar */}
        {reels.length > 2 && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-stone-200/60 dark:bg-stone-800">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-primary)] to-rose-500 transition-all duration-150"
              style={{ width: `${Math.max(15, scrollProgress)}%` }}
            />
          </div>
        )}
      </div>

      {/* Reel Video Modal Player with Navigation */}
      {activeReelIndex !== null && (
        <ReelModal
          reels={reels}
          currentIndex={activeReelIndex}
          onClose={() => setActiveReelIndex(null)}
          onNavigate={(newIdx) => setActiveReelIndex(newIdx)}
        />
      )}
    </section>
  );
}

