"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { LogOut, ArrowRight, X, Sparkles, Store } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const GUARD_KEY = "sfc_pwa_root_guard";

export default function PWAExitConfirmation() {
  const pathname = usePathname();
  const { isStandalone } = usePWAInstall();
  const [showExitModal, setShowExitModal] = useState(false);
  const guardArmedRef = useRef(false);

  // Arm guard on root route or in standalone PWA
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only arm guard at root ("/") or in standalone mode to intercept app closure
    const isRoot = pathname === "/" || pathname === "";
    if (isRoot) {
      if (!window.history.state || !window.history.state[GUARD_KEY]) {
        try {
          window.history.pushState({ [GUARD_KEY]: true }, "", window.location.href);
          guardArmedRef.current = true;
        } catch {}
      } else {
        guardArmedRef.current = true;
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      // 1. If any modal/dialog is currently active, let it handle its own close
      const hasActiveDialog = !!document.querySelector('[role="dialog"]');
      if (hasActiveDialog) {
        return;
      }

      // 2. If the popped state belonged to a sub-modal (like reel modal), ignore
      if (e.state && (e.state.sfc_modal || e.state.isReelModalOpen)) {
        return;
      }

      // 3. Only intercept at root page or standalone PWA where back button would close app
      const atRoot = window.location.pathname === "/" || window.location.pathname === "";
      if (atRoot) {
        // Guard was popped by hardware/system back button!
        setShowExitModal(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname, isStandalone]);

  // Handle keyboard events while exit confirmation is open
  useEffect(() => {
    if (!showExitModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleContinue();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showExitModal]);

  // Continue shopping / stay in app
  const handleContinue = () => {
    setShowExitModal(false);
    // Re-arm history guard
    try {
      window.history.pushState({ [GUARD_KEY]: true }, "", window.location.href);
      guardArmedRef.current = true;
    } catch {}
  };

  // Exit app
  const handleExit = () => {
    setShowExitModal(false);
    // Try window.close() (works in installed PWA/standalone and popups)
    try {
      window.close();
    } catch {}

    // Fallback: If browser prevents window.close(), navigate back in history
    setTimeout(() => {
      try {
        window.history.back();
      } catch {}
    }, 100);
  };

  if (!showExitModal) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pwa-exit-title"
      aria-describedby="pwa-exit-desc"
      style={{ zIndex: 9999999 }}
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 isolate"
      onClick={handleContinue}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xl p-6 sm:p-7 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon button */}
        <button
          type="button"
          onClick={handleContinue}
          className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Brand / Icon Badge */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20 shadow-inner">
          <Store className="h-8 w-8" />
        </div>

        {/* Title */}
        <h3
          id="pwa-exit-title"
          className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight"
        >
          Exit SFC Bakers?
        </h3>

        {/* Subtitle / Description */}
        <p
          id="pwa-exit-desc"
          className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed"
        >
          Do you want to exit the app? You can continue exploring fresh cakes, pastries, and delicious treats!
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
          {/* Primary: Continue in App */}
          <button
            type="button"
            onClick={handleContinue}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white py-3 px-4 font-semibold shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>Continue Shopping</span>
            <ArrowRight size={16} />
          </button>

          {/* Secondary: Exit App */}
          <button
            type="button"
            onClick={handleExit}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-800/80 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-900/50 text-stone-700 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 py-3 px-4 font-medium active:scale-95 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Exit App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
