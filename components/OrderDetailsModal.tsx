"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import toast from "react-hot-toast";
import { toAssetUrl, getApiUrl } from "@/utils/backendUrl";
import { useGetFooterQuery } from "@/redux/services/settingsApi";
import {
  X,
  MapPin,
  User,
  Phone,
  Receipt,
  Banknote,
  CreditCard,
  MessageCircle,
  RotateCcw,
  CheckCircle2,
  Clock3,
  Truck,
  XCircle,
  Package,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileText,
  Download,
  Loader2,
  Store,
  ChefHat,
} from "lucide-react";

interface OrderItem {
  id: number | string;
  name?: string;
  product_name?: string;
  qty?: number;
  quantity?: number;
  paid_quantity?: number;
  free_quantity?: number;
  bogo_details_json?: any;
  price: number;
  total?: number;
  img?: string;
  image?: string;
  availability_type?: string;
  production_status?: string;
}

interface OrderDetailsModalProps {
  order: any | null;
  onClose: () => void;
  onOpenChat?: (order: any) => void;
  onRetryPayment?: (order: any) => void;
  retryingOrderId?: number | null;
}


function formatRupee(value: number) {
  const num = Math.round(Number(value || 0));
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Delivered":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
          <CheckCircle2 size={13} />
          Delivered
        </span>
      );
    case "Accepted":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
          <CheckCircle2 size={13} />
          Accepted
        </span>
      );
    case "Preparing":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
          <Clock3 size={13} />
          Preparing
        </span>
      );
    case "Out for Delivery":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700">
          <Truck size={13} />
          Out for Delivery
        </span>
      );
    case "Cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-700">
          <XCircle size={13} />
          Cancelled
        </span>
      );
    case "Pending Payment":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
          <CreditCard size={14} />
          Payment Pending
        </span>
      );
    case "Pending":
    case "Order Placed":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          <Clock3 size={14} />
          {status || "Pending"}
        </span>
      );
  }
}

export default function OrderDetailsModal({
  order,
  onClose,
  onOpenChat,
  onRetryPayment,
  retryingOrderId,
}: OrderDetailsModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const accessToken = useSelector((state: RootState) => state.auth?.accessToken);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDownloadInvoice = async () => {
    const orderId = order?.dbId || order?.id;
    if (!orderId) return;
    try {
      setIsDownloading(true);
      const token =
        accessToken ||
        (typeof window !== "undefined" ? localStorage.getItem("accessToken") : "") ||
        "";

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${getApiUrl()}/orders/${orderId}/invoice`, {
        credentials: "include",
        headers,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Failed to download invoice");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order.order_number || order.id || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Unable to download invoice");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!order) return null;

  const isPendingPayment =
    Boolean(order) &&
    (order.status === "Pending Payment" ||
      ((order.payment === "Online Payment" || order.payment_method === "Online Payment") &&
        order.paymentStatus !== "Paid" &&
        order.payment_status !== "Paid")) &&
    order.status !== "Cancelled";

  const p = order.pricingJson || {};
  const subtotal = Math.round(Number(p.subtotal ?? order.subtotal ?? 0));
  const discount = Math.round(Number(p.discount ?? order.discount ?? 0));
  const deliveryFee = Math.round(Number(p.delivery_fee ?? order.deliveryFee ?? 0));
  const packagingFee = Math.round(Number(p.packaging_fee ?? 0));
  const platformFee = Math.round(Number(p.platform_fee ?? 0));
  const codFee = Math.round(Number(p.cod_fee ?? 0));
  const taxAmount = Math.round(Number(p.tax_amount ?? order.taxAmount ?? 0));
  const grandTotal = Math.round(Number(p.grand_total ?? order.total ?? 0));
  const isFreeDelivery = Boolean(p.is_free_delivery || (deliveryFee === 0 && subtotal > 0));

  const isCancelled = order.status === "Cancelled";

  const timelineSteps = [
    { key: "Pending", label: "Order Placed", stepNumber: 1, icon: Receipt },
    { key: "Accepted", label: "Accepted", stepNumber: 2, icon: CheckCircle2 },
    { key: "Preparing", label: "In Kitchen", stepNumber: 3, icon: ChefHat },
    { key: "Out for Delivery", label: "Out for Delivery", stepNumber: 4, icon: Truck },
    { key: "Delivered", label: "Delivered", stepNumber: 5, icon: Package },
  ];

  const getActiveStepIndex = () => {
    const s = String(order.status || "").toLowerCase().trim();
    if (s === "delivered" || s === "completed") return 5;
    if (s === "out for delivery" || s === "out_for_delivery") return 4;
    if (s === "preparing" || s === "in kitchen" || s === "cooking") return 3;
    if (s === "accepted" || s === "confirmed") return 2;
    return 1;
  };

  const { data: footerResponse } = useGetFooterQuery();
  const adminFooter = footerResponse?.data;

  const currentStep = getActiveStepIndex();
  const isForwardedToStore = Boolean(order.is_forwarded_to_store);
  const isAccepted = isForwardedToStore && currentStep >= 2;

  // When order is NOT dispatched to a store yet, show Admin / Main Bakery details.
  // Once dispatched to a store, show the assigned store's details.
  const storeName = isForwardedToStore
    ? (order.store_name || order.storeName || (order.store_id ? `Branch #${order.store_id}` : "Assigned Branch"))
    : "Main Bakery & Kitchen (Admin)";

  const storeAddress = isForwardedToStore
    ? (order.store_address || order.storeAddress || "Branch Address")
    : (order.admin_address || adminFooter?.location || "SFC Bakers Central Kitchen & Main Bakery");

  const storePhone = isForwardedToStore
    ? (order.store_phone || order.storePhone || order.store_owner_phone || "")
    : (order.admin_phone || adminFooter?.phone_number || "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-details-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl my-auto rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-[var(--color-primary-50)]/40 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-md">
              <Receipt size={20} />
            </div>
            <div  className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="order-details-title"
                  className="text-base sm:text-lg font-black text-[var(--color-text-primary)]"
                >
                  Order #{order.id}
                </h2>
                <StatusBadge status={order.status} />
              </div>
              <div>
                <span>Payment: </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    order.paymentStatus === "Paid"
                      ? "bg-emerald-100 text-emerald-800"
                      : order.paymentStatus === "Refunded"
                        ? "bg-stone-200 text-stone-800"
                        : order.paymentStatus === "Partially Refunded" || order.paymentStatus === "PARTIALLY_REFUNDED"
                          ? "bg-purple-100 text-purple-800"
                          : order.paymentStatus === "Failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                  }`}
                >
                  <ShieldCheck size={11} />
                  {order.paymentStatus === "PARTIALLY_REFUNDED"
                    ? "Partially Refunded"
                    : order.paymentStatus || "Pending"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                <Calendar size={12} />
                <span>
                  Placed on {order.date} at {order.time}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Order Progress Tracker */}
          {isCancelled ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-red-800">
                    Order Cancelled
                  </h4>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    {order.cancel_reason ||
                      "This order was declined or cancelled. If you were charged online, a refund will be processed to your original payment source."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-border)] bg-stone-50/60 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                  Live Order Tracker
                </p>
                {isAccepted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 size={12} /> Accepted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/70 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Clock3 size={12} className="animate-spin text-amber-600" /> Waiting for Store Confirmation
                  </span>
                )}
              </div>

              {/* 5-Step Horizontal Timeline */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center relative items-start">
                {/* Connecting Progress Bar */}
                <div
                  className="absolute top-[18px] left-[10%] right-[10%] h-[3px] -translate-y-1/2 bg-stone-200 z-0 rounded-full"
                  aria-hidden="true"
                >
                  <div
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${((Math.min(Math.max(currentStep, 1), 5) - 1) / 4) * 100}%`,
                    }}
                  />
                </div>

                {timelineSteps.map((step, idx) => {
                  const isCompleted = currentStep >= step.stepNumber;
                  const isCurrent = currentStep === step.stepNumber;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div
                        className={`
                          flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all relative z-10
                          ${
                            isCompleted
                              ? "bg-[var(--color-primary)] text-white shadow-sm"
                              : "bg-stone-200 text-stone-500"
                          }
                          ${isCurrent ? "ring-4 ring-[var(--color-primary-50)] scale-110" : ""}
                        `}
                      >
                        {isCompleted ? <CheckCircle2 size={16} /> : <StepIcon size={14} />}
                      </div>
                      <p
                        className={`mt-1.5 text-[9px] sm:text-[10.5px] font-bold leading-tight ${
                          isCompleted ? "text-[var(--color-text-primary)]" : "text-stone-400"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Live Status Message & Store Confirmation Banner */}
              {isPendingPayment ? (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-left shadow-sm">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5 shrink-0 mt-0.5 sm:mt-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <div>
                      <p className="text-xs font-black text-amber-950">Online Payment Incomplete</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Your payment has not been received. Please complete payment so our kitchen can prepare your order.
                      </p>
                    </div>
                  </div>
                  {onRetryPayment && (
                    <button
                      type="button"
                      onClick={() => onRetryPayment(order)}
                      disabled={retryingOrderId === (order.dbId || order.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      <CreditCard size={14} />
                      <span>{retryingOrderId === (order.dbId || order.id) ? "Initializing..." : "Pay Now"}</span>
                    </button>
                  )}
                </div>
              ) : isAccepted ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-left shadow-xs">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-emerald-950 flex items-center gap-2 flex-wrap">
                      <span>Order Confirmed & Accepted!</span>
                      <span className="text-[10px] font-bold bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full">
                        {storeName}
                      </span>
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      {currentStep === 2 && `Your order has been officially accepted by ${storeName}. Kitchen preparation will begin shortly.`}
                      {currentStep === 3 && `The kitchen at ${storeName} is freshly baking and preparing your delicious items right now.`}
                      {currentStep === 4 && `Your food is ready and packed! The delivery rider from ${storeName} is out for delivery.`}
                      {currentStep === 5 && `Your order was delivered successfully from ${storeName}. Thank you for ordering with us!`}
                    </p>
                  </div>
                </div>
              ) : isForwardedToStore ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/90 p-3.5 text-left shadow-xs">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                    <Clock3 size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-blue-950">
                      Dispatched to Branch • Awaiting Store Confirmation
                    </p>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                      Your order has been forwarded to <strong>{storeName}</strong>. As soon as the branch reviews and accepts your order, complete store contact information and live preparation status will be unlocked here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-left shadow-xs">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                    <Clock3 size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-amber-950">
                      Order Placed • Processing at Central Kitchen (Admin)
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Your order has been received by our <strong>Main Bakery & Central Kitchen</strong>. Once dispatched to the nearest branch, you will see the branch details and live kitchen updates here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fulfillment Location / Branch Information Card */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isForwardedToStore
                    ? "bg-[var(--color-primary-50)] text-[var(--color-primary)]"
                    : "bg-amber-50 text-amber-700"
                }`}>
                  <Store size={18} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                    {isForwardedToStore ? "Fulfillment Branch" : "Processing Location (Admin)"}
                  </h3>
                  <p className="text-sm font-black text-[var(--color-text-primary)]">
                    {storeName}
                  </p>
                </div>
              </div>

              {isForwardedToStore ? (
                isAccepted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 size={11} /> Store Accepted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                    <Clock3 size={11} /> Dispatched to Store
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                  <Clock3 size={11} /> Main Bakery (Admin)
                </span>
              )}
            </div>

            <div className="mt-3.5 space-y-3 text-xs">
              {/* Address */}
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {isForwardedToStore ? "Branch Address: " : "Admin / Main Bakery Address: "}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {storeAddress}
                  </span>
                </div>
              </div>

              {/* Contact Number & Call Store Button */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-stone-100">
                <div className="flex items-center gap-2.5">
                  <Phone size={15} className="text-[var(--color-primary)] shrink-0" />
                  <div>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {isForwardedToStore ? "Store Contact: " : "Admin Support Contact: "}
                    </span>
                    {isForwardedToStore ? (
                      isAccepted ? (
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {storePhone || "Available via Support Chat"}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">
                          Contact details unlock once order is accepted
                        </span>
                      )
                    ) : storePhone ? (
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {storePhone}
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">
                        SFC Bakery Central Support
                      </span>
                    )}
                  </div>
                </div>

                {isForwardedToStore ? (
                  isAccepted && storePhone ? (
                    <a
                      href={`tel:${storePhone}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      <Phone size={12} />
                      Call Branch
                    </a>
                  ) : null
                ) : storePhone ? (
                  <a
                    href={`tel:${storePhone}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark,#3f6412)] text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition active:scale-95"
                  >
                    <Phone size={12} />
                    Call Helpline
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                <Package size={14} />
                <span>Items in this Order ({order.items?.length || 0})</span>
              </h3>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden">
              {(order.items || []).map((item: OrderItem) => {
                const name = item.product_name || item.name || "Item";
                const totalQty = Number(item.quantity ?? item.qty ?? 1);
                const paidQty =
                  item.paid_quantity != null
                    ? Number(item.paid_quantity)
                    : item.free_quantity
                    ? totalQty - Number(item.free_quantity)
                    : totalQty;
                const freeQty = Number(item.free_quantity || 0);
                const lineTotal =
                  item.total != null
                    ? Math.round(Number(item.total))
                    : Math.round(Number(item.price) * paidQty);
                const img = item.image || item.img;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 p-3.5 bg-white transition hover:bg-stone-50/50"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                      {img ? (
                        <Image
                          src={toAssetUrl(img)}
                          alt={name}
                          fill
                          unoptimized
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-stone-400">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-xs font-black text-[var(--color-text-primary)] truncate"
                          title={name}
                        >
                          {name}
                        </p>
                        {freeQty > 0 && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-800">
                            BOGO: +{freeQty} Free
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {formatRupee(item.price)} × {paidQty} paid
                        {freeQty > 0 ? (
                          <span className="text-emerald-700 font-bold">
                            {" "}+ {freeQty} FREE (Total: {totalQty})
                          </span>
                        ) : (
                          ""
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-[var(--color-text-primary)]">
                        {formatRupee(lineTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Special Instructions / Order Note */}
          {order.notes && order.notes.trim() && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5 mb-1.5">
                <FileText size={13} />
                <span>Special Instructions / Order Note</span>
              </p>
              <p className="text-xs text-amber-950 font-medium leading-relaxed whitespace-pre-line">
                "{order.notes.trim()}"
              </p>
            </div>
          )}

          {/* Two-Column Grid: Delivery Address & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Delivery Address */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-stone-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1 mb-2">
                <MapPin size={12} /> Delivery Address
              </p>
              {order.customerName && (
                <p className="text-xs font-black text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <User size={13} className="text-[var(--color-primary)]" />
                  <span>{order.customerName}</span>
                </p>
              )}
              {order.customerPhone && (
                <p className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1.5 mt-1">
                  <Phone size={12} className="text-stone-400" />
                  <span>{order.customerPhone}</span>
                </p>
              )}
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                {order.address}
              </p>
            </div>

          </div>

          {/* Bill Breakdown */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-stone-50/30 p-4 sm:p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
              Bill Summary
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>Item Subtotal</span>
                <span>{formatRupee(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount Savings</span>
                  <span>- {formatRupee(discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>Delivery Partner Fee</span>
                <span>
                  {isFreeDelivery ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    formatRupee(deliveryFee)
                  )}
                </span>
              </div>

              {packagingFee > 0 && (
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Packaging & Handling</span>
                  <span>{formatRupee(packagingFee)}</span>
                </div>
              )}

              {platformFee > 0 && (
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Platform Fee</span>
                  <span>{formatRupee(platformFee)}</span>
                </div>
              )}

              {codFee > 0 && (
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Cash on Delivery Handling</span>
                  <span>{formatRupee(codFee)}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Taxes & GST</span>
                  <span>{formatRupee(taxAmount)}</span>
                </div>
              )}

              <div className="border-t border-[var(--color-border)] pt-2 mt-2 flex justify-between items-center text-sm font-black text-[var(--color-text-primary)]">
                <span>Grand Total</span>
                <span className="text-base text-[var(--color-primary)]">
                  {formatRupee(grandTotal)}
                </span>
              </div>

              {(order.paymentStatus === "Refunded" ||
                order.paymentStatus === "Partially Refunded" ||
                order.paymentStatus === "PARTIALLY_REFUNDED") && (
                <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50/80 p-3 text-xs">
                  <div className="flex justify-between font-bold text-purple-950">
                    <span>
                      {order.paymentStatus === "Refunded" ? "Refund Status" : "Partial Refund Status"}
                    </span>
                    <span className="text-purple-700">
                      {order.paymentStatus === "Refunded" ? "Full Refund Processed" : "Partially Refunded"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-purple-800 leading-relaxed">
                    Refund has been initiated to your original payment method via Razorpay. It typically reflects in your bank account or card within 5–7 business days.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="border-t border-[var(--color-border)] px-5 py-3.5 sm:px-6 sm:py-4 bg-stone-50/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {isPendingPayment && onRetryPayment && (
              <button
                type="button"
                onClick={() => onRetryPayment(order)}
                disabled={retryingOrderId === (order.dbId || order.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <CreditCard size={14} />
                <span>{retryingOrderId === (order.dbId || order.id) ? "Initializing..." : "Pay Now"}</span>
              </button>
            )}

       
            {onOpenChat && (() => {
              const isChatExpired =
                order.chatStatus?.isExpired ??
                order.chat_status?.is_expired ??
                ((String(order.status) === "Delivered" ||
                  String(order.status) === "Completed") &&
                  order.delivered_at &&
                  Date.now() >
                    new Date(order.delivered_at).getTime() + 20 * 60 * 1000);

              return (
                <button
                  type="button"
                  disabled={isChatExpired}
                  onClick={() => {
                    if (!isChatExpired) {
                      onClose();
                      onOpenChat(order);
                    }
                  }}
                  title={
                    isChatExpired
                      ? "Chat closed 20 minutes after delivery"
                      : "Chat with Store"
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                    isChatExpired
                      ? "border-stone-300 bg-stone-100 text-stone-400 cursor-not-allowed opacity-60"
                      : "border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                  }`}
                >
                  <MessageCircle size={14} />
                  <span>
                    {isChatExpired
                      ? "Chat Closed"
                      : isForwardedToStore
                      ? "Chat with Store"
                      : "Chat with Support"}
                  </span>
                </button>
              );
            })()}

            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-xs font-bold text-[var(--color-text-primary)] hover:bg-stone-100 transition"
            >
              <RotateCcw size={14} />
              <span>Order Again</span>
            </Link>

            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 px-3.5 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isDownloading ? <Loader2 size={14} className="animate-spin text-stone-500" /> : <Download size={14} />}
              <span>{isDownloading ? "Downloading..." : "Download Invoice"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-stone-200 hover:bg-stone-300 px-5 py-2 text-xs font-bold text-stone-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

