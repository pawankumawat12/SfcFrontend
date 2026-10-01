"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Clock3,
  MapPin,
  ShoppingBag,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageCircle,
  Banknote,
  Eye,
  CreditCard,
  Store,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import OrderChat from "./OrderChat";
import OrderDetailsModal from "./OrderDetailsModal";
import Pagination from "./Pagination";
import SkeletonLoader from "./SkeletonLoader";
import {
  useGetOrdersQuery,
  useGetOrderDetailsQuery,
  useRetryPaymentMutation,
  useVerifyPaymentMutation,
  useCancelOrderMutation,
} from "../redux/services/orderApi";
import { useAddCartItemMutation } from "../redux/services/cartApi";
import { getSocket } from "../lib/socket";
import { loadRazorpayScript } from "../lib/razorpay";
import { toAssetUrl } from "@/utils/backendUrl";
import toast from "react-hot-toast";

type OrderStatus =
  | "Pending"
  | "Order Placed"
  | "Pending Payment"
  | "Accepted"
  | "Preparing"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

const filters = [
  "All",
  "Pending",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

function formatRupee(value: number) {
  const num = Math.round(Number(value || 0));
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Delivered") {
    return <CheckCircle2 size={17} />;
  }

  if (status === "Accepted") {
    return <CheckCircle2 size={17} />;
  }

  if (status === "Cancelled") {
    return <XCircle size={17} />;
  }

  if (status === "Out for Delivery") {
    return <Truck size={17} />;
  }

  if (status === "Preparing") {
    return <Clock3 size={17} />;
  }

  if (status === "Pending Payment") {
    return <CreditCard size={17} />;
  }

  return <Clock3 size={17} />;
}

function statusClasses(status: string) {
  switch (status) {
    case "Delivered":
      return "bg-green-50 text-green-700 border-green-200";

    case "Accepted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "Cancelled":
      return "bg-red-50 text-red-600 border-red-200";

    case "Out for Delivery":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "Preparing":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Pending Payment":
      return "bg-amber-100 text-amber-900 border-amber-300 font-black";

    case "Pending":
    case "Order Placed":
    default:
      return "bg-amber-50 text-amber-800 border-amber-200";
  }
}

export default function Orders() {
  const user = useSelector(
    (state: { auth: { user: any | null } }) => state.auth.user
  );

  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedChatOrder, setSelectedChatOrder] = useState<any | null>(null);
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<any | null>(null);

  const router = useRouter();
  const [retryPayment] = useRetryPaymentMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [retryingOrderId, setRetryingOrderId] = useState<number | null>(null);
  const [addCartItem] = useAddCartItemMutation();
  const [reorderingOrderId, setReorderingOrderId] = useState<number | null>(null);

  const handleReorder = async (order: any) => {
    if (!order?.items || order.items.length === 0) {
      toast.error("No items found in this order to re-order.");
      return;
    }
    const orderDbId = order.dbId || order.id;
    try {
      setReorderingOrderId(orderDbId);
      toast.loading("Adding items to your cart...", { id: "reorder-cart" });

      let addedCount = 0;
      for (const it of order.items) {
        const prodId = Number(it.productId || it.id);
        const qty = Math.max(1, Number(it.qty || 1));
        if (prodId) {
          try {
            await addCartItem({ productId: prodId, quantity: qty }).unwrap();
            addedCount++;
          } catch (itemErr: any) {
            console.warn(`Could not add product #${prodId} to cart:`, itemErr);
          }
        }
      }

      toast.dismiss("reorder-cart");
      if (addedCount > 0) {
        toast.success(`${addedCount} item${addedCount > 1 ? "s" : ""} added to your cart!`);
        router.push("/cart");
      } else {
        toast.error("Items could not be added (they may be currently unavailable or out of stock).");
      }
    } catch (err: any) {
      toast.dismiss("reorder-cart");
      toast.error(err?.data?.message || err?.message || "Failed to re-order items.");
    } finally {
      setReorderingOrderId(null);
    }
  };

  const handleRetryPayment = async (order: any) => {
    const orderDbId = order.dbId || order.id;
    try {
      setRetryingOrderId(orderDbId);
      toast.loading("Preparing payment gateway...", { id: "retry-pay" });

      // 1. Ensure Razorpay checkout script is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        toast.error("Payment gateway is loading. Please try again in a few seconds.", {
          id: "retry-pay",
        });
        setRetryingOrderId(null);
        return;
      }

      // 2. Request backend to verify stock and generate Razorpay order
      const res = await retryPayment({ orderId: orderDbId }).unwrap();
      const paymentData = res.data;

      toast.dismiss("retry-pay");

      // 3. Open Razorpay modal
      const options = {
        key: paymentData.razorpayKeyId,
        amount: Math.round((Number(paymentData.amount) + Number.EPSILON) * 100),
        currency: paymentData.currency || "INR",
        name: "SFC Bakers",
        description: `Payment for Order #${paymentData.orderNumber || order.id}`,
        order_id: paymentData.razorpayOrderId,
        prefill: {
          name: paymentData.customerName || user?.name || "",
          email: paymentData.customerEmail || user?.email || "",
          contact: paymentData.customerPhone || user?.phone || "",
        },
        notes: {
          order_number: paymentData.orderNumber,
          local_order_id: String(orderDbId),
        },
        theme: {
          color: "#4f7d16",
        },
        handler: async function (response: any) {
          try {
            toast.loading("Verifying payment...", { id: "verify-retry-pay" });
            await verifyPayment({
              orderId: orderDbId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }).unwrap();

            toast.success("Payment successful! The kitchen will prepare your order.", {
              id: "verify-retry-pay",
              duration: 6000,
            });
            refetch();
          } catch (verifyErr: any) {
            console.error("Retry payment verification error:", verifyErr);
            toast.error(
              verifyErr?.data?.message ||
                "Payment received but verification had an issue. Please check orders or contact support.",
              { id: "verify-retry-pay", duration: 8000 }
            );
            refetch();
          } finally {
            setRetryingOrderId(null);
          }
        },
        modal: {
          ondismiss: function () {
            toast.error("Payment window closed. Payment remains pending.");
            setRetryingOrderId(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (failRes: any) {
        toast.error(failRes?.error?.description || "Payment failed. Please try again.");
        setRetryingOrderId(null);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Retry payment error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to initialize payment retry.", {
        id: "retry-pay",
      });
      setRetryingOrderId(null);
    }
  };

  // Capture the pending chat order ID set by notifications page before navigating here
  const [pendingChatOrderId, setPendingChatOrderId] = useState<number | null>(() => {
    if (typeof window !== "undefined" && (window as any).__sfcPendingChatOrderId) {
      const id = (window as any).__sfcPendingChatOrderId;
      (window as any).__sfcPendingChatOrderId = null; // Consume immediately
      return id;
    }
    return null;
  });

  // Fetch the specific order to auto-open chat when coming from a notification
  const { data: pendingOrderData } = useGetOrderDetailsQuery(
    pendingChatOrderId as number,
    { skip: !pendingChatOrderId }
  );

  // Once the pending order arrives, build the chat order object and open the modal
  useEffect(() => {
    if (pendingOrderData?.data && pendingChatOrderId) {
      const o = pendingOrderData.data;
      setSelectedChatOrder({
        id: o.order_number || `SFC-${o.id}`,
        dbId: o.id,
        status: o.status,
      });
      setPendingChatOrderId(null);
    }
  }, [pendingOrderData, pendingChatOrderId]);

  const { data: orderResponse, isLoading, refetch } = useGetOrdersQuery(
    {
      page,
      limit: 6,
      status: activeFilter !== "All" ? activeFilter : undefined,
    },
    {
      skip: !user,
      pollingInterval: 20000,
      refetchOnFocus: true,
    }
  );

  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("Ordered by mistake");
  const [customReason, setCustomReason] = useState("");
  const [cancelOrderMutation, { isLoading: isCancelling }] = useCancelOrderMutation();

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    const finalReason =
      cancelReason === "Other"
        ? customReason.trim() || "Customer requested cancellation"
        : cancelReason;

    const orderDbId = cancellingOrder.dbId || cancellingOrder.id;
    try {
      const res = await cancelOrderMutation({
        orderId: Number(orderDbId),
        cancelReason: finalReason,
      }).unwrap();
      toast.success(res?.message || "Order cancelled successfully!");
      setCancellingOrder(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Could not cancel order");
    }
  };

  // Socket.IO real-time event listeners for customer
  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket(user.id);

    const handleOrderAccepted = (data: any) => {
      toast.success(
        `Your order #${data.orderNumber || data.orderId} has been accepted and is being prepared.`,
        { duration: 6000 }
      );
      refetch();
    };

    const handleOrderRejected = (data: any) => {
      toast.error(
        `Your Order #${data.orderNumber || data.orderId} was declined. Reason: ${data.cancelReason || "Not specified"}`,
        { duration: 8000 }
      );
      refetch();
    };

    const handleOrderStatusUpdated = (data: any) => {
      toast(
        `Order #${data.orderNumber || data.orderId} status updated to: ${data.status}`
      );
      refetch();
    };

    const handleOrderCancelled = (data: any) => {
      toast(
        `Order #${data.orderNumber || data.orderId} was cancelled.`,
        { icon: "❌" }
      );
      refetch();
    };

    const handleNewMessage = (data: any) => {
      if (!selectedChatOrder || String(selectedChatOrder.dbId) !== String(data.orderId)) {
        toast(
          `New message from store on #${data.orderNumber}: "${data.message?.message?.substring(0, 40)}..."`
        );
      }
    };

    socket.on("order_accepted", handleOrderAccepted);
    socket.on("order_rejected", handleOrderRejected);
    socket.on("order_status_updated", handleOrderStatusUpdated);
    socket.on("order_cancelled", handleOrderCancelled);
    socket.on("customer_new_message", handleNewMessage);

    return () => {
      socket.off("order_accepted", handleOrderAccepted);
      socket.off("order_rejected", handleOrderRejected);
      socket.off("order_status_updated", handleOrderStatusUpdated);
      socket.off("order_cancelled", handleOrderCancelled);
      socket.off("customer_new_message", handleNewMessage);
    };
  }, [user?.id, selectedChatOrder, refetch]);

  const rawOrders = orderResponse?.data || [];

  const orders = useMemo(() => {
    return rawOrders.map((o) => {
      const d = new Date(o.created_at);
      let addressJson = o.delivery_address_json;
      if (typeof addressJson === "string") {
        try {
          addressJson = JSON.parse(addressJson);
        } catch {
          addressJson = null;
        }
      }

      let pricingJson = (o as any).pricing_details_json;
      if (typeof pricingJson === "string") {
        try {
          pricingJson = JSON.parse(pricingJson);
        } catch {
          pricingJson = null;
        }
      }

      let paymentDetailsJson = (o as any).payment_details_json;
      if (typeof paymentDetailsJson === "string") {
        try {
          paymentDetailsJson = JSON.parse(paymentDetailsJson);
        } catch {
          paymentDetailsJson = null;
        }
      }

      return {
        id: o.order_number || `SFC-${o.id}`,
        dbId: o.id,
        created_at: o.created_at,
        cancellation: (o as any).cancellation,
        customerName: o.customer_name || addressJson?.receiver_name,
        customerPhone: o.customer_phone || addressJson?.phone_number,
        date: d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        status: o.status as OrderStatus,
        subtotal: Math.round(Number(o.subtotal || 0)),
        deliveryFee: Math.round(Number(o.delivery_fee || 0)),
        discount: Math.round(Number(o.discount || 0)),
        taxAmount: Math.round(Number((o as any).tax_amount || 0)),
        total: Math.round(Number(o.total_amount || 0)),
        pricingJson,
        address: o.shipping_address || (addressJson ? `${addressJson.house_number}, ${addressJson.formatted_address || `${addressJson.city} - ${addressJson.pincode}`}` : "Jaipur, Rajasthan"),
        addressJson,
        payment: o.payment_method || "Cash on Delivery",
        paymentStatus: (o as any).payment_status || "Pending",
        transactionId: (o as any).transaction_id,
        paymentDetailsJson,
        notes: (o as any).notes || "",
        delivered_at: (o as any).delivered_at,
        chatStatus: (o as any).chatStatus || (o as any).chat_status,
        chat_status: (o as any).chat_status || (o as any).chatStatus,
        store_id: (o as any).store_id,
        store_name: (o as any).store_name,
        store_address: (o as any).store_address,
        store_phone: (o as any).store_phone,
        store_owner_phone: (o as any).store_owner_phone,
        store_latitude: (o as any).store_latitude,
        store_longitude: (o as any).store_longitude,
        is_forwarded_to_store: Boolean((o as any).is_forwarded_to_store),
        admin_address: (o as any).admin_address,
        admin_phone: (o as any).admin_phone,
        admin_email: (o as any).admin_email,
        items: (o.items || []).map((it) => ({
          id: it.id,
          productId: Number((it as any).product_id || it.id),
          name: it.product_name,
          qty: it.quantity,
          price: Math.round(Number(it.price || 0)),
          img: it.image || "/images/placeholder.png",
          availability_type: it.availability_type,
          production_status: it.production_status,
        })),
      };
    });
  }, [rawOrders]);

  const activeDetailsOrder = useMemo(() => {
    if (!selectedDetailsOrder) return null;
    const found = orders.find(
      (o: any) => o.dbId === selectedDetailsOrder.dbId || o.id === selectedDetailsOrder.id
    );
    return found || selectedDetailsOrder;
  }, [orders, selectedDetailsOrder]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "All") return orders;
    if (activeFilter === "Pending") {
      return orders.filter(
        (order) =>
          order.status === "Pending" ||
          order.status === "Order Placed" ||
          order.status === "Pending Payment"
      );
    }
    if (activeFilter === "Preparing") {
      return orders.filter(
        (order) => order.status === "Preparing" || order.status === "Accepted"
      );
    }
    return orders.filter((order) => order.status === activeFilter);
  }, [activeFilter, orders]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(
      (o) =>
        o.status === "Pending" ||
        o.status === "Order Placed" ||
        o.status === "Pending Payment"
    ).length;
    const preparing = orders.filter((o) => o.status === "Preparing").length;
    const delivered = orders.filter((o) => o.status === "Delivered").length;
    const cancelled = orders.filter((o) => o.status === "Cancelled").length;
    return { total, pending, preparing, delivered, cancelled };
  }, [orders]);





  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 border border-slate-200  shadow-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary)] flex items-center justify-center">
            <ShoppingBag size={32} />
          </div>
          <h2 className="text-xl font-black text-[var(--color-text-primary)]">
            Sign in to view orders
          </h2>
          <p className="mt-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
            Please log in to track your live orders, past receipts, and order updates.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("sfc_open_login"));
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[var(--color-primary-dark)]"
            >
              Sign In / Register
            </button>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-6 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Browse Menu
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)]">

      <section className="bg-[var(--color-primary-dark)]">
        <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 md:py-12">
          <Link
            href="/profile"
            className="
              mb-6
              inline-flex
              items-center
              gap-2
              text-xs
              font-semibold
              text-white/60
              transition
              hover:text-white
            "
            style={{ color: "white" }}
          >
            <ArrowLeft size={15} />
            Back to Profile
          </Link>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-primary-light)]">
                SFC Bakers
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl text-white">
                My Orders
              </h1>

              <p className="mt-2 max-w-lg text-xs leading-5 text-white/70">
                Track your current order and fresh kitchen preparation in real time.
              </p>
            </div>

            <Link
              href="/menu"
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[var(--color-primary)]
                px-5
                py-3
                text-xs
                font-bold
                text-white
                shadow-lg
                transition
                hover:-translate-y-0.5
                hover:bg-[var(--color-primary-dark)]
              "
              style={{ color: "white" }}
            >
              <ShoppingBag size={16} />
              Order Again
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-7 sm:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">
              Total Orders
            </p>

            <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">
              Pending
            </p>

            <p className="mt-2 text-2xl font-black text-amber-600">
              {stats.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">
              Preparing
            </p>

            <p className="mt-2 text-2xl font-black text-[var(--color-secondary)]">
              {stats.preparing}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">
              Delivered
            </p>

            <p className="mt-2 text-2xl font-black text-[var(--color-primary)]">
              {stats.delivered}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">
              Cancelled
            </p>

            <p className="mt-2 text-2xl font-black text-red-500">
              {stats.cancelled}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
        <div className="
          flex
          gap-2
          overflow-x-auto
          scroll-smooth
          snap-x
          snap-mandatory
          py-3
          scrollbar-x
        ">
          {filters.map((filter) => {
            const active = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setActiveFilter(filter);
                  setPage(1);
                }}
                className={`
                  shrink-0
                  snap-start
                  rounded-full
                  border
                  px-4
                  py-2
                  text-[11px]
                  font-bold
                  transition
                  ${active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm"
                    : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  }
                `}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          ORDERS
      ===================================================== */}

      <section className="mx-auto max-w-6xl px-5 py-6 pb-16 sm:px-8">
        {isLoading ? (
          <SkeletonLoader variant="card" count={3} gridClassName="flex flex-col gap-4" />
        ) : filteredOrders.length === 0 ? (
          <div
            className="
              rounded-[2rem]
              border
              border-[var(--color-border)]
              bg-white
              px-6
              py-16
              text-center
              shadow-sm
            "
          >
            <div
              className="
                mx-auto
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                bg-[var(--color-primary-50)]
                text-[var(--color-primary)]
              "
            >
              <ShoppingBag size={28} />
            </div>

            <h2 className="mt-5 text-lg font-black text-[var(--color-text-primary)]">
              No orders found
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[var(--color-text-muted)]">
              You don't have any orders with this status yet.
            </p>

            <Link
              href="/menu"
              className="
                mt-5
                inline-flex
                rounded-xl
                bg-[var(--color-primary)]
                px-5
                py-3
                text-xs
                font-bold
                text-white
              "
              style={{color: "white"}}
            >
              Explore Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const isPendingPayment =
                (order.status === "Pending Payment" ||
                  (order.payment === "Online Payment" && order.paymentStatus !== "Paid")) &&
                order.status !== "Cancelled";

              return (
                <article
                  key={order.id}
                  className="
                    overflow-hidden
                    rounded-[1.75rem]
                    border
                    border-[var(--color-border)]
                    bg-white
                    shadow-sm
                    transition
                    hover:shadow-md
                  "
                >
                {/* Order top */}

                <div
                  className="
                    flex
                    flex-col
                    gap-4
                    border-b
                    border-[var(--color-border)]
                    p-5
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                    sm:px-6
                  "
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-[var(--color-text-primary)]">
                        #{order.id}
                      </h2>

                      <span
                        className={`
                          inline-flex
                          items-center
                          gap-1
                          rounded-full
                          border
                          px-2.5
                          py-1
                          text-[9px]
                          font-bold
                          ${statusClasses(order.status)}
                        `}
                      >
                        <StatusIcon status={order.status} />
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock3 size={12} />
                        {order.date} · {order.time}
                      </span>

                      <span className="hidden sm:block">•</span>

                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {order.address}
                      </span>

                      <span className="hidden sm:block">•</span>

                      {(() => {
                        const s = String(order.status || "").toLowerCase().trim();
                        const isAccepted = ["accepted", "preparing", "out for delivery", "delivered", "completed"].includes(s);
                        const isForwarded = Boolean(order.is_forwarded_to_store);
                        const storeName = isForwarded
                          ? (order.store_name || "Assigned Branch")
                          : "Main Bakery (Admin)";

                        return isAccepted && isForwarded ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                            <Store size={12} className="text-emerald-600 shrink-0" />
                            <span>Branch: {storeName}</span>
                          </span>
                        ) : isForwarded ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700 border border-blue-200">
                            <Store size={12} className="text-blue-500 shrink-0" />
                            <span>Dispatched to: {storeName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800 border border-amber-200">
                            <Store size={12} className="text-amber-600 shrink-0" />
                            <span>Main Bakery (Admin)</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Order Total
                    </p>

                    <p className="mt-1 text-lg font-black text-[var(--color-text-primary)]">
                      {formatRupee(order.total)}
                    </p>
                  </div>
                </div>

                {/* Products */}

                <div className="p-5 sm:px-6">
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="
                          flex
                          items-center
                          gap-3
                        "
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                          {item.img ? (
                            <Image
                              src={toAssetUrl(item.img)}
                              alt={item.name}
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
                            <p className="truncate text-xs font-bold text-[var(--color-text-primary)]">
                              {item.name}
                            </p>
                     
                          </div>
                          

                          <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                            Qty: {item.qty}
                          </p>
                        </div>

                        <p className="text-xs font-bold text-[var(--color-text-primary)]">
                          {formatRupee(Math.round(item.price * item.qty))}
                        </p>
                      </div>
                    ))}
                  </div>

                 

                  {/* Order Status Notice */}
                  {isPendingPayment && (
                    <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-300 p-3.5 text-xs text-amber-900 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                        <div>
                          <span className="font-black text-amber-950">Payment Incomplete</span>
                          <span className="text-amber-800"> — Your online payment was not completed. Please complete payment so our kitchen can prepare your order.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRetryPayment(order)}
                        disabled={retryingOrderId === order.dbId}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        <CreditCard size={14} />
                        <span>{retryingOrderId === order.dbId ? "Initializing..." : "Pay Now"}</span>
                      </button>
                    </div>
                  )}

                  {!isPendingPayment &&
                    (order.status === "Pending" ||
                      order.status === "Order Placed" ||
                      order.status === "Pending Payment") && (
                      <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900">
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                          </span>
                          <div>
                            <span className="font-bold">Waiting for order confirmation</span>
                            <span className="text-amber-800"> — You can cancel without penalty before kitchen accepts and starts preparing.</span>
                          </div>
                        </div>
                       
                      </div>
                    )}

                  {order.status === "Accepted" && (
                    <div className="mt-3.5 flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-900">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <div>
                        <span className="font-bold">Order accepted by {order.store_name || "store"}!</span>
                        <span className="text-emerald-800"> Your order has been confirmed and queued for preparation.</span>
                      </div>
                    </div>
                  )}

                  {order.status === "Preparing" && (
                    <div className="mt-3.5 flex items-center gap-2.5 rounded-xl bg-blue-50 border border-blue-200 px-3.5 py-2.5 text-xs text-blue-900">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                      </span>
                      <div>
                        <span className="font-bold">Your order is being prepared by {order.store_name || "our kitchen"}.</span>
                        <span className="text-blue-800"> Fresh food is being prepared right now.</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom */}

                  <div
                    className="
                      mt-5
                      flex
                      flex-col
                      gap-4
                      border-t
                      border-[var(--color-border)]
                      pt-4
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-lg
                          bg-[var(--color-primary-50)]
                          text-[var(--color-primary)]
                        "
                      >
                        <Banknote size={15} />
                      </div>

                      <div>
  <div className="flex items-center gap-2">
    <p className="text-[10px] font-bold text-[var(--color-text-primary)]">
      {order.payment === "Online Payment"
        ? "Online Payment"
        : "Cash on Delivery"}
    </p>
    {order.paymentStatus === "Refunded" && (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-700 border border-stone-300">
        Refunded
      </span>
    )}
    {order.paymentStatus === "Partially Refunded" && (
      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-700 border border-purple-200">
        Partially Refunded
      </span>
    )}
  </div>
</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isPendingPayment && (
                        <button
                          type="button"
                          onClick={() => handleRetryPayment(order)}
                          disabled={retryingOrderId === order.dbId}
                          className="
                            inline-flex
                            items-center
                            justify-center
                            gap-1.5
                            rounded-xl
                            bg-emerald-600
                            hover:bg-emerald-700
                            px-4
                            py-2.5
                            text-[10px]
                            font-bold
                            text-white
                            shadow-sm
                            transition
                            disabled:opacity-50
                            cursor-pointer
                          "
                        >
                          <CreditCard size={14} />
                          <span>{retryingOrderId === order.dbId ? "Initializing..." : "Pay Now"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedDetailsOrder(order)}
                        className="
                          inline-flex
                          items-center
                          justify-center
                          gap-1.5
                          rounded-xl
                          border
                          border-[var(--color-border)]
                          bg-white
                          px-4
                          py-2.5
                          text-[10px]
                          font-bold
                          text-[var(--color-text-primary)]
                          transition
                          hover:border-[var(--color-primary)]
                          hover:text-[var(--color-primary)]
                          hover:bg-[var(--color-primary-50)]/40
                        "
                      >
                        <Eye size={14} />
                        View Details
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReorder(order)}
                        disabled={reorderingOrderId === order.dbId}
                        className="
                          inline-flex
                          items-center
                          justify-center
                          gap-1.5
                          rounded-xl
                          bg-[var(--color-primary)]
                          hover:bg-[var(--color-primary-dark)]
                          px-4
                          py-2.5
                          text-[10px]
                          font-bold
                          text-white
                          shadow-sm
                          transition
                          disabled:opacity-50
                          cursor-pointer
                        "
                      >
                        {reorderingOrderId === order.dbId ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Adding to Cart...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw size={13} />
                            <span>Re-order</span>
                          </>
                        )}
                      </button>

                      <Link
                        href="/menu"
                        className="
                          inline-flex
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-[var(--color-border)]
                          px-4
                          py-2.5
                          text-[10px]
                          font-bold
                          text-[var(--color-primary)]
                          transition
                          hover:bg-[var(--color-primary-50)]
                        "
                      >
                        <RotateCcw size={14} />
                        Order Again
                      </Link>
                      {(() => {
                        const isChatExpired =
                          order.chatStatus?.isExpired ??
                          order.chat_status?.is_expired ??
                          ((String(order.status) === "Delivered" ||
                            String(order.status) === "Completed") &&
                            order.delivered_at &&
                            Date.now() >
                              new Date(order.delivered_at).getTime() +
                                20 * 60 * 1000);

                        return (
                          <button
                            type="button"
                            disabled={isChatExpired}
                            onClick={() =>
                              !isChatExpired && setSelectedChatOrder(order)
                            }
                            title={
                              isChatExpired
                                ? "Chat closed 20 minutes after delivery"
                                : "Chat with Store"
                            }
                            className={`
                              inline-flex
                              items-center
                              justify-center
                              gap-2
                              rounded-xl
                              border
                              px-4
                              py-2.5
                              text-[10px]
                              font-bold
                              transition
                              ${
                                isChatExpired
                                  ? "border-stone-300 bg-stone-100 text-stone-400 cursor-not-allowed opacity-60"
                                  : "border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                              }
                            `}
                          >
                            <MessageCircle size={14} />
                            {isChatExpired ? "Chat Closed" : "Chat with Store"}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          </div>
        )}

        <Pagination
          page={orderResponse?.pagination?.page || page}
          totalPages={orderResponse?.pagination?.totalPages || 1}
          total={orderResponse?.pagination?.total || orders.length}
          limit={6}
          onPageChange={(p) => setPage(p)}
          itemLabel="orders"
        />
      </section>

      {selectedChatOrder && (
        <OrderChat
          open={true}
          orderId={selectedChatOrder.dbId}
          dbOrderId={selectedChatOrder.dbId}
          orderNumber={selectedChatOrder.id}
          orderStatus={selectedChatOrder.status}
          deliveredAt={selectedChatOrder.delivered_at}
          chatStatus={selectedChatOrder.chatStatus}
          onClose={() => setSelectedChatOrder(null)}
        />
      )}

      {selectedDetailsOrder && (
        <OrderDetailsModal
          order={activeDetailsOrder}
          onClose={() => setSelectedDetailsOrder(null)}
          onOpenChat={(ord) => {
            setSelectedDetailsOrder(null);
            setSelectedChatOrder(ord);
          }}
          onRetryPayment={handleRetryPayment}
          retryingOrderId={retryingOrderId}
          onReorder={handleReorder}
          isReordering={reorderingOrderId === (activeDetailsOrder?.dbId || activeDetailsOrder?.id)}
        />
      )}

      {/* Cancel Order Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl border border-stone-200">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5 text-red-600">
                <AlertCircle size={22} className="shrink-0" />
                <h3 className="text-base font-black text-stone-900">
                  Cancel Order #{cancellingOrder.id}?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-stone-600">
                Are you sure you want to cancel this order? Since the store has not yet started preparing it, you can cancel with zero penalty.
              </p>

              {cancellingOrder.payment === "Online Payment" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
                  <span className="font-bold">100% Instant Refund: </span>
                  ₹{cancellingOrder.total} will be refunded automatically to your original payment method.
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1.5 uppercase tracking-wider">
                  Reason for Cancellation:
                </label>
                <div className="space-y-1.5 text-xs text-stone-800">
                  {[
                    "Ordered by mistake",
                    "Change delivery address or phone",
                    "Need to modify items or quantities",
                    "Delivery time seems too long",
                    "Other",
                  ].map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-2 rounded-lg border border-stone-100 px-3 py-2 hover:bg-stone-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="cancel_reason_orders_modal"
                        value={r}
                        checked={cancelReason === r}
                        onChange={() => setCancelReason(r)}
                        className="text-[var(--color-primary)] focus:ring-0"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>

                {cancelReason === "Other" && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Please specify your reason..."
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-[var(--color-primary)] focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                disabled={isCancelling}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
