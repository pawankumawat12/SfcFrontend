"use client";

import React, { useState } from "react";
import {
  MapPin,
  Plus,
  Home,
  Briefcase,
  Building,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  LoaderCircle,
  Phone,
  User as UserIcon,
  Compass,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import {
  Address,
  useGetAddressesQuery,
  useSetDefaultAddressMutation,
} from "@/redux/services/addressApi";
import { cartApi } from "@/redux/services/cartApi";
import { useLazyResolveStoreByLocationQuery } from "@/redux/services/branchStoreApi";
import {
  setStoredDeliveryLocation,
  DeliveryLocation,
} from "@/lib/deliveryLocation";
import AddressModal from "./AddressModal";
import DeleteAddressDialog from "./DeleteAddressDialog";
import SkeletonLoader from "./SkeletonLoader";

interface ProfileAddressesProps {
  user: any;
}

export default function ProfileAddresses({ user }: ProfileAddressesProps) {
  const dispatch = useDispatch();
  const [triggerResolveStore] = useLazyResolveStoreByLocationQuery();
  const { data: response, isLoading, isFetching } = useGetAddressesQuery(undefined, {
    skip: !user,
  });
  const addresses: Address[] = response?.data || [];

  const [setDefaultAddress, { isLoading: isSettingDefault }] = useSetDefaultAddressMutation();
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (address: Address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      setSettingDefaultId(addressId);
      await setDefaultAddress(addressId).unwrap();

      const targetAddr = addresses.find((a) => a.id === addressId);
      if (targetAddr) {
        const lat = targetAddr.latitude != null ? Number(targetAddr.latitude) : null;
        const lng = targetAddr.longitude != null ? Number(targetAddr.longitude) : null;
        if (lat != null && lng != null) {
          let resolvedStoreId: number | "admin" = "admin";
          let resolvedStoreName: string = "Main Bakery";
          let canDeliver = true;
          let isOutOfDeliveryZone = false;
          let distanceKm: number | null = null;
          let deliveryWarning: string | null = null;
          let maxDeliveryRadius = 10;

          try {
            const storeRes = await triggerResolveStore({ lat, lng }).unwrap();
            const store = storeRes?.store;
            const isBranch = storeRes?.storeType === "branch" && store?.id;
            resolvedStoreId = isBranch ? Number(store.id) : "admin";
            resolvedStoreName = store?.name || "Main Bakery";
            isOutOfDeliveryZone = Boolean(
              storeRes?.can_deliver === false || (storeRes as any)?.outOfDeliveryZone
            );
            canDeliver = !isOutOfDeliveryZone;
            distanceKm = storeRes?.distanceKm != null ? Number(storeRes.distanceKm) : null;
            deliveryWarning = isOutOfDeliveryZone
              ? (storeRes?.message || "Delivery is available in our covered service areas.")
              : null;
            maxDeliveryRadius = (storeRes as any)?.max_delivery_distance || 10;
          } catch (storeErr) {
            console.warn("Could not resolve store for default address:", storeErr);
          }

          const shortAddr = targetAddr.house_number
            ? `${targetAddr.house_number}, ${targetAddr.city || targetAddr.formatted_address || ""}`
            : (targetAddr.formatted_address || targetAddr.city || "Delivery Address");

          const updatedLoc: DeliveryLocation = {
            lat,
            lng,
            address: targetAddr.formatted_address || `${targetAddr.house_number}, ${targetAddr.city}`,
            shortAddress: shortAddr,
            houseNumber: targetAddr.house_number || "",
            roadArea: targetAddr.formatted_address || "",
            landmark: targetAddr.landmark || "",
            city: targetAddr.city || "Jaipur",
            state: targetAddr.state || "Rajasthan",
            pincode: targetAddr.pincode || "",
            receiverName: targetAddr.receiver_name || user?.name || "",
            phone: targetAddr.phone_number || user?.phone || "",
            label: targetAddr.label || "Home",
            addressId: targetAddr.id,
            storeId: resolvedStoreId,
            storeName: resolvedStoreName,
            isSet: true,
            distanceKm,
            canDeliver,
            outOfDeliveryZone: isOutOfDeliveryZone,
            deliveryWarning,
            maxDeliveryRadius,
          };
          setStoredDeliveryLocation(updatedLoc);
        }
      }

      dispatch(cartApi.util.invalidateTags(["Cart"]));
      toast.success("Default delivery address updated!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to set default address");
    } finally {
      setSettingDefaultId(null);
    }
  };

  const getLabelBadge = (label: string) => {
    const norm = (label || "").toLowerCase();
    if (norm === "home") {
      return {
        icon: Home,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (norm === "work") {
      return {
        icon: Briefcase,
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    }
    return {
      icon: Building,
      className: "bg-purple-50 text-purple-700 border-purple-200",
    };
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-sm">
      {/* SECTION HEADER */}
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary)] shadow-sm">
            <MapPin size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[var(--color-text-primary)]">
                Saved Delivery Addresses
              </h2>
              {addresses.length > 0 && (
                <span className="rounded-full bg-[var(--color-primary-50)] px-2.5 py-0.5 text-[10px] font-black text-[var(--color-primary)]">
                  {addresses.length}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              Manage your delivery locations & default delivery address
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-[var(--color-primary)]
            px-4
            py-2.5
            text-xs
            font-bold
            text-white
            shadow-md
            shadow-[var(--color-primary)]/20
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:bg-[var(--color-primary-dark)]
            hover:shadow-lg
            active:scale-95
          "
        >
          <Plus size={15} />
          <span>Add New Address</span>
        </button>
      </div>

      {/* SECTION BODY */}
      <div className="p-6 sm:p-8">
        {isLoading ? (
          <SkeletonLoader
            variant="card"
            count={2}
            gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2"
          />
        ) : addresses.length === 0 ? (
          /* EMPTY STATE (Swiggy style) */
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-stone-50/50 py-12 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--color-primary-50)] text-[var(--color-primary)] shadow-inner">
              <Compass size={32} />
            </div>
            <h3 className="mt-4 text-sm font-black text-[var(--color-text-primary)] sm:text-base">
              No saved addresses found
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
              Add your home, office, or favorite delivery locations for instant and hassle-free ordering.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-[var(--color-primary)]
                px-5
                py-2.5
                text-xs
                font-bold
                text-white
                shadow-md
                shadow-[var(--color-primary)]/25
                transition
                hover:bg-[var(--color-primary-dark)]
                active:scale-95
              "
            >
              <Plus size={14} />
              <span>Add Your First Address</span>
            </button>
          </div>
        ) : (
          /* SWIGGY / INSTAMART STYLE CARDS GRID */
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {addresses.map((addr) => {
              const labelInfo = getLabelBadge(addr.label);
              const LabelIcon = labelInfo.icon;
              const isDefault = Boolean(addr.is_default);
              const isUpdatingThis = settingDefaultId === addr.id;

              return (
                <div
                  key={addr.id}
                  className={`
                    group
                    relative
                    flex
                    flex-col
                    justify-between
                    overflow-hidden
                    rounded-2xl
                    border-2
                    bg-white
                    transition-all
                    duration-200
                    hover:shadow-md
                    ${
                      isDefault
                        ? "border-[var(--color-primary)] shadow-sm bg-[var(--color-primary-50)]/20"
                        : "border-[var(--color-border)] hover:border-stone-300"
                    }
                  `}
                >
                  <div className="p-5">
                    {/* CARD TOP ROW: LABEL, DEFAULT BADGE, ACTIONS */}
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)]/60 pb-3">
                      {/* Left: Label & Default Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            px-2.5
                            py-1
                            text-[11px]
                            font-black
                            uppercase
                            tracking-wider
                            ${labelInfo.className}
                          `}
                        >
                          <LabelIcon size={13} />
                          {addr.label}
                        </span>

                        {isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                            <Check size={11} strokeWidth={3} />
                            Default
                          </span>
                        )}
                      </div>

                      {/* Right: Action Buttons (Edit / Delete) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(addr)}
                          title="Edit Address"
                          className="
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-[var(--color-border)]
                            bg-white
                            text-[var(--color-text-secondary)]
                            shadow-xs
                            transition
                            hover:border-[var(--color-primary)]
                            hover:bg-[var(--color-primary-50)]
                            hover:text-[var(--color-primary)]
                            active:scale-95
                          "
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingAddress(addr)}
                          title="Delete Address"
                          className="
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-[var(--color-border)]
                            bg-white
                            text-[var(--color-text-secondary)]
                            shadow-xs
                            transition
                            hover:border-red-300
                            hover:bg-red-50
                            hover:text-red-600
                            active:scale-95
                          "
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* RECEIVER INFO */}
                    <div className="mt-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                          <UserIcon size={14} />
                        </div>
                        <span
                          className="text-sm font-black text-[var(--color-text-primary)] truncate"
                          title={addr.receiver_name}
                        >
                          {addr.receiver_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-[var(--color-text-secondary)]">
                        <Phone size={12} className="text-stone-400" />
                        <span>{addr.phone_number}</span>
                      </div>
                    </div>

                    {/* ADDRESS DETAILS */}
                    <div className="mt-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      <p
                        className="font-medium text-[var(--color-text-primary)] break-words"
                        title={`${addr.house_number}${addr.floor ? `, Floor ${addr.floor}` : ""}${addr.building_name ? `, ${addr.building_name}` : ""}`}
                      >
                        {addr.house_number}
                        {addr.floor ? `, Floor ${addr.floor}` : ""}
                        {addr.building_name ? `, ${addr.building_name}` : ""}
                      </p>
                      <p
                        className="mt-0.5 text-[var(--color-text-muted)] line-clamp-2 break-words"
                        title={`${addr.formatted_address}${addr.landmark ? ` (Near ${addr.landmark})` : ""}`}
                      >
                        {addr.formatted_address}
                        {addr.landmark ? ` (Near ${addr.landmark})` : ""}
                      </p>
                      <p className="mt-1 font-semibold text-[var(--color-text-primary)] break-words">
                        {addr.city}, {addr.state} - <span className="font-mono">{addr.pincode}</span>
                      </p>
                    </div>
                  </div>

                  {/* CARD FOOTER / DEFAULT ACTION */}
                  <div className="border-t border-[var(--color-border)]/60 bg-stone-50/70 px-5 py-3">
                    {isDefault ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        <span>Default address for all deliveries</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSettingDefault}
                        onClick={() => handleSetDefault(addr.id)}
                        className="
                          group/btn
                          inline-flex
                          items-center
                          gap-1.5
                          text-xs
                          font-bold
                          text-[var(--color-text-secondary)]
                          transition
                          hover:text-[var(--color-primary)]
                          disabled:opacity-50
                        "
                      >
                        {isUpdatingThis ? (
                          <>
                            <LoaderCircle size={13} className="animate-spin text-[var(--color-primary)]" />
                            <span className="text-[var(--color-primary)]">Setting default...</span>
                          </>
                        ) : (
                          <>
                            <div className="flex h-4 w-4 items-center justify-center rounded-full border border-stone-300 bg-white transition group-hover/btn:border-[var(--color-primary)]">
                              <div className="h-2 w-2 rounded-full bg-transparent transition group-hover/btn:bg-[var(--color-primary)]" />
                            </div>
                            <span>Set as Default Address</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <AddressModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingAddress}
        defaultUserName={user?.name || ""}
        defaultUserPhone={user?.phone || ""}
      />

      {/* DELETE DIALOG */}
      <DeleteAddressDialog
        open={Boolean(deletingAddress)}
        onClose={() => setDeletingAddress(null)}
        address={deletingAddress}
      />
    </div>
  );
}

