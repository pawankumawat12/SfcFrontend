"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Quote,
  Star,
  BadgeCheck,
} from "lucide-react";
import { useGetTestimonialsQuery } from "../redux/services/testimonialApi";
import { toAssetUrl } from "../utils/backendUrl";

interface TestimonialData {
  id: number;
  name: string;
  location?: string | null;
  avatar?: string | null;
  rating: number;
  review: string;
  date_text?: string | null;
  date?: string | null;
}

const FALLBACK_REVIEWS: TestimonialData[] = [
  {
    id: 1,
    name: "Rahul Sharma",
    location: "Jaipur",
    avatar: "RS",
    rating: 5,
    review:
      "Absolutely loved the burger! Everything tasted fresh and the fries were perfectly crispy. Will definitely order again.",
    date_text: "2 days ago",
  },
  {
    id: 2,
    name: "Priya Mehta",
    location: "Jaipur",
    avatar: "PM",
    rating: 5,
    review:
      "The food was amazing and delivery was really quick. The packaging was also neat and everything arrived hot.",
    date_text: "5 days ago",
  },
  {
    id: 3,
    name: "Amit Verma",
    location: "Jaipur",
    avatar: "AV",
    rating: 4,
    review:
      "Great taste and good portion size. The pizza was delicious and the overall experience was really good.",
    date_text: "1 week ago",
  },
  {
    id: 4,
    name: "Neha Gupta",
    location: "Jaipur",
    avatar: "NG",
    rating: 5,
    review:
      "One of my favorite places for quick food. Fresh ingredients, tasty food and friendly service.",
    date_text: "1 week ago",
  },
];

const FALLBACK_SECTION = {
  badge: "Customer Love",
  title: "What Our Customers Say",
  subtitle:
    "Good food makes people happy. Here is what our customers have to say about their experience.",
};

export default function CustomerReviews() {
  const { data } = useGetTestimonialsQuery();

  const section = data?.section || FALLBACK_SECTION;
  const reviews: TestimonialData[] =
    data?.testimonials && data.testimonials.length > 0
      ? data.testimonials
      : FALLBACK_REVIEWS;

  const [activeIndex, setActiveIndex] = useState(0);

  // Keep index within bounds if reviews change
  useEffect(() => {
    if (activeIndex >= reviews.length) {
      setActiveIndex(0);
    }
  }, [reviews.length, activeIndex]);

  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const mouseStartXRef = useRef<number | null>(null);

  /*
   * --------------------------------------------------
   * AUTO SLIDER (Pauses when user hovers or interacts)
   * --------------------------------------------------
   */
  useEffect(() => {
    if (reviews.length <= 1 || isPaused) return;

    const id = setInterval(() => {
      setActiveIndex((current) =>
        current >= reviews.length - 1 ? 0 : current + 1
      );
    }, 5000);

    return () => clearInterval(id);
  }, [reviews.length, isPaused]);

  /*
   * --------------------------------------------------
   * CONTROLS
   * --------------------------------------------------
   */
  const previousReview = () => {
    if (reviews.length <= 1) return;
    setActiveIndex((current) =>
      current === 0 ? reviews.length - 1 : current - 1
    );
  };

  const nextReview = () => {
    if (reviews.length <= 1) return;
    setActiveIndex((current) =>
      current >= reviews.length - 1 ? 0 : current + 1
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

      // Check if horizontal swipe is dominant and > 40px
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX > 0) {
          nextReview();
        } else {
          previousReview();
        }
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    setTimeout(() => setIsPaused(false), 2500);
  };

  // Mouse Drag Handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a")) return;
    isMouseDownRef.current = true;
    mouseStartXRef.current = e.clientX;
    setIsPaused(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isMouseDownRef.current && mouseStartXRef.current !== null) {
      const diffX = mouseStartXRef.current - e.clientX;
      if (Math.abs(diffX) > 45) {
        if (diffX > 0) {
          nextReview();
        } else {
          previousReview();
        }
      }
    }
    isMouseDownRef.current = false;
    mouseStartXRef.current = null;
    setTimeout(() => setIsPaused(false), 2500);
  };

  /*
   * --------------------------------------------------
   * STAR COMPONENT
   * --------------------------------------------------
   */
  const Stars = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            size={15}
            fill={index < rating ? "currentColor" : "transparent"}
            className={
              index < rating
                ? "text-[var(--color-secondary)]"
                : "text-[var(--color-border)]"
            }
          />
        ))}
      </div>
    );
  };

  // Average Rating
  const avgRatingNumber =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length
      : 4.9;
  const avgRatingDisplay = avgRatingNumber.toFixed(1);

  // Desktop reviews window (show 3 reviews starting from activeIndex if multiple reviews)
  const desktopReviews =
    reviews.length <= 3
      ? reviews
      : Array.from({ length: 3 }).map(
          (_, i) => reviews[(activeIndex + i) % reviews.length]
        );

  return (
    <section className="relative overflow-hidden bg-[var(--bg-body)] px-4 py-14 md:px-8 md:py-10">
      {/* =====================================================
          BACKGROUND DECORATION
      ===================================================== */}
      <div
        className="
          pointer-events-none
          absolute
          left-[-120px]
          top-20
          h-72
          w-72
          rounded-full
          bg-[var(--color-primary)]
          opacity-[0.04]
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          right-[-120px]
          bottom-10
          h-80
          w-80
          rounded-full
          bg-[var(--color-secondary)]
          opacity-[0.05]
          blur-3xl
        "
      />

      <div className="relative mx-auto max-w-7xl">
        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="mx-auto max-w-2xl text-center">
          {/* Label */}
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-secondary)]" />
            <span
              className="
                text-xs
                font-bold
                uppercase
                tracking-[0.18em]
                text-[var(--color-secondary)]
              "
            >
              {section.badge || "Customer Love"}
            </span>
            <span className="h-2 w-2 rounded-full bg-[var(--color-secondary)]" />
          </div>

          {/* Heading */}
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
            {section.title || "What Our Customers Say"}
          </h2>

          {section.subtitle && (
            <p
              className="
                mt-4
                text-sm
                leading-6
                text-[var(--color-text-secondary)]
                md:text-base
              "
            >
              {section.subtitle}
            </p>
          )}
        </div>

        {/* =====================================================
            RATING SUMMARY
        ===================================================== */}
        <div
          className="
            mx-auto
            mt-8
            flex
            w-fit
            flex-col
            items-center
            justify-center
            gap-3
            rounded-2xl
            border
            border-[var(--color-border)]
            bg-white
            px-7
            py-4
            shadow-sm
            sm:flex-row
            sm:gap-5
          "
        >
          {/* Rating number */}
          <div className="text-center sm:text-left">
            <p
              className="
                text-3xl
                font-black
                leading-none
                text-[var(--color-text-primary)]
              "
            >
              {avgRatingDisplay}
            </p>

            <p
              className="
                mt-1
                text-[10px]
                font-medium
                text-[var(--color-text-muted)]
              "
            >
              out of 5
            </p>
          </div>

          {/* Stars */}
          <div>
            <Stars rating={Math.round(avgRatingNumber)} />

            <p
              className="
                mt-1.5
                text-xs
                text-[var(--color-text-muted)]
              "
            >
              Based on {Math.max(reviews.length * 125, 500)}+ reviews
            </p>
          </div>
        </div>

        {/* =====================================================
            REVIEWS
        ===================================================== */}
        <div
          className="relative mt-10 select-none cursor-grab active:cursor-grabbing"
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
          {/* Desktop Previous */}
          {reviews.length > 3 && (
            <button
              type="button"
              aria-label="Previous review"
              onClick={previousReview}
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
                bg-white
                text-[var(--color-text-primary)]
                shadow-lg
                transition
                hover:scale-105
                hover:text-[var(--color-primary)]
                md:flex
              "
            >
              <ChevronLeft size={19} />
            </button>
          )}

          {/* =================================================
              DESKTOP REVIEWS
          ================================================= */}
          <div className="hidden gap-5 md:grid md:grid-cols-3">
            {desktopReviews.map((review, idx) => (
              <ReviewCard
                key={`${review.id}-${idx}`}
                review={review}
                Stars={Stars}
              />
            ))}
          </div>

          {/* =================================================
              MOBILE REVIEW
          ================================================= */}
          <div className="md:hidden">
            <div className="overflow-hidden rounded-2xl">
              <div
                className="flex transition-transform duration-500"
                style={{
                  transform: `translateX(-${activeIndex * 100}%)`,
                }}
              >
                {reviews.map((review) => (
                  <div key={review.id} className="w-full shrink-0 px-1">
                    <ReviewCard review={review} Stars={Stars} />
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Navigation Controls: Arrows + Dots */}
            {reviews.length > 1 && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  aria-label="Previous review"
                  onClick={previousReview}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-xs transition hover:scale-105 hover:text-[var(--color-primary)]"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1.5">
                  {reviews.map((review, index) => (
                    <button
                      key={review.id}
                      type="button"
                      aria-label={`Go to review ${index + 1}`}
                      onClick={() => setActiveIndex(index)}
                      className={`
                        h-2
                        rounded-full
                        transition-all
                        duration-300
                        ${
                          activeIndex === index
                            ? "w-6 bg-[var(--color-primary)]"
                            : "w-2 bg-[var(--color-primary)]/25"
                        }
                      `}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  aria-label="Next review"
                  onClick={nextReview}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-xs transition hover:scale-105 hover:text-[var(--color-primary)]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Desktop Next */}
          {reviews.length > 3 && (
            <button
              type="button"
              aria-label="Next review"
              onClick={nextReview}
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
                bg-white
                text-[var(--color-text-primary)]
                shadow-lg
                transition
                hover:scale-105
                hover:text-[var(--color-primary)]
                md:flex
              "
            >
              <ChevronRight size={19} />
            </button>
          )}
        </div>

        {/* =====================================================
            BOTTOM TRUST MESSAGE
        ===================================================== */}
        <div className="mt-10 flex justify-center">
          <div
            className="
              flex
              items-center
              gap-2
              rounded-full
              bg-[var(--color-primary-50)]
              px-5
              py-2.5
              text-xs
              font-semibold
              text-[var(--color-primary)]
            "
          >
            <BadgeCheck size={16} />
            Loved by food lovers
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   REVIEW CARD
============================================================ */

function ReviewCard({
  review,
  Stars,
}: {
  review: TestimonialData;
  Stars: React.ComponentType<{ rating: number }>;
}) {
  const isImageUrl =
    review.avatar &&
    (review.avatar.startsWith("http") ||
      review.avatar.startsWith("/") ||
      review.avatar.includes("."));

  const initials =
    !isImageUrl && review.avatar
      ? review.avatar
      : (review.name || "Customer")
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "C";

  const dateText = review.date_text || review.date || "Recently";

  return (
    <article
      className="
        group
        relative
        flex
        min-h-[280px]
        flex-col
        rounded-2xl
        border
        border-[var(--color-border)]
        bg-white
        p-6
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-[var(--color-primary)]/30
        hover:shadow-[0_18px_40px_rgba(79,125,22,0.10)]
      "
    >
      {/* Quote */}
      <div
        className="
          absolute
          right-5
          top-5
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-full
          bg-[var(--color-primary-50)]
          text-[var(--color-primary)]
        "
      >
        <Quote size={17} fill="currentColor" />
      </div>

      {/* Stars */}
      <Stars rating={review.rating || 5} />

      {/* Review */}
      <p
        className="
          mt-5
          flex-1
          text-sm
          leading-7
          text-[var(--color-text-secondary)]
        "
      >
        "{review.review}"
      </p>

      {/* Divider */}
      <div className="my-5 h-px bg-[var(--color-border)]" />

      {/* Customer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {isImageUrl && review.avatar ? (
            <img
              src={toAssetUrl(review.avatar)}
              alt={review.name}
              className="h-11 w-11 shrink-0 rounded-full object-cover border border-[var(--color-border)]"
            />
          ) : (
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-[var(--color-primary)]
                text-xs
                font-black
                text-white
              "
            >
              {initials}
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <h4
                className="
                  text-sm
                  font-bold
                  text-[var(--color-text-primary)]
                "
              >
                {review.name}
              </h4>

              <BadgeCheck size={14} className="text-[var(--color-primary)]" />
            </div>

            <p
              className="
                mt-0.5
                text-[10px]
                text-[var(--color-text-muted)]
              "
            >
              {review.location || "Verified Buyer"}
            </p>
          </div>
        </div>

        {/* Date */}
        <span
          className="
            text-[10px]
            text-[var(--color-text-muted)]
          "
        >
          {dateText}
        </span>
      </div>
    </article>
  );
}