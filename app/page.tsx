import React from "react";
import Hero from "../components/Hero";
import PopularPreview from "../components/PopularPreview";
import PopularProducts from "@/components/PopularProducts";
import SpecialOffers from "@/components/SpecialOffers";
import ReelsSlider from "@/components/ReelsSlider";
import WhyChooseUs from "@/components/WhyChooseUs";
import CustomerReviews from "@/components/CustomerReviews";
import LocationContact from "@/components/LocationContact";

const page = () => {
  return (
    <main>
      <Hero />
      <PopularPreview />
      <PopularProducts />
      <SpecialOffers />
      <ReelsSlider />
      <WhyChooseUs />
      <CustomerReviews />
      <LocationContact />
    </main>
  );
};

export default page;