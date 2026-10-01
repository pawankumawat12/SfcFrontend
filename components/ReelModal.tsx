"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  X,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Heart,
  Share2,
  ShoppingBag,
  Sparkles,
  Film,
} from "lucide-react";
import { FaInstagram, FaYoutube } from "react-icons/fa";
import { ReelItem } from "../redux/services/reelApi";
import { getOptimizedVideoUrl, getOptimizedVideoThumbnail } from "../utils/videoUtils";

interface ReelModalProps {
  reels?: ReelItem[];
  currentIndex?: number | null;
  reel?: ReelItem | null;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
}

export function getEmbedUrl(url: string = "", platform: string = "youtube"): string {
  if (!url) return "";

  if (platform === "instagram" || /instagram\.com/i.test(url)) {
    const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
    return `${cleanUrl}/embed`;
  }

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
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCenterIcon, setShowCenterIcon] = useState<"play" | "pause" | "heart" | null>(null);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [slideAnim, setSlideAnim] = useState<"up" | "down" | "none">("none");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wheelLockRef = useRef(false);
  const lastTapRef = useRef<number>(0);

  // Touch tracking for swipe up/down
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDistanceY = useRef<number>(0);
  const touchDistanceX = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isExplicitlyOpen =
    (currentIndex !== null && currentIndex !== undefined) || reel !== null;

  const activeReels = reels.length > 0 ? reels : reel ? [reel] : [];
  const activeIdx =
    currentIndex !== null && currentIndex !== undefined ? currentIndex : 0;
  const currentReel = isExplicitlyOpen ? activeReels[activeIdx] || reel : null;

  const canGoPrev = activeReels.length > 1;
  const canGoNext = activeReels.length > 1;

  const handlePrev = () => {
    if (activeReels.length <= 1 || !onNavigate) return;
    setSlideAnim("down");
    const prevIdx = (activeIdx - 1 + activeReels.length) % activeReels.length;
    onNavigate(prevIdx);
  };

  const handleNext = () => {
    if (activeReels.length <= 1 || !onNavigate) return;
    setSlideAnim("up");
    const nextIdx = (activeIdx + 1) % activeReels.length;
    onNavigate(nextIdx);
  };

  // Keyboard navigation & lock background scroll
  useEffect(() => {
    if (!currentReel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "m" || e.key === "M") {
        setIsMuted((prev) => !prev);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentReel, activeIdx, canGoPrev, canGoNext]);

  // Video reset on reel switch
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    const timer = setTimeout(() => setSlideAnim("none"), 350);
    return () => clearTimeout(timer);
  }, [activeIdx]);

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(pct);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setShowCenterIcon("play");
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowCenterIcon("pause");
    }
    setTimeout(() => setShowCenterIcon(null), 500);
  };

  const handleVideoTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    // Double tap (< 300ms) to like reel
    if (now - lastTapRef.current < 300) {
      if (currentReel) {
        setLikedMap((prev) => ({ ...prev, [currentReel.id]: true }));
        setShowCenterIcon("heart");
        setTimeout(() => setShowCenterIcon(null), 700);
      }
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    togglePlayPause();
  };

  // Mouse wheel / trackpad vertical scroll to change reel
  const handleWheel = (e: React.WheelEvent) => {
    if (wheelLockRef.current) return;
    if (Math.abs(e.deltaY) > 25) {
      wheelLockRef.current = true;
      setTimeout(() => {
        wheelLockRef.current = false;
      }, 450);

      if (e.deltaY > 0 && canGoNext) {
        handleNext();
      } else if (e.deltaY < 0 && canGoPrev) {
        handlePrev();
      }
    }
  };

  // Touch Swipe Handlers (Directly on Video and Card)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchDistanceY.current = 0;
    touchDistanceX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    touchDistanceY.current = touchStartY.current - e.touches[0].clientY;
    touchDistanceX.current = touchStartX.current - e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;

    const diffY = touchDistanceY.current; // > 0 = swiped UP, < 0 = swiped DOWN
    const diffX = touchDistanceX.current;

    // Minimum swipe threshold: 25px
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 25) {
      if (diffY > 25) {
        // Swiped UP (niche se uper) -> Next reel
        handleNext();
      } else if (diffY < -25) {
        // Swiped DOWN (uper se niche) -> Previous / other reel (loops smoothly!)
        handlePrev();
      }
    } else if (Math.abs(diffX) >= Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX > 35) {
        handleNext();
      } else if (diffX < -35) {
        handlePrev();
      }
    }

    touchStartY.current = null;
    touchStartX.current = null;
    touchDistanceY.current = 0;
    touchDistanceX.current = 0;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentReel) return;
    const url = typeof window !== "undefined" ? window.location.origin + "/#reels" : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: currentReel.title,
          text: `Check out "${currentReel.title}" on SFC Bakers!`,
          url: currentReel.video_url || url,
        });
      } catch {}
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentReel.video_url || url);
      toast.success("Reel link copied to clipboard!");
    }
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentReel) return;
    const nextVal = !likedMap[currentReel.id];
    setLikedMap((prev) => ({ ...prev, [currentReel.id]: nextVal }));
    if (nextVal) {
      setShowCenterIcon("heart");
      setTimeout(() => setShowCenterIcon(null), 700);
    }
  };

  if (!mounted || !isExplicitlyOpen || !currentReel) return null;

  const isDirect =
    currentReel.platform === "direct" ||
    /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(currentReel.video_url) ||
    currentReel.video_url.includes("/uploads/") ||
    currentReel.video_url.includes("/video/upload/");
  const isInsta = !isDirect && (currentReel.platform === "instagram" || /instagram\.com/i.test(currentReel.video_url));
  const embedUrl = isDirect ? "" : getEmbedUrl(currentReel.video_url, currentReel.platform);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 999999 }}
      className="fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-4 transition-all duration-300 isolate"
      onClick={onClose}
    >
      {/* Dynamic ambient backlight glow on desktop */}
      <div
        key={`ambient-${currentReel.id}`}
        className={`pointer-events-none hidden sm:block absolute h-[500px] w-[380px] rounded-full blur-[120px] opacity-40 transition-all duration-700 ${
          isDirect
            ? "bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500"
            : isInsta
            ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600"
            : "bg-red-600"
        }`}
      />

      {/* Desktop Floating Left Arrow */}
      {activeReels.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          disabled={!canGoPrev}
          aria-label="Previous reel"
          className="hidden md:flex absolute left-6 lg:left-12 z-40 h-13 w-13 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title="Previous Reel (Up Arrow / Scroll Up)"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Desktop Floating Right Arrow */}
      {activeReels.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          disabled={!canGoNext}
          aria-label="Next reel"
          className="hidden md:flex absolute right-6 lg:right-12 z-40 h-13 w-13 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
          title="Next Reel (Down Arrow / Scroll Down)"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Instagram Reel Container (Full screen on mobile, card on desktop) */}
      <div
        className={`relative flex flex-col w-full h-[100dvh] sm:h-[88vh] sm:max-w-[400px] sm:rounded-3xl bg-neutral-950 overflow-hidden shadow-2xl border-0 sm:border sm:border-white/20 z-10 transition-transform duration-300 select-none touch-none overscroll-none ${
          slideAnim === "up"
            ? "animate-in slide-in-from-bottom duration-300"
            : slideAnim === "down"
            ? "animate-in slide-in-from-top duration-300"
            : ""
        }`}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Top Floating Header Bar */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-3.5 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {/* Bakery Brand Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary)] via-rose-500 to-amber-500 text-white font-black text-xs shadow-md shrink-0 border border-white/30">
              SFC
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide drop-shadow-sm">
                  SFC Bakers
                </span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              {activeReels.length > 1 && (
                <span className="text-[10px] text-white/70 font-mono">
                  Reel {activeIdx + 1} of {activeReels.length}
                </span>
              )}
            </div>
          </div>

          {/* Top Actions: Audio Toggle, Link, Close */}
          <div className="flex items-center gap-2 shrink-0">
            {isDirect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md active:scale-90 transition-all cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
            )}

            <a
              href={currentReel.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md active:scale-90 transition-all cursor-pointer"
              title="Open video link"
            >
              <ExternalLink size={15} />
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/25 backdrop-blur-md active:scale-90 transition-all cursor-pointer shadow-md"
              aria-label="Close reels"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video Player Display Area with 100% height */}
        <div className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden">
          {isDirect ? (
            <>
              <video
                ref={videoRef}
                key={`video-${currentReel.id}`}
                src={getOptimizedVideoUrl(currentReel.video_url)}
                poster={
                  getOptimizedVideoThumbnail(
                    currentReel.video_url,
                    currentReel.thumbnail_url
                  ) || undefined
                }
                autoPlay
                loop
                playsInline
                preload="auto"
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                className="h-full w-full object-cover select-none pointer-events-none"
              />

              {/* Gesture Capture Overlay: Tap to Play/Pause, Double Tap to Like, Swipe to Navigate */}
              <div
                className="absolute inset-0 z-20 cursor-pointer touch-none"
                onClick={handleVideoTap}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                aria-label="Tap to play/pause or swipe vertically to change reels"
              />
            </>
          ) : (
            <iframe
              key={`iframe-${currentReel.id}`}
              src={embedUrl}
              title={currentReel.title}
              className="w-full h-full border-0 select-none pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}

          {/* Center Play/Pause/Heart Popping Feedback */}
          {showCenterIcon && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center animate-in zoom-in-50 fade-in duration-200">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white shadow-2xl">
                {showCenterIcon === "play" && <Play size={36} className="fill-white translate-x-0.5" />}
                {showCenterIcon === "pause" && <Pause size={36} className="fill-white" />}
                {showCenterIcon === "heart" && <Heart size={44} className="fill-rose-500 text-rose-500 animate-bounce" />}
              </div>
            </div>
          )}
        </div>

        {/* Instagram Right-Hand Floating Action Bar */}
        <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-4 text-white pointer-events-auto">
          {/* Like Heart Button */}
          <button
            type="button"
            onClick={toggleLike}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
            title="Like this reel"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md border border-white/20 shadow-lg transition-all ${
                likedMap[currentReel.id]
                  ? "bg-rose-600 text-white"
                  : "bg-black/50 hover:bg-black/70 text-white"
              }`}
            >
              <Heart
                size={22}
                className={likedMap[currentReel.id] ? "fill-white" : ""}
              />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow-md">
              {likedMap[currentReel.id] ? "Liked" : "Like"}
            </span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
            title="Share reel"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 shadow-lg text-white transition-all">
              <Share2 size={20} />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow-md">Share</span>
          </button>

          {/* Up (Prev) Arrow Button */}
          {canGoPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
              title="Previous Reel (Swipe Down)"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 shadow-lg text-white">
                <ChevronUp size={22} />
              </div>
              <span className="text-[9px] font-bold text-white/80">Prev</span>
            </button>
          )}

          {/* Down (Next) Arrow Button */}
          {canGoNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
              title="Next Reel (Swipe Up)"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 shadow-lg text-white">
                <ChevronDown size={22} />
              </div>
              <span className="text-[9px] font-bold text-white/80">Next</span>
            </button>
          )}
        </div>

        {/* Bottom Floating Info & Conversion CTA Bar */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-4 pb-6 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-auto">
          {/* Reel Title & Description */}
          <div className="pr-16 mb-3">
            <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug drop-shadow-md">
              {currentReel.title}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-white/85">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <Sparkles size={12} /> SFC Special
              </span>
              <span className="text-white/40">•</span>
              <span className="text-amber-300">Fresh From Oven</span>
            </div>
          </div>

          {/* Conversion Button: Order Now */}
          <div className="flex items-center gap-2">
            <Link
              href="/menu"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl hover:brightness-110 active:scale-98 transition-all"
            >
              <ShoppingBag size={14} />
              <span>Order Fresh Bakes Now</span>
            </Link>

            {/* Gesture Hint Pill */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/10 text-[10px] text-white/70 font-mono backdrop-blur-md">
              <span>Scroll for next</span>
            </div>
          </div>
        </div>

        {/* Thin Video Progress Bar along the bottom edge */}
        <div className="absolute bottom-0 inset-x-0 z-40 h-1 bg-white/20">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-primary)] to-rose-500 transition-all duration-100"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

