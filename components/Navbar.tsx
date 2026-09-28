"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  ShoppingCart,
  Home,
  Menu as MenuIcon,
  Phone,
  User,
  LayoutDashboard,
  LogOut,
  Leaf,
  Heart,
  Bookmark,
  Sun,
  Moon,
  Palette,
  X,
  ChevronDown,
  Bell,
  Star,
  Truck,
  MapPin,
  AlertTriangle,
} from "lucide-react";

import { useGetCartQuery } from "../redux/services/cartApi";
import { getGuestCartCount, subscribeGuestCart } from "../lib/guestCart";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import SelectLocationModal from "./SelectLocationModal";
import {
  getStoredDeliveryLocation,
  subscribeDeliveryLocation,
  DeliveryLocation,
} from "../lib/deliveryLocation";
import { logout } from "../redux/features/authSlice";
import { useLogoutMutation } from "../redux/services/authApi";
import { useGetWishlistQuery } from "../redux/services/wishlistApi";
import { useGetLogoQuery, useGetStoreStatusQuery } from "../redux/services/settingsApi";
import { useGetUnreadNotificationCountQuery } from "../redux/services/notificationApi";
import { getSocket } from "../lib/socket";
import LogoutModal from "@/models/LogoutModel";
import { toAssetUrl } from "@/utils/backendUrl";

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(
    (state: { auth: { user: any | null } }) => state.auth.user
  );

  const { data: storeStatusData } = useGetStoreStatusQuery();
  const [selectedBranchStatus, setSelectedBranchStatus] = useState<{ isOpen: boolean; name: string } | null>(null);

  useEffect(() => {
    const handleBranchEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      let currentSelectedStoreId: string | null = null;
      try {
        currentSelectedStoreId = localStorage.getItem("sfc_selected_store_id");
      } catch {}

      if (detail && currentSelectedStoreId && String(currentSelectedStoreId) === String(detail.storeId)) {
        if (detail.isDeleted) {
          setSelectedBranchStatus(null);
        } else {
          setSelectedBranchStatus({
            isOpen: detail.isOpen && detail.isActive,
            name: detail.storeName,
          });
        }
      }
    };

    window.addEventListener("sfc_branch_status_changed", handleBranchEvent);
    return () => {
      window.removeEventListener("sfc_branch_status_changed", handleBranchEvent);
    };
  }, []);

  const isGlobalClosed = storeStatusData?.data?.is_open === false;
  const isBranchClosed = selectedBranchStatus ? !selectedBranchStatus.isOpen : false;
  const isStoreClosed = isGlobalClosed || isBranchClosed;
  const closedBannerMessage = isGlobalClosed
    ? "Notice: Store is currently CLOSED for new orders."
    : `Notice: Branch "${selectedBranchStatus?.name || "Selected Store"}" is currently CLOSED for new orders.`;

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("sfc_selected_store_id") || null;
      } catch {}
    }
    return null;
  });

  useEffect(() => {
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

  const { data: wishlistData } = useGetWishlistQuery(
    selectedStoreId ? { store_id: selectedStoreId } : undefined,
    {
      skip: !user,
    }
  );
  const wishlistCount = wishlistData?.data?.length || 0;

  const { data: cartData } = useGetCartQuery(undefined, {
    skip: !user,
  });

  const [guestCartCount, setGuestCartCount] = useState<number>(0);

  useEffect(() => {
    setGuestCartCount(getGuestCartCount());
    const unsubscribe = subscribeGuestCart((items) => {
      setGuestCartCount(items.length);
    });
    return unsubscribe;
  }, []);

  const cartCount = user ? (cartData?.data?.summary?.itemTypesCount || 0) : guestCartCount;

  const { data: logoData } = useGetLogoQuery();
  const rawLogoUrl = logoData?.data?.logo_url ? toAssetUrl(logoData.data.logo_url) : "/images/sfcLogo.png";
  const [logoSrc, setLogoSrc] = useState(rawLogoUrl);
  const [userAvatarError, setUserAvatarError] = useState(false);

  useEffect(() => {
    setLogoSrc(rawLogoUrl);
  }, [rawLogoUrl]);

  useEffect(() => {
    setUserAvatarError(false);
  }, [user?.image]);

  const { data: unreadNotifData, refetch: refetchUnreadNotifs } = useGetUnreadNotificationCountQuery(undefined, {
    skip: !user,
  });
  const unreadNotifCount = user ? (unreadNotifData?.data?.unreadCount || 0) : 0;

  const [logoutRequest] = useLogoutMutation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [deliveryLoc, setDeliveryLoc] = useState<DeliveryLocation | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const desktopHeaderRef = useRef<HTMLElement>(null);
  const mobileHeaderRef = useRef<HTMLElement>(null);

  // Sync delivery location from localStorage and live custom events
  useEffect(() => {
    setDeliveryLoc(getStoredDeliveryLocation());
    const unsub = subscribeDeliveryLocation((loc) => {
      setDeliveryLoc(loc);
    });
    return unsub;
  }, []);

  // First time customer landing check: automatically prompt to set delivery location (required)
  useEffect(() => {
    const loc = getStoredDeliveryLocation();
    if (!loc || !loc.isSet || !loc.lat || !loc.lng) {
      const timer = setTimeout(() => {
        setLocationModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync real-time navbar height (including store-closed banner) to CSS variable --navbar-height
  useEffect(() => {
    const updateNavbarHeight = () => {
      const isDesktop = window.innerWidth >= 768;
      const activeHeader = isDesktop ? desktopHeaderRef.current : mobileHeaderRef.current;
      if (activeHeader) {
        const height = activeHeader.offsetHeight;
        if (height > 0) {
          document.documentElement.style.setProperty("--navbar-height", `${height}px`);
        }
      }
      if (isStoreClosed) {
        document.documentElement.setAttribute("data-store-closed", "true");
      } else {
        document.documentElement.removeAttribute("data-store-closed");
      }
    };

    updateNavbarHeight();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateNavbarHeight();
          })
        : null;

    if (desktopHeaderRef.current) ro?.observe(desktopHeaderRef.current);
    if (mobileHeaderRef.current) ro?.observe(mobileHeaderRef.current);

    window.addEventListener("resize", updateNavbarHeight);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateNavbarHeight);
    };
  }, [isStoreClosed]);

  // Live Socket.IO listener for notifications
  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket(user.id);
    const handleNotification = () => {
      refetchUnreadNotifs();
    };

    socket.on("notification:new", handleNotification);
    socket.on("notification:unread_count", handleNotification);

    return () => {
      socket.off("notification:new", handleNotification);
      socket.off("notification:unread_count", handleNotification);
    };
  }, [user?.id, refetchUnreadNotifs]);

  const handleLogout = async () => {
    try {
      await logoutRequest().unwrap();
    } catch { }
    dispatch(logout());
    localStorage.removeItem("accessToken");
    setDropdownOpen(false);
    setMobileProfileOpen(false);
    router.replace("/");
    setLogoutModal(false);
  };

  useEffect(() => {
    const openLoginModal = () => setAuthOpen(true);

    window.addEventListener("sfc_open_login", openLoginModal);
    return () => window.removeEventListener("sfc_open_login", openLoginModal);
  }, []);

  /* ---------------- CLOSE PROFILE OUTSIDE ---------------- */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
      if (
        mobileProfileRef.current &&
        !mobileProfileRef.current.contains(target)
      ) {
        setMobileProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setMobileProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setMobileProfileOpen(false);
  }, [pathname]);


  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  /* ---------------- NAVIGATION ---------------- */

  const desktopLinks = [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Menu",
      href: "/menu",
    },
    {
      label: "About Us",
      href: "/about",
    },
    {
      label: "Contact Us",
      href: "/contact",
    },
  ];

  const mobileTabs = [
    {
      label: "Home",
      icon: Home,
      href: "/",
    },
    {
      label: "Menu",
      icon: MenuIcon,
      href: "/menu",
    },
    {
      label: "Cart",
      icon: ShoppingCart,
      href: "/cart",
    },
    {
      label: "Offers",
      icon: Heart,
      href: "/offers",
    },
  ];

  return (
    <>
      {/* =========================================================
          DESKTOP NAVBAR
      ========================================================= */}

      <header ref={desktopHeaderRef} className="hidden md:block fixed top-0 inset-x-0 z-50">
        {isStoreClosed && (
          <div className="bg-red-600 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
            <span>{closedBannerMessage}</span>
          </div>
        )}
        {deliveryLoc?.outOfDeliveryZone && !isStoreClosed && (
          <div className="bg-amber-500 text-stone-950 text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-xs">
            <AlertTriangle size={15} className="shrink-0 text-stone-950" />
            <span>Currently, we deliver within 10 km of our branch. Your address is outside our delivery zone.</span>
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="underline font-black hover:text-white ml-1 cursor-pointer"
            >
              Change Location
            </button>
          </div>
        )}
        <div className="border-b border-[var(--color-border)] bg-[var(--bg-surface)]/95 backdrop-blur-xl shadow-[0_4px_25px_rgba(45,27,15,0.08)]">
          <div className="mx-auto flex h-[82px] max-w-7xl items-center justify-between gap-8 px-6 lg:px-8">
            {/* ---------------- LOGO ---------------- */}

            <Link href="/" className="group flex shrink-0 items-center gap-3">
              <div
                className="
                  flex h-15 w-15 items-center justify-center
                  rounded-2xl
                  group-hover:scale-105
                "
              >
                <Image
                  src={logoSrc || "/images/sfcLogo.png"}
                  alt="SFC Bakers"
                  width={60}
                  height={60}
                  priority
                  unoptimized
                  onError={() => setLogoSrc("/images/sfcLogo.png")}
                  className="h-full w-full object-contain"
                />
              </div>

            </Link>

            {/* Delivery Location Pill (Blinkit / Swiggy Style) */}
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className={`group hidden md:flex items-center gap-2.5 rounded-2xl border px-3 py-1.5 text-left transition shadow-2xs cursor-pointer max-w-[260px] ${
                deliveryLoc?.outOfDeliveryZone
                  ? "border-amber-400 bg-amber-50/90 hover:bg-amber-100"
                  : "border-[var(--color-border)] bg-[var(--bg-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
              }`}
              title={
                deliveryLoc?.outOfDeliveryZone
                  ? deliveryLoc.deliveryWarning || "Currently, we deliver within 10 km of our branch"
                  : "Change Delivery Location"
              }
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition shadow-2xs ${
                  deliveryLoc?.outOfDeliveryZone
                    ? "bg-amber-200 text-amber-900 group-hover:bg-amber-300"
                    : "bg-[var(--color-primary-50)] text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white"
                }`}
              >
                {deliveryLoc?.outOfDeliveryZone ? (
                  <AlertTriangle size={16} className="text-amber-800 animate-pulse" />
                ) : (
                  <MapPin size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                  <span className={deliveryLoc?.outOfDeliveryZone ? "text-amber-800" : "text-stone-400"}>
                    {deliveryLoc?.outOfDeliveryZone ? "Outside 10 km Zone" : "Delivering to"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-primary)]">
                  <span className="truncate">
                    {deliveryLoc?.shortAddress || "Select Location"}
                  </span>
                  <ChevronDown
                    size={12}
                    className="shrink-0 text-stone-400 group-hover:text-stone-700"
                  />
                </div>
                {deliveryLoc?.outOfDeliveryZone && (
                  <div className="text-[10px] font-semibold text-amber-800 truncate leading-none mt-0.5">
                    We deliver within 10 km
                  </div>
                )}
              </div>
            </button>

            {/* ---------------- DESKTOP LINKS ---------------- */}

            <nav
              className="flex items-center gap-1"
              aria-label="Desktop navigation"
            >
              {desktopLinks.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative
                      px-4 py-3
                      text-sm
                      font-semibold
                      transition-all
                      duration-200
                      ${active
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
                      }
                    `}
                  >
                    {item.label}

                    {active && (
                      <span className="absolute bottom-0 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-full bg-[var(--color-primary)]" />
                    )}
                  </Link>
                );
              })}
            </nav>


            <div className="flex items-center gap-2">
              <Link
                href="/notifications"
                aria-label="Notifications"
                title="Notifications"
                className="
                  relative
                  flex h-10 w-10 items-center justify-center
                  rounded-full
                  text-[var(--color-text-primary)]
                  transition
                  hover:bg-[var(--color-primary-50)]
                  hover:text-[var(--color-primary)]
                "
              >
                <Bell size={20} />

                {unreadNotifCount > 0 && (
                  <span
                    className="
                        absolute
                        -right-0.5
                        -top-0.5
                        flex
                        h-5
                        min-w-5
                        items-center
                        justify-center
                        rounded-full
                        bg-[var(--color-primary)]
                        px-1
                        text-[10px]
                        font-bold
                        text-white
                      "
                  >
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </span>
                )}
              </Link>

              {/* Wishlist Link */}
              <Link
                href="/favorites"
                aria-label="Wishlist"
                title="Your Wishlist"
                className="
                  relative
                  flex h-10 w-10 items-center justify-center
                  rounded-full
                  text-[var(--color-text-primary)]
                  transition
                  hover:bg-[var(--color-primary-50)]
                  hover:text-[var(--color-primary)]
                "
              >
                <Bookmark
                  size={20}
                  className={wishlistCount > 0 ? "fill-[var(--color-primary)] text-[var(--color-primary)]" : ""}
                />

                {wishlistCount > 0 && (
                  <span
                    className="
                      absolute
                      -right-0.5
                      -top-0.5
                      flex
                      h-5
                      min-w-5
                      items-center
                      justify-center
                      rounded-full
                      bg-[var(--color-primary)]
                      px-1
                      text-[10px]
                      font-bold
                      text-white
                      shadow-sm
                    "
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                aria-label="Cart"
                className="
                  relative
                  flex h-10 w-10 items-center justify-center
                  rounded-full
                  text-[var(--color-text-primary)]
                  transition
                  hover:bg-[var(--color-primary-50)]
                  hover:text-[var(--color-primary)]
                "
              >
                <ShoppingCart size={20} />

                {cartCount > 0 && (
                  <span
                    className="
                      absolute
                      -right-0.5
                      -top-0.5
                      flex
                      h-5
                      min-w-5
                      items-center
                      justify-center
                      rounded-full
                      bg-[var(--color-primary)]
                      px-1
                      text-[10px]
                      font-bold
                      text-white
                    "
                  >
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Profile */}

              {user && (
                <div ref={profileRef} className="relative ml-1">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((open) => !open)}
                    aria-expanded={dropdownOpen}
                    className="
                    flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-[var(--color-border)]
                    bg-[var(--color-cream)]
                    px-3
                    py-1.5
                    text-sm
                    font-semibold
                    text-[var(--color-text-primary)]
                    transition
                    hover:border-[var(--color-primary)]
                    hover:bg-[var(--color-primary-50)]
                  "
                  >
                    <span
                      className="
                      flex h-8 w-8 overflow-hidden items-center justify-center
                      rounded-full
                      bg-[var(--color-primary)]
                      text-white
                    "
                    >
                      {user?.image && !userAvatarError ? (
                        <Image
                          src={toAssetUrl(user.image)}
                          alt={user?.name || "User profile"}
                          width={34}
                          height={34}
                          unoptimized
                          onError={() => setUserAvatarError(true)}
                          className="h-full w-full object-cover rounded-full"
                        />
                      ) : (
                        <User size={17} />
                      )}
                    </span>

                    <span>{user?.name?.split(" ")[0] ?? "Profile"}</span>
               

                    <ChevronDown
                      size={15}
                      className={`
                      transition-transform
                      ${dropdownOpen ? "rotate-180" : ""}
                    `}
                    />
                  </button>

                  {/* Profile Dropdown */}

                  {dropdownOpen && (
                    <div
                      className="
                      absolute
                      right-0
                      top-[calc(100%+12px)]
                      w-56
                      overflow-hidden
                      rounded-2xl
                      border
                      border-[var(--color-border)]
                      bg-white
                      p-2
                      shadow-[0_20px_50px_rgba(45,27,15,0.15)]
                    "
                    >
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="
                        flex items-center gap-3
                        rounded-xl
                        px-4 py-3
                        text-sm font-semibold
                        text-[var(--color-text-primary)]
                        transition
                        hover:bg-[var(--color-primary-50)]
                        hover:text-[var(--color-primary)]
                      "
                      >
                        <User size={17} />
                        Profile
                      </Link>


                      <Link
                        href="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="
                        flex items-center justify-between
                        rounded-xl
                        px-4 py-3
                        text-sm font-semibold
                        text-[var(--color-text-primary)]
                        transition
                        hover:bg-[var(--color-primary-50)]
                        hover:text-[var(--color-primary)]
                      "
                      >
                        <div className="flex items-center gap-3">
                          <Truck
                            size={17}
                          />
                          My Orders
                        </div>
                   
                      </Link>

                      <Link
                        href="/favorites"
                        onClick={() => setDropdownOpen(false)}
                        className="
                        flex items-center justify-between
                        rounded-xl
                        px-4 py-3
                        text-sm font-semibold
                        text-[var(--color-text-primary)]
                        transition
                        hover:bg-[var(--color-primary-50)]
                        hover:text-[var(--color-primary)]
                      "
                      >
                        <div className="flex items-center gap-3">
                          <Bookmark
                            size={17}
                            className={
                              wishlistCount > 0
                                ? "fill-[var(--color-primary)] text-[var(--color-primary)]"
                                : ""
                            }
                          />
                          Wishlist
                        </div>
                        {wishlistCount > 0 && (
                          <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold text-white">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>

                      <div className="my-1 h-px bg-[var(--color-border)]" />

                      <button
                        type="button"
                        onClick={() => setLogoutModal(true)}
                        className="
                        flex items-center gap-3
                        rounded-xl
                        px-4 py-3
                        text-sm font-semibold
                        text-[var(--color-error)]
                        transition
                        hover:bg-red-50
                      "
                      >
                        <LogOut size={17} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Order Now */}

              {!user && (
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="mr-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface)] px-5 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  <User size={18} />
                  Sign in
                </button>
              )}

              

              {/* <Link
                href="/menu"
                className="
                  ml-2
                  inline-flex
                  h-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-[var(--color-primary)]
                  px-6
                  text-sm
                  font-bold
                  shadow-[0_8px_20px_rgba(79,125,22,0.22)]
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-[var(--color-primary-dark)]
                  hover:shadow-[0_10px_25px_rgba(79,125,22,0.30)]
                "
                style={{ color: "white" }}
              >
                Order Now
              </Link> */}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE / PWA TOP BAR */}

      <header
        ref={mobileHeaderRef}
        className={`md:hidden fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
          isStoreClosed ? "bg-red-600" : "bg-[var(--bg-surface)]/95"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {isStoreClosed && (
          <div className="bg-red-600 text-white text-[11px] font-semibold py-1 px-3 text-center flex items-center justify-center gap-1.5 shadow-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span>{closedBannerMessage}</span>
          </div>
        )}
        <div
          className="
            border-b
            border-[var(--color-border)]
            bg-[var(--bg-surface)]/95
            backdrop-blur-xl
            shadow-[0_4px_20px_rgba(45,27,15,0.08)]
          "
        >
          <div className="flex h-[68px] items-center justify-between px-4 sm:px-5">
            {/* Logo */}

            <Link href="/" className="flex items-center gap-2.5">
              <div
                className="
                  flex h-12 w-12
                  items-center justify-center
                  rounded-xl
                "
              >
                <Image
                  src={logoSrc || "/images/sfcLogo.png"}
                  alt="SFC Bakers"
                  width={48}
                  height={48}
                  priority
                  unoptimized
                  onError={() => setLogoSrc("/images/sfcLogo.png")}
                  className="h-full w-full object-contain"
                />
              </div>
            </Link>


            <div className="flex items-center gap-2">
              {!user && (
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  Sign in
                </button>
              )}
<div className="flex items-center gap-2">
              <Link
                href="/notifications"
                aria-label="Notifications"
                title="Notifications"
                className="
                  relative
                  flex h-10 w-10 items-center justify-center
                  rounded-full
                  text-[var(--color-text-primary)]
                  transition
                  hover:bg-[var(--color-primary-50)]
                  hover:text-[var(--color-primary)]
                "
              >
                <Bell size={20} />

                {unreadNotifCount > 0 && (
                  <span
                    className="
                        absolute
                        -right-0.5
                        -top-0.5
                        flex
                        h-5
                        min-w-5
                        items-center
                        justify-center
                        rounded-full
                        bg-[var(--color-primary)]
                        px-1
                        text-[10px]
                        font-bold
                        text-white
                      "
                  >
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </span>
                )}
              </Link>

              {/* Wishlist Link */}
              <Link
                href="/favorites"
                aria-label="Wishlist"
                title="Your Wishlist"
                className="
                  relative
                  flex h-10 w-10 items-center justify-center
                  rounded-full
                  text-[var(--color-text-primary)]
                  transition
                  hover:bg-[var(--color-primary-50)]
                  hover:text-[var(--color-primary)]
                "
              >
                <Bookmark
                  size={20}
                  className={wishlistCount > 0 ? "fill-[var(--color-primary)] text-[var(--color-primary)]" : ""}
                />

                {wishlistCount > 0 && (
                  <span
                    className="
                      absolute
                      -right-0.5
                      -top-0.5
                      flex
                      h-5
                      min-w-5
                      items-center
                      justify-center
                      rounded-full
                      bg-[var(--color-primary)]
                      px-1
                      text-[10px]
                      font-bold
                      text-white
                      shadow-sm
                    "
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

          {/* Mobile Delivery Sub-bar (Blinkit style) */}
          <div
            onClick={() => setLocationModalOpen(true)}
            role="button"
            tabIndex={0}
            className={`flex items-center justify-between border-t px-4 py-1.5 text-xs cursor-pointer transition ${
              deliveryLoc?.outOfDeliveryZone
                ? "border-amber-300 bg-amber-100/90 hover:bg-amber-200"
                : "border-[var(--color-border)]/60 bg-[var(--color-primary-50)]/50 hover:bg-[var(--color-primary-50)]"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {deliveryLoc?.outOfDeliveryZone ? (
                <AlertTriangle size={13} className="text-amber-800 shrink-0 animate-pulse" />
              ) : (
                <MapPin size={13} className="text-[var(--color-primary)] shrink-0" />
              )}
              <span className="text-[11px] font-medium text-stone-700 truncate">
                {deliveryLoc?.outOfDeliveryZone ? (
                  <span className="text-amber-900 font-bold">
                    ⚠️ Outside 10 km:{" "}
                    <span className="underline decoration-dotted">{deliveryLoc?.shortAddress}</span>
                  </span>
                ) : (
                  <>
                    Deliver to:{" "}
                    <span className="font-bold text-[var(--color-text-primary)] underline decoration-dotted">
                      {deliveryLoc?.shortAddress || "Select delivery location"}
                    </span>
                  </>
                )}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold shrink-0 flex items-center gap-0.5 ml-2 ${
                deliveryLoc?.outOfDeliveryZone ? "text-amber-900" : "text-[var(--color-primary)]"
              }`}
            >
              Change <ChevronDown size={11} />
            </span>
          </div>
        </div>
      </header>

      <nav
        className="
          md:hidden
          fixed
          bottom-0
          inset-x-0
          z-50
          border-t
          border-[var(--color-border)]
          bg-[var(--bg-surface)]/95
          px-2
          pt-2
          backdrop-blur-xl
          shadow-[0_-8px_30px_rgba(45,27,15,0.12)]
        "
        style={{
          paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
        }}
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex max-w-md items-center justify-around">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative
                  flex
                  min-w-[62px]
                  flex-col
                  items-center
                  justify-center
                  gap-1
                  rounded-2xl
                  px-2
                  py-2
                  text-[10px]
                  font-semibold
                  transition-all
                  duration-200
                  ${active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)]"
                  }
                `}
              >
                {/* Active pill */}

                {active && (
                  <span
                    className="
                      absolute
                      -top-2
                      h-1
                      w-7
                      rounded-full
                      bg-[var(--color-primary)]
                    "
                  />
                )}

                <span
                  className={`
                    relative
                    flex h-8 w-10
                    items-center
                    justify-center
                    rounded-xl
                    transition
                    ${active ? "bg-[var(--color-primary-50)]" : ""}
                  `}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />

                  {/* Cart Badge */}

                  {item.label === "Cart" && cartCount > 0 && (
                    <span
                      className="
                          absolute
                          -right-1
                          -top-1
                          flex h-4 min-w-4
                          items-center justify-center
                          rounded-full
                          bg-[var(--color-primary)]
                          px-1
                          text-[8px]
                          font-bold
                          text-white
                        "
                    >
                      {cartCount}
                    </span>
                  )}
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Profile */}

          {user ? (
            <div ref={mobileProfileRef} className="relative min-w-[62px]">
              <button
                type="button"
                onClick={() => setMobileProfileOpen((open) => !open)}
                className={`
                flex
                w-full
                flex-col
                items-center
                justify-center
                gap-1
                rounded-2xl
                px-2
                py-2
                text-[10px]
                font-semibold
                transition
                ${mobileProfileOpen
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)]"
                  }
              `}
              >
                <span
                  className={`
                  flex h-8 w-10
                  items-center
                  justify-center
                  rounded-xl
                  ${mobileProfileOpen ? "bg-[var(--color-primary-50)]" : ""}
                `}
                >
                  {user?.image && !userAvatarError ? (
                    <Image
                      src={toAssetUrl(user.image)}
                      alt={user?.name || "Profile"}
                      width={28}
                      height={28}
                      unoptimized
                      onError={() => setUserAvatarError(true)}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <User size={20} strokeWidth={mobileProfileOpen ? 2.5 : 2} />
                  )}
                </span>

                <span>Profile</span>
              </button>

              {/* Mobile Profile Menu */}

              {mobileProfileOpen && (
                <div
                  className="
                  absolute
                  bottom-[68px]
                  right-0
                  w-52
                  overflow-hidden
                  rounded-2xl
                  border
                  border-[var(--color-border)]
                  bg-white
                  p-2
                  shadow-[0_15px_45px_rgba(45,27,15,0.18)]
                "
                >
                  <Link
                    href="/profile"
                    onClick={() => setMobileProfileOpen(false)}
                    className="
                    flex items-center gap-3
                    rounded-xl
                    px-3 py-3
                    text-sm font-semibold
                    text-[var(--color-text-primary)]
                    hover:bg-[var(--color-primary-50)]
                    hover:text-[var(--color-primary)]
                  "
                  >
                    {user?.image && !userAvatarError ? (
                      <Image
                        src={toAssetUrl(user.image)}
                        alt={user?.name || "Profile"}
                        width={20}
                        height={20}
                        unoptimized
                        onError={() => setUserAvatarError(true)}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <User size={17} />
                    )}
                    Profile
                  </Link>



                  <Link
                    href="/orders"
                    onClick={() => setMobileProfileOpen(false)}
                    className="
                    flex items-center justify-between
                    rounded-xl
                    px-3 py-3
                    text-sm font-semibold
                    text-[var(--color-text-primary)]
                    hover:bg-[var(--color-primary-50)]
                    hover:text-[var(--color-primary)]
                  "
                  >
                    <div className="flex items-center gap-3">
                      <Truck
                        size={17}
                        className="fill-[var(--color-primary)] text-[var(--color-primary)]"
                      />
                      My Orders
                    </div>

                  </Link>
                  <Link
                    href="/favorites"
                    onClick={() => setMobileProfileOpen(false)}
                    className="
                    flex items-center justify-between
                    rounded-xl
                    px-3 py-3
                    text-sm font-semibold
                    text-[var(--color-text-primary)]
                    hover:bg-[var(--color-primary-50)]
                    hover:text-[var(--color-primary)]
                  "
                  >
                    <div className="flex items-center gap-3">
                      <Bookmark
                        size={17}
                        className={
                          wishlistCount > 0
                            ? "fill-[var(--color-primary)] text-[var(--color-primary)]"
                            : ""
                        }
                      />
                      Wishlist
                    </div>
                    {wishlistCount > 0 && (
                      <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold text-white">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>

                  <div className="my-1 h-px bg-[var(--color-border)]" />

                  <button
                    type="button"
                    onClick={() => setLogoutModal(true)}
                    className="
                    flex items-center gap-3
                    rounded-xl
                    px-3 py-3
                    text-sm font-semibold
                    text-[var(--color-error)]
                    hover:bg-red-50
                  "
                  >
                    <LogOut size={17} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex min-w-[62px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold text-[var(--color-text-muted)]"
            >
              <User size={20} />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </nav>

      <LoginModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onOpenRegister={() => {
          setAuthOpen(false);
          setRegisterOpen(true);
        }}
      />
      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onOpenLogin={() => {
          setRegisterOpen(false);
          setAuthOpen(true);
        }}
      />

      <SelectLocationModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        canDismiss={Boolean(deliveryLoc && deliveryLoc.isSet && deliveryLoc.lat && deliveryLoc.lng)}
      />

      <LogoutModal open={logoutModal} onClose={() => setLogoutModal(false)} onConfirm={handleLogout} />
    </>
  );
};

export default Navbar;
