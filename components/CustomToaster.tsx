"use client";

import { Toaster, ToastBar, toast } from "react-hot-toast";
import { X } from "lucide-react";

export default function CustomToaster() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={10}
      containerStyle={{
        top: 24,
        right: 20,
        zIndex: 999999999,
        pointerEvents: "none",
      }}
      toastOptions={{
        duration: 1500,
        style: {
          pointerEvents: "auto",
          background: "var(--bg-surface, #ffffff)",
          color: "var(--color-text-primary, #1c1917)",
          borderRadius: "18px",
          border: "1px solid var(--color-border, #e7e5e4)",
          boxShadow: "0 12px 36px -4px rgba(0, 0, 0, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.06)",
          padding: "10px 14px",
          fontSize: "13px",
          fontWeight: "600",
          maxWidth: "400px",
          backdropFilter: "blur(12px)",
        },
        success: {
          iconTheme: {
            primary: "var(--color-primary, #4f7d16)",
            secondary: "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "var(--color-error, #ef4444)",
            secondary: "#ffffff",
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t} style={{ ...t.style, padding: 0 }}>
          {({ icon, message }) => (
            <div className="flex items-center gap-2.5 px-3.5 py-2 w-full">
              {icon}
              <div className="flex-1 text-xs sm:text-sm font-semibold leading-snug">
                {message}
              </div>
              {t.type !== "loading" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                  }}
                  className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                  aria-label="Close notification"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
