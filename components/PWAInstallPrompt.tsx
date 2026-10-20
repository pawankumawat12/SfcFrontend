"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Download,
  X,
  Share,
  PlusSquare,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISS_KEY = "sfc_pwa_prompt_dismissed_until";
const DISMISS_COOLDOWN_HOURS = 1;

export default function PWAInstallPrompt() {
  const {
    canInstall,
    showIOSGuide,
    isInstalled,
    isStandalone,
    isIOS,
    isReady,
    install,
    openApp,
  } = usePWAInstall();

  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    // If currently running inside installed standalone PWA, never show prompt
    if (isStandalone) {
      setVisible(false);
      return;
    }

    // If app is already installed on the device, do not show install prompt
    if (isInstalled) {
      setVisible(false);
      return;
    }

    // Check if user previously clicked "Not Now"
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setVisible(false);
        return;
      }
    } catch {}

    // Delay prompt appearance by 1.8 seconds for smooth onboarding
    const timer = setTimeout(() => {
      // Show prompt if can install (Android/Chrome/Edge) or iOS Safari
      if (canInstall || showIOSGuide || isIOS) {
        setVisible(true);
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isReady, isStandalone, isInstalled, canInstall, showIOSGuide, isIOS]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      const cooldownTime = Date.now() + DISMISS_COOLDOWN_HOURS * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(cooldownTime));
    } catch {}
  };

  const handleInstallClick = async () => {
    if (showIOSGuide || isIOS) {
      setShowIOSSteps(true);
      return;
    }

    if (!canInstall) return;

    setInstalling(true);
    try {
      const success = await install();
      if (success) {
        setVisible(false);
      }
    } finally {
      setInstalling(false);
    }
  };

 

  // Case 2: In standalone mode or prompt not ready/dismissed
  if (!visible || isStandalone) {
    return null;
  }

  return (
    <aside
      aria-label="Install SFC Bakers application"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close install prompt"
        >
          <X size={18} />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md shrink-0 border border-slate-100 dark:border-slate-700/60 bg-[#fff8e8]">
            <Image
              src="/icons/icon-192.png"
              alt="SFC Bakers Logo"
              fill
              sizes="56px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-lime-500/15 px-2 py-0.5 text-[10px] font-bold text-lime-700 dark:text-lime-400 tracking-wide uppercase">
                <Sparkles size={10} /> Fast Ordering
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-tight">
              Install SFC Bakers App
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Faster checkout, real-time order tracking, and zero storage space.
            </p>
          </div>
        </div>

        {/* iOS Safari Instructions Accordion */}
        {showIOSSteps && (
          <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-3.5 border border-slate-200/60 dark:border-slate-700/60 animate-in fade-in duration-200">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
              How to install on iOS Safari:
            </p>
            <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shrink-0">
                  1
                </span>
                <span>
                  Tap the <Share size={13} className="inline mx-1 text-blue-500" />{" "}
                  <strong>Share</strong> icon in Safari&apos;s bottom bar
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shrink-0">
                  2
                </span>
                <span>
                  Scroll down &amp; select{" "}
                  <PlusSquare size={13} className="inline mx-1 text-slate-700 dark:text-slate-200" />{" "}
                  <strong>Add to Home Screen</strong>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top-right corner to finish
                </span>
              </li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={installing}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary,#4f7d16)] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-lime-900/15 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
          >
            <Download size={16} />
            <span>{installing ? "Installing..." : "Install App"}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition active:scale-[0.98]"
          >
            Not Now
          </button>
        </div>
      </div>
    </aside>
  );
}
