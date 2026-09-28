"use client";

import { type ReactNode, useEffect } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { store, persistor, RootState } from "../redux/store";
import { setCredentials, logout } from "../redux/features/authSlice";
import { useGetMeQuery } from "../redux/services/authApi";
import { baseApi } from "../redux/services/baseApi";
import { ThemeProvider } from "../context/ThemeContext";
import BlockedAccountScreen from "../components/BlockedAccountScreen";
import StoreStatusListener from "../components/StoreStatusListener";
import { updateSocketToken } from "../lib/socket";

function AuthLoader({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const { data, error, isError, isLoading } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    // Purge any stored admin session immediately from customer storefront
    if (user && user.role === "admin") {
      dispatch(logout());
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (data?.user) {
      if (data.user.role === "admin") {
        dispatch(logout());
        return;
      }
      dispatch(setCredentials(data));
    }
  }, [data, dispatch]);

  useEffect(() => {
    if (accessToken) {
      updateSocketToken(accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    // Only logout if an active authenticated session fails verification with an explicit 401/403.
    // NEVER trigger logout on network disconnection, offline mode, or server cold-starts.
    const isExplicitAuthFailure =
      isError &&
      ((error as any)?.status === 401 || (error as any)?.status === 403);

    const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;

    if (isExplicitAuthFailure && isOnline && !isLoading && (user || accessToken)) {
      dispatch(logout());
    }
  }, [isError, error, isLoading, user, accessToken, dispatch]);

  const isBlocked = Boolean(
    user && (user.is_blocked || user.is_active === false)
  );

  // If customer is blocked, render ONLY the BlockedAccountScreen and deny access to all pages
  if (isBlocked) {
    return <BlockedAccountScreen />;
  }

  return (
    <>
      <StoreStatusListener />
      {children}
    </>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <AuthLoader>{children}</AuthLoader>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
