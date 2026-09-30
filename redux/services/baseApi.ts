// @ts-nocheck

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout, setCredentials } from "../features/authSlice";
import { updateSocketToken, disconnectSocket } from "../../lib/socket";
import { getApiUrl } from "@/utils/backendUrl";

class SimpleMutex {
  private _queue: Promise<void> = Promise.resolve();
  private _locked = false;

  isLocked(): boolean {
    return this._locked;
  }

  async acquire(): Promise<() => void> {
    this._locked = true;
    let release: () => void;
    const ticket = new Promise<void>((resolve) => {
      release = resolve;
    });
    const wait = this._queue;
    this._queue = this._queue.then(() => ticket);
    await wait;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this._locked = false;
      release();
    };
  }

  async waitForUnlock(): Promise<void> {
    while (this._locked) {
      await this._queue;
    }
  }
}

const mutex = new SimpleMutex();

const getNormalizedBaseUrl = () => {
  return getApiUrl();
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getNormalizedBaseUrl(),
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as any;
    const accessToken = state?.auth?.accessToken;
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    headers.set("x-client-type", "storefront");
    return headers;
  },
});

const baseQueryWithRefresh = async (args: any, api: any, extraOptions: any) => {
  // Wait if another request is currently refreshing the token
  await mutex.waitForUnlock();
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === "string" ? args : args?.url;
  const isRefreshRequest =
    url === "/auth/refresh-token" || url?.includes("refresh-token");
  const isAuthEndpoint =
    isRefreshRequest ||
    url === "/auth/logout" ||
    url === "/auth/login" ||
    url === "/auth/google" ||
    url === "/auth/register" ||
    url === "/auth/send-otp" ||
    url === "/auth/verify-otp" ||
    url?.includes("/auth/google") ||
    url?.includes("/auth/login");

  if (result.error?.status === 401 && !isAuthEndpoint) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refreshResult = await rawBaseQuery(
          {
            url: "/auth/refresh-token",
            method: "POST",
          },
          api,
          extraOptions
        );

        if (
          !refreshResult.error &&
          (refreshResult.data?.accessToken || refreshResult.data?.token)
        ) {
          const newAccessToken =
            refreshResult.data.accessToken || refreshResult.data.token;

          if (newAccessToken) {
            updateSocketToken(newAccessToken);
          }
          api.dispatch(setCredentials(refreshResult.data));

          // Retry the original query with the new access token
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          // Stop all retries immediately, only logout if there was a verified user
          disconnectSocket();
          const currentState = api.getState() as any;
          if (currentState?.auth?.user || currentState?.auth?.accessToken) {
            api.dispatch(logout());
          }
        }
      } finally {
        release();
      }
    } else {
      // Wait until the active refresh completes
      await mutex.waitForUnlock();
      const state = api.getState() as any;
      if (state?.auth?.accessToken) {
        result = await rawBaseQuery(args, api, extraOptions);
      }
    }
  }

  // If backend explicitly rejected an admin account accessing storefront, clear auth
  if (
    result.error?.status === 403 &&
    (result.error?.data?.isAdminOnStorefront ||
      (typeof result.error?.data?.message === "string" &&
        result.error?.data?.message.toLowerCase().includes("admin accounts cannot")))
  ) {
    disconnectSocket();
    api.dispatch(logout());
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: [
    "Catalog",
    "Cart",
    "User",
    "Wishlist",
    "Settings",
    "Order",
    "Product",
    "Address",
    "Chat",
    "Reviews",
    "Offers",
    "Contact",
    "HeroSliders",
    "WhyChooseUs",
    "Testimonials",
    "Notification",
    "CmsPages",
    "Reels",
  ],
  endpoints: () => ({}),
});
