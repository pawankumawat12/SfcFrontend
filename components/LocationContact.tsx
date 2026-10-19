"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  MapPin,
  Phone,
  Clock3,
  Navigation,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useGetFooterQuery, useGetOrderPricingQuery } from "@/redux/services/settingsApi";

const StoreLocationMap = dynamic(() => import("@/components/StoreLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[360px] lg:min-h-[500px] w-full bg-stone-100 flex items-center justify-center text-xs text-stone-400">
      Loading bakery location map...
    </div>
  ),
});

export default function LocationContact() {
  const { data: settings } = useGetFooterQuery();
  const settingData = settings?.data;
  const { data: pricingResponse } = useGetOrderPricingQuery();
  const pricingData = pricingResponse?.data;
  const storeLat = pricingData?.store_latitude;
  const storeLng = pricingData?.store_longitude;
  const hasStoreCoords =
    storeLat != null &&
    storeLng != null &&
    Number(storeLat) !== 0 &&
    Number(storeLng) !== 0;

  const location = {
    name: "SFC Bakers",
    address: settingData?.location || "123 Main Street, Jaipur, Rajasthan 302017",
    phone: settingData?.phone_number || "+91 98765 43210",
    mapUrl: hasStoreCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${storeLat},${storeLng}&travelmode=driving`
      : settingData?.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`SFC Bakers ${settingData.location}`)}`
      : "https://www.google.com/maps/search/?api=1&query=SFC+Bakers+Jaipur",
  };

  const timings = [
    {
      day: "Monday - Friday",
      time: settingData?.working_hours || "10:00 AM - 11:00 PM",
    },
    {
      day: "Saturday - Sunday",
      time: "9:00 AM - 11:30 PM",
    },
  ];

  return (
    <section className="bg-white px-4 pt-14 pb-28 md:px-8 md:py-20">
      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-10 text-center">

          <div className="mb-3 flex items-center justify-center gap-2">
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
              Come Visit Us
            </span>

            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
          </div>

          <h2
            className="
              text-3xl
              font-black
              tracking-tight
              text-[var(--color-text-primary)]
              md:text-4xl
              lg:text-5xl
            "
          >
            Find Us Near You
          </h2>

          <p
            className="
              mx-auto
              mt-3
              max-w-xl
              text-sm
              leading-6
              text-[var(--color-text-secondary)]
              md:text-base
            "
          >
            Drop by for freshly prepared food, or order online
            and enjoy your favorites from home.
          </p>
        </div>

        {/* =====================================================
            MAIN GRID
        ===================================================== */}

        <div
          className="
            grid
            overflow-hidden
            rounded-3xl
            border
            border-[var(--color-border)]
            bg-[var(--color-cream)]
            shadow-sm
            lg:grid-cols-2
          "
        >

          {/* =================================================
              MAP / LOCATION VISUAL
          ================================================= */}

          <div className="relative min-h-[380px] overflow-hidden rounded-3xl lg:min-h-[500px]">
            <StoreLocationMap
              latitude={storeLat}
              longitude={storeLng}
              address={location.address}
              storeName={location.name}
              height="100%"
              showDirectionsBar={true}
              className="h-full min-h-[380px] lg:min-h-[500px]"
            />
          </div>

          {/* =================================================
              CONTACT INFORMATION
          ================================================= */}

          <div className="p-6 sm:p-8 lg:p-12">

            {/* Heading */}

            <div className="mb-8">

              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-[var(--color-primary-50)]
                  px-3
                  py-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-[var(--color-primary)]
                "
              >
                <MapPin size={12} />

                Our Location
              </span>

              <h3
                className="
                  mt-4
                  text-2xl
                  font-black
                  text-[var(--color-text-primary)]
                  md:text-3xl
                "
              >
                Visit SFC Bakers
              </h3>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-[var(--color-text-secondary)]
                "
              >
                Come enjoy your favorite food with us.
                We would love to serve you.
              </p>
            </div>

            {/* =================================================
                ADDRESS
            ================================================= */}

            <div className="space-y-5">

              <div className="flex gap-4">

                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--color-primary-50)]
                    text-[var(--color-primary)]
                  "
                >
                  <MapPin size={20} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Address
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-primary)]">
                    {location.address}
                  </p>
                </div>

              </div>

              {/* =================================================
                  PHONE
              ================================================= */}

              <div className="flex gap-4">

                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--color-secondary)]/10
                    text-[var(--color-secondary)]
                  "
                >
                  <Phone size={19} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Phone
                  </p>

                  <a
                    href={`tel:${location.phone.replace(/\s/g, "")}`}
                    className="
                      mt-1
                      block
                      text-sm
                      font-bold
                      text-[var(--color-text-primary)]
                      transition
                      hover:text-[var(--color-primary)]
                    "
                  >
                    {location.phone}
                  </a>
                </div>

              </div>

              {/* =================================================
                  HOURS
              ================================================= */}

              <div className="flex gap-4">

                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[var(--color-primary-50)]
                    text-[var(--color-primary)]
                  "
                >
                  <Clock3 size={19} />
                </div>

                <div className="flex-1">

                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Opening Hours
                  </p>

                  <div className="mt-2 space-y-1.5">
                    {timings.map((item) => (
                      <div
                        key={item.day}
                        className="flex items-center justify-between gap-5 text-sm"
                      >
                        <span className="font-medium text-[var(--color-text-secondary)]">
                          {item.day}
                        </span>

                        <span className="whitespace-nowrap font-bold text-[var(--color-text-primary)]">
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* =================================================
                BUTTONS
            ================================================= */}

            <div
              className="
                mt-9
                grid
                gap-3
                sm:grid-cols-2
              "
            >

              {/* Directions */}

              <a
                href={location.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex
                  min-h-[48px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-[var(--color-primary)]
                  bg-white
                  px-5
                  text-sm
                  font-bold
                  text-[var(--color-primary)]
                  transition-all
                  hover:-translate-y-0.5
                  hover:bg-[var(--color-primary-50)]
                "
              >
                <Navigation size={17} />

                Get Directions

                <ExternalLink size={13} />
              </a>

              {/* Order */}

              <Link
                href="/menu"
                className="
                  inline-flex
                  min-h-[48px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[var(--color-primary)]
                  px-5
                  text-sm
                  font-bold
                  text-white
                  shadow-md
                  transition-all
                  hover:-translate-y-0.5
                  hover:bg-[var(--color-primary-dark)]
                "
                style={{color: "white"}}
              >
                Order Online

                <ArrowRight size={17} />
              </Link>
            </div>

            {/* Mobile call */}

            <a
              href={`tel:${location.phone.replace(/\s/g, "")}`}
              className="
                mt-3
                flex
                min-h-[48px]
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[var(--color-secondary)]/10
                text-sm
                font-bold
                text-[var(--color-secondary)]
                transition
                hover:bg-[var(--color-secondary)]/15
                sm:hidden
              "
            >
              <Phone size={17} />

              Call Bakery Owner
            </a>
          </div>
        </div>


        <div
          className="
            mt-6
            grid
            gap-3
            sm:grid-cols-3
          "
        >

          <div
            className="
              rounded-2xl
              border
              border-[var(--color-border)]
              bg-[var(--color-cream)]
              px-5
              py-4
              text-center
            "
          >
            <p className="text-sm font-black text-[var(--color-text-primary)]">
              Dine In
            </p>

            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Comfortable seating available
            </p>
          </div>

          <div
            className="
              rounded-2xl
              border
              border-[var(--color-border)]
              bg-[var(--color-cream)]
              px-5
              py-4
              text-center
            "
          >
            <p className="text-sm font-black text-[var(--color-text-primary)]">
              Takeaway
            </p>

            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Quick pickup at the cafe
            </p>
          </div>

          <div
            className="
              rounded-2xl
              border
              border-[var(--color-border)]
              bg-[var(--color-cream)]
              px-5
              py-4
              text-center
            "
          >
            <p className="text-sm font-black text-[var(--color-text-primary)]">
              Home Delivery
            </p>

            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Fresh food at your doorstep
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}