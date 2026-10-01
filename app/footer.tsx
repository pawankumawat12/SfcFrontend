"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Phone,
  Mail,
  Clock3,
  ArrowRight,
  Heart,
  Zap,
  Bell,
  Wifi,
  Code,
} from "lucide-react";
import PWAInstallButton from "@/components/PWAInstallButton";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useGetFooterQuery, useGetLogoQuery, useGetDeveloperSettingsQuery } from "../redux/services/settingsApi";
import { useGetCmsPagesQuery } from "../redux/services/cmsApi";
import { FaFacebook, FaInstagram, FaTwitter, FaWhatsapp } from "react-icons/fa";
import { toAssetUrl } from "@/utils/backendUrl";

const quickLinks = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Menu",
    href: "/menu",
  },
  {
    label: "Offers",
    href: "/offers",
  },
  {
    label: "About Us",
    href: "/about",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

const helpLinks = [
  {
    label: "My Orders",
    href: "/orders",
  },
  {
    label: "Cart",
    href: "/cart",
  },
  {
    label: "Privacy Policy",
    href: "/privacy-policy",
  },
  {
    label: "Terms & Conditions",
    href: "/terms",
  },
  {
    label: "Refund Policy",
    href: "/refund-policy",
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { isInstalled, isStandalone } = usePWAInstall();
  const isAppInstalled = Boolean(isInstalled || isStandalone);
  const { data: footerResponse } = useGetFooterQuery();
  const { data: logoResponse } = useGetLogoQuery();
  const { data: cmsPagesResponse } = useGetCmsPagesQuery();
  const { data: devSettingsResponse } = useGetDeveloperSettingsQuery();
  const footerSettings = footerResponse?.data;
  const devSettings = devSettingsResponse?.data;
  const cmsPages = cmsPagesResponse?.data || [];
  const rawLogoUrl = logoResponse?.data?.logo_url ? toAssetUrl(logoResponse.data.logo_url) : "/images/sfcLogo.png";
  const [logoSrc, setLogoSrc] = React.useState(rawLogoUrl);

  const facebookUrl = footerSettings?.facebook?.trim();
  const hasFacebook = Boolean(facebookUrl && facebookUrl !== "#");

  const instagramUrl = footerSettings?.instagram?.trim();
  const hasInstagram = Boolean(instagramUrl && instagramUrl !== "#");

  const twitterUrl = footerSettings?.twitter?.trim();
  const hasTwitter = Boolean(twitterUrl && twitterUrl !== "#");

  const hasAnySocial = hasFacebook || hasInstagram || hasTwitter;

  const dynamicHelpLinks = React.useMemo(() => {
    const base = [
      { label: "My Orders", href: "/orders" },
      { label: "Cart", href: "/cart" },
    ];
    if (cmsPages.length > 0) {
      // Exclude 'about' since it's already under Quick Links
      const policyPages = cmsPages.filter((p) => p.slug !== "about");
      return [
        ...base,
        ...policyPages.map((p) => ({
          label: p.title,
          href: `/${p.slug}`,
        })),
      ];
    }
    return helpLinks;
  }, [cmsPages]);

  const bottomPolicyLinks = React.useMemo(() => {
    if (cmsPages.length > 0) {
      return cmsPages
        .filter((p) => p.slug !== "about")
        .slice(0, 4)
        .map((p) => ({
          label: p.title,
          href: `/${p.slug}`,
        }));
    }
    return [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Refund Policy", href: "/refund-policy" },
    ];
  }, [cmsPages]);

  React.useEffect(() => {
    setLogoSrc(rawLogoUrl);
  }, [rawLogoUrl]);

  return (
    <footer className="app-footer bg-[var(--bg-footer)] text-white border-t border-black/10 dark:border-white/10 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-6">
        {/* Mobile Compact Footer */}
        <div className="flex flex-col gap-4 sm:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1 shadow-md">
                <Image
                  src={logoSrc || "/images/sfcLogo.png"}
                  alt="SFC Bakers"
                  width={36}
                  height={36}
                  unoptimized
                  onError={() => setLogoSrc("/images/sfcLogo.png")}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <span className="block text-base font-black tracking-tight">SFC Bakers</span>
                <span className="block text-[8px] font-medium uppercase tracking-[0.16em] text-white/60">
                  Fresh • Fast • Delicious
                </span>
              </div>
            </Link>

            {hasAnySocial && (
              <div className="flex items-center gap-2">
                {hasFacebook && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/80 hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white transition"
                  >
                    <FaFacebook size={14} />
                  </a>
                )}
                {hasInstagram && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/80 hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white transition"
                  >
                    <FaInstagram size={14} />
                  </a>
                )}
                {hasTwitter && (
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/80 hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white transition"
                  >
                    <FaTwitter size={14} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <Link href="/" className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-white/90 hover:bg-white/10 hover:text-white transition">
              Home
            </Link>
            <Link href="/menu" className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-white/90 hover:bg-white/10 hover:text-white transition">
              Menu
            </Link>
            <Link href="/contact" className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-white/90 hover:bg-white/10 hover:text-white transition">
              Contact
            </Link>
            <Link href="/about" className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-white/90 hover:bg-white/10 hover:text-white transition">
              About Us
            </Link>
            <Link href="/privacy-policy" className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-white/90 hover:bg-white/10 hover:text-white transition">
              Privacy
            </Link>
            <Link href="/terms" className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-white/90 hover:bg-white/10 hover:text-white transition">
              Terms
            </Link>
            <Link href="/faq" className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-white/90 hover:bg-white/10 hover:text-white transition">
              Faq
            </Link>
            <Link href="/shipping-policy" className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-white/90 hover:bg-white/10 hover:text-white transition">
              Shipping Policy
            </Link>
            <Link href="/refund-policy" className="rounded-xl border border-white/10 bg-white/5 py-2 px-2 text-white/90 hover:bg-white/10 hover:text-white transition">
              Refund Policy
            </Link>
          </div>
          {!isAppInstalled && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-[var(--color-primary-light)] shrink-0" />
                <span className="text-xs font-bold text-white/90">Install SFC Bakers App</span>
              </div>
              <PWAInstallButton variant="compact" />
            </div>
          )}
        </div>

        {/* Desktop Directory Grid */}
        <div className="hidden sm:grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg">
                <Image
                  src={logoSrc || "/images/sfcLogo.png"}
                  alt="SFC Bakers"
                  width={44}
                  height={44}
                  unoptimized
                  onError={() => setLogoSrc("/images/sfcLogo.png")}
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <span className="block text-xl font-black tracking-tight">
                  SFC Bakers
                </span>

                <span className="block text-[9px] font-medium uppercase tracking-[0.2em] text-white/50">
                  Fresh • Fast • Delicious
                </span>
              </div>
            </Link>


            <p
              className="
                mt-5
                max-w-sm
                text-sm
                leading-6
                text-white/70
              "
            >
              Freshly prepared food, delicious flavors and
              quick service. Your favorite food is just a few
              clicks away.
            </p>

            {hasAnySocial && (
              <div className="mt-6 flex items-center gap-2">
                {hasFacebook && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-white/10
                      bg-white/10
                      text-white/80
                      transition
                      hover:bg-[var(--color-primary)]
                      hover:border-[var(--color-primary)]
                      hover:text-white"
                  >
                    <span className="text-sm font-bold">
                      <FaFacebook />
                    </span>
                  </a>
                )}
                {hasInstagram && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-white/10
                      bg-white/10
                      text-white/80
                      transition
                      hover:bg-[var(--color-primary)]
                      hover:border-[var(--color-primary)]
                      hover:text-white"
                  >
                    <span className="text-sm font-bold">
                      <FaInstagram />
                    </span>
                  </a>
                )}
                {hasTwitter && (
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                    className="flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-white/10
                      bg-white/10
                      text-white/80
                      transition
                      hover:bg-[var(--color-primary)]
                      hover:border-[var(--color-primary)]
                      hover:text-white"
                  >
                    <span className="text-sm font-bold">
                      <FaTwitter />
                    </span>
                  </a>
                )}
              </div>
            )}
          </div>
          <div>

            <h3
              className="
                text-sm
                font-black
                uppercase
                tracking-wider
                text-white
              "
            >
              Quick Links
            </h3>

            <ul className="mt-5 space-y-3">

              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      text-sm
                      text-white/70
                      transition
                      hover:gap-2.5
                      hover:text-white
                    "
                  >
                    <ArrowRight size={12} />

                    {link.label}
                  </Link>
                </li>
              ))}

            </ul>
          </div>
          <div>

            <h3
              className="
                text-sm
                font-black
                uppercase
                tracking-wider
                text-white
              "
            >
              Customer Help
            </h3>

            <ul className="mt-5 space-y-3">

              {dynamicHelpLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      text-sm
                      text-white/70
                      transition
                      hover:gap-2.5
                      hover:text-white
                    "
                  >
                    <ArrowRight size={12} />

                    {link.label}
                  </Link>
                </li>
              ))}

            </ul>
          </div>
          <div>

            <h3
              className="
                text-sm
                font-black
                uppercase
                tracking-wider
                text-white
              "
            >
              Visit Us
            </h3>

            <div className="mt-5 space-y-4">

              {/* Address */}

              <div className="flex gap-3">

                <MapPin
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--color-primary-light)]"
                />

                <p className="text-sm leading-6 text-white/70">
                  {footerSettings?.location || (
                    <>
                      123 Main Street,
                      <br />
                      Jaipur, Rajasthan 302017
                    </>
                  )}
                </p>

              </div>

              {/* Phone */}

              <a
                href={`tel:${footerSettings?.phone_number || "+919876543210"}`}
                className="
                  flex
                  items-center
                  gap-3
                  text-sm
                  text-white/70
                  transition
                  hover:text-white
                "
              >
                <Phone
                  size={17}
                  className="text-[var(--color-primary-light)]"
                />

                {footerSettings?.phone_number || "+91 98765 43210"}
              </a>

              {/* Email */}

              <a
                href={`mailto:${footerSettings?.email || "hello@sfcbakers.com"}`}
                className="
                  flex
                  items-center
                  gap-3
                  break-all
                  text-sm
                  text-white/70
                  transition
                  hover:text-white
                "
              >
                <Mail
                  size={17}
                  className="shrink-0 text-[var(--color-primary-light)]"
                />

                {footerSettings?.email || "hello@sfcbakers.com"}
              </a>

              {/* Timing */}

              <div className="flex gap-3">

                <Clock3
                  size={17}
                  className="mt-0.5 shrink-0 text-[var(--color-primary-light)]"
                />

                <div className="text-sm text-white/70">
                  {footerSettings?.working_hours ? (
                    footerSettings.working_hours.split("\n").map((line: string, idx: number) => (
                      <p key={idx}>{line}</p>
                    ))
                  ) : (
                    <>
                      <p>Mon - Fri: 10 AM - 11 PM</p>
                      <p>Sat - Sun: 9 AM - 11:30 PM</p>
                    </>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
        {!isAppInstalled && (
          <div className="mt-10 hidden sm:block overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--color-primary)]/25 via-white/5 to-transparent p-5 sm:p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[22px] bg-white p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/20">
                  <Image
                    src={logoSrc || "/images/sfcLogo.png"}
                    alt="SFC Bakers app icon"
                    width={72}
                    height={72}
                    unoptimized
                    onError={() => setLogoSrc("/images/sfcLogo.png")}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-primary-light)]">
                    Mobile App Experience
                  </p>
                  <h3 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                    Install SFC Bakers App
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                    Add SFC Bakers to your home screen for faster ordering, quick
                    reorders, and an app-like experience — no app store needed.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { icon: Zap, label: "Fast ordering" },
                      { icon: Bell, label: "Order updates" },
                      { icon: Wifi, label: "Offline support" },
                    ].map(({ icon: Icon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80"
                      >
                        <Icon size={13} className="text-[var(--color-primary-light)]" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="shrink-0 lg:pl-4">
                <PWAInstallButton variant="footer" />
              </div>
            </div>
          </div>
        )}
        <div className="my-8 h-px bg-white/10" />
        <div
          className="
            flex
            flex-col
            gap-4
            text-center
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:text-left
          "
        >
          <p className="text-xs text-white/60">
            © {currentYear} SFC Bakers. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/60">
            {bottomPolicyLinks.map((link, idx) => (
              <React.Fragment key={link.href}>
                <Link href={link.href} className="hover:text-white transition">
                  {link.label}
                </Link>
                {idx < bottomPolicyLinks.length - 1 && <span>•</span>}
              </React.Fragment>
            ))}
          </div>

          <p
            className="
              flex
              items-center
              justify-center
              gap-1.5
              text-xs
              text-white/60
            "
          >
            Made with
            <Heart
              size={12}
              fill="currentColor"
              className="text-[var(--color-secondary)]"
            />
            for food lovers
          </p>
        </div>

        {/* DEVELOPER BRANDING & INQUIRY BAR (CONTROLLED FROM ADMIN SETTINGS) */}
        {devSettings?.is_enabled && devSettings?.show_in_frontend && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-200">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
                  <Code size={17} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">
                      Platform Engineered by {devSettings.developer_name || "Pawan Kumawat"}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                      Tech Partner
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    {devSettings.developer_tagline || "Custom Food Ordering Websites, Cafe Apps & Enterprise Software"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
                <a
                  href={`https://wa.me/${(devSettings.developer_whatsapp || "917690939596").replace(/\D/g, "")}?text=${encodeURIComponent(
                    devSettings.custom_inquiry_message || "Hi Pawan, I saw the SFC Bakers website and want to build a similar website/app for my business."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-lg shadow-green-900/20 transition-all transform active:scale-95"
                >
                  <FaWhatsapp size={15} />
                  <span>Build Your Website</span>
                </a>
                {devSettings.developer_phone && (
                  <a
                    href={`tel:${devSettings.developer_phone}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition"
                    title={`Call Developer: ${devSettings.developer_phone}`}
                  >
                    <Phone size={13} />
                    <span className="hidden md:inline">{devSettings.developer_phone}</span>
                  </a>
                )}
                {devSettings.developer_email && (
                  <a
                    href={`mailto:${devSettings.developer_email}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition"
                    title={`Email: ${devSettings.developer_email}`}
                  >
                    <Mail size={13} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
    </footer>
  );
}