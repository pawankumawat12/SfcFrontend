"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { FaInstagram, FaYoutube } from "react-icons/fa";
import { ReelItem } from "../redux/services/reelApi";

interface ReelModalProps {
  reels?: ReelItem[];
  currentIndex?: number | null;
  reel?: ReelItem | null;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
}

export function getEmbedUrl(url: string = "", platform: "youtube" | "instagram" = "youtube"): string {
  if (!url) return "";

  if (platform === "instagram" || /instagram\.com/i.test(url)) {
    // Clean URL without query params + add /embed
    const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
    return `${cleanUrl}/embed`;
  }

  // YouTube Shorts or standard videos
  const ytMatch = url.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`;
  }

  return url;
}

export default function ReelModal({
  reels = [],
  currentIndex = null,
  reel = null,
  onClose,
  onNavigate,
}: ReelModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If no reel is selected (currentIndex is null/undefined and reel is null), modal MUST NOT render
  const isExplicitlyOpen =
    (currentIndex !== null && currentIndex !== undefined) || reel !== null;

  const activeReels = reels.length > 0 ? reels : reel ? [reel] : [];
  const activeIdx =
    currentIndex !== null && currentIndex !== undefined ? currentIndex : 0;
  const currentReel = isExplicitlyOpen ? activeReels[activeIdx] || reel : null;

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const canGoPrev = activeIdx > 0;
  const canGoNext = activeIdx < activeReels.length - 1;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (canGoPrev && onNavigate) {
      onNavigate(activeIdx - 1);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (canGoNext && onNavigate) {
      onNavigate(activeIdx + 1);
    }
  };

  // Keyboard navigation: Left/Right or Up/Down arrows & Escape
  useEffect(() => {
    if (!currentReel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (canGoNext && onNavigate) {
          onNavigate(activeIdx + 1);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (canGoPrev && onNavigate) {
          onNavigate(activeIdx - 1);
        }
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentReel, activeIdx, canGoPrev, canGoNext, onNavigate, onClose]);

  // Mobile Touch Swipe Handling (Instagram vertical swipe + horizontal swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Minimum swipe threshold (40px)
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 40) {
      // Vertical swipe (Instagram Reels style)
      if (diffY > 40) {
        // Swiped UP -> Next Reel
        if (canGoNext && onNavigate) handleNext();
      } else if (diffY < -40) {
        // Swiped DOWN -> Previous Reel, or dismiss if already on the first reel
        if (canGoPrev && onNavigate) {
          handlePrev();
        } else if (Math.abs(diffY) > 70) {
          onClose();
        }
      }
    } else if (Math.abs(diffX) >= Math.abs(diffY) && Math.abs(diffX) > 40) {
      // Horizontal swipe
      if (diffX > 40 && canGoNext && onNavigate) {
        // Swiped Left -> Go Next
        handleNext();
      } else if (diffX < -40 && canGoPrev && onNavigate) {
        // Swiped Right -> Go Prev
        handlePrev();
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  if (!mounted || !isExplicitlyOpen || !currentReel) return null;

  const isInsta = currentReel.platform === "instagram" || /instagram\.com/i.test(currentReel.video_url);
  const embedUrl = getEmbedUrl(currentReel.video_url, currentReel.platform);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 999999 }}
      className="fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 sm:p-4 transition-all duration-300 animate-in fade-in isolate"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic ambient backlight glow */}
      <div
        key={`ambient-${currentReel.id}`}
        className={`pointer-events-none absolute h-[460px] w-[340px] rounded-full blur-[110px] opacity-40 transition-all duration-700 ${
          isInsta
            ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600"
            : "bg-red-600"
        }`}
      />

      {/* Floating Left Arrow (Previous Reel) */}
      {activeReels.length > 1 && (
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          aria-label="Previous reel"
          className="hidden sm:flex absolute left-4 md:left-8 z-30 h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white shadow-xl backdrop-blur-md border border-white/15 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title="Previous Reel (Left Arrow)"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Floating Right Arrow (Next Reel) */}
      {activeReels.length > 1 && (
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Next reel"
          className="hidden sm:flex absolute right-4 md:right-8 z-30 h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white shadow-xl backdrop-blur-md border border-white/15 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title="Next Reel (Right Arrow)"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Main Video Dialog Card */}
      <div
        className="relative flex flex-col w-full max-w-[340px] sm:max-w-[390px] max-h-[92vh] rounded-3xl bg-neutral-950 overflow-hidden shadow-2xl border border-white/20 z-10 transition-transform duration-300 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 bg-neutral-900/90 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {isInsta ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white shrink-0 text-xs shadow-md">
                <FaInstagram size={13} />
              </span>
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shrink-0 text-xs shadow-md">
                <FaYoutube size={12} />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate leading-tight" title={currentReel.title}>
                {currentReel.title}
              </h3>
              {activeReels.length > 1 && (
                <span className="text-[10px] text-white/50 font-mono">
                  {activeIdx + 1} of {activeReels.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={currentReel.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
              title="Open original video"
            >
              <ExternalLink size={14} />
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all cursor-pointer shadow-xs"
              aria-label="Close reel video"
              title="Close (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Video Player Frame with 9:16 vertical ratio */}
        <div className="relative aspect-[9/16] w-full bg-black flex items-center justify-center overflow-hidden">
          <iframe
            key={`iframe-${currentReel.id}`}
            src={embedUrl}
            title={currentReel.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Mobile Navigation Micro-Bar (when more than 1 reel) */}
        {activeReels.length > 1 && (
          <div className="flex sm:hidden items-center justify-between px-3 py-1.5 bg-neutral-900 border-t border-white/5 text-xs text-white/70">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!canGoPrev}
              className="flex items-center gap-1 font-bold text-[11px] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="text-[10px] font-mono text-white/40">
              Swipe or tap arrows
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex items-center gap-1 font-bold text-[11px] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Bottom Footer Bar */}
        <div className="px-4 py-2.5 bg-neutral-900/90 border-t border-white/10 flex items-center justify-between text-[11px] text-white/80 backdrop-blur-md">
          <span className="flex items-center gap-1 font-semibold text-emerald-400">
            <Sparkles size={11} /> SFC Bakers Originals
          </span>
          <a
            href={currentReel.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
          >
            Watch on {isInsta ? "Instagram" : "YouTube"} →
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

